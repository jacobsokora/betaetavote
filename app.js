var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var fs = require('fs');
var http = require('http');
var https = require('https');
var crypto = require('crypto');

var certificate = fs.readFileSync('/etc/letsencrypt/live/vote.betaeta.info/cert.pem', 'utf-8');
var privateKey = fs.readFileSync('/etc/letsencrypt/live/vote.betaeta.info/privkey.pem', 'utf-8');
var chain = fs.readFileSync('/etc/letsencrypt/live/vote.betaeta.info/chain.pem', 'utf-8');

var credentials = {
	key: privateKey,
	cert: certificate,
	ca: chain
};

var hashPass = '78cf15d8354d0b4ca5db49840234ffe733423e63e48876f590ade907dd7b5128';

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/betaeta');

var pollSchema = new mongoose.Schema({
	name: String,
	candidates: {},
	voters: [String],
	winners: Number,
	when: { type: Date, default: new Date() }
});

var Poll = mongoose.model('Poll', pollSchema);

const readline = require('readline');

var app = express();

var activePoll = null

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
	if (!req.secure) {
		var secureUrl = `https://${req.headers['host']}${req.url}`;
		res.writeHead(301, { 'Location': secureUrl });
		res.end();
	}
	next();
});

var auth = (req, res, next) => {
	if (req.cookies.password) {
		var hash = crypto.createHash('sha256').update(req.cookies.password).digest('hex');
		if (hash == hashPass) {
			next();
			return
		}
	}
	res.redirect(`/login?ref=${req.url}`);
};

app.get('/', (req, res, next) => {
	if (!activePoll) {
		res.render('nopoll', {
			title: 'BetaEta Voting'
		});
		return;
	}
	res.render('index', {
	  	title: 'BetaEta Voting',
	  	poll: activePoll,
	  	thanks: activePoll.voters.includes(req.connection.remoteAddress)
	});
});

app.post('/vote', (req, res, next) => {
	var votes = req.body.votes.split(',');
	if (!activePoll || activePoll.voters.includes(req.connection.remoteAddress)) {
		res.status(400).send();
		return;
	}
	for (candidate of votes) {
		activePoll.candidates[candidate] += 1;
	}
	activePoll.voters.push(req.connection.remoteAddress);
	res.status(200).send();
});

app.get('/admin', auth, (req, res, next) => {
	Poll.find().sort({ 'when': 'desc' }).exec((err, polls) => {
		if (err) {
			res.status(500).send();
			return;
		}
		res.render('admin', {
			polls: polls
		});
	});
});

app.post('/admin', auth, (req, res, next) => {
	var name = req.body.name;
	var winners = req.body.winners;
	var candidates = req.body['candidates[]'];
	var time = req.body.time || 30;
	if (!name || !winners || !candidates || candidates.length < 2) {
		res.status(400).send();
	} else if (activePoll != null) {
		res.status(500).send('Poll is already started');
	} else {
		var pollCandidates = {};
		for (candidate of candidates) {
			pollCandidates[candidate] = 0;
		}
		activePoll = new Poll({
			name: name,
			winners: winners,
			voters: [],
			candidates: pollCandidates
		});
		setTimeout(() => {
			activePoll.save();
			activePoll = null;
		}, time * 1000);
		res.status(200).send();
	}
});

app.get('/history', auth, (req, res, next) => {
	Poll.find().sort({ 'when': 'desc' }).exec((err, polls) => {
		if (err) {
			res.render('nohistory');
		} else {
			res.render('history', {
				polls: polls
			});
		}
	})
});

app.get('/login', (req, res, next) => {
	res.render('login');
});

var httpServer = http.createServer(app);
var httpsServer = https.createServer(credentials, app);

httpServer.listen(80);
httpsServer.listen(443);
