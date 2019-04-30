var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var fs = require('fs');
var http = require('http');
var crypto = require('crypto');

var hashPass = 'bb16b95f2891c259a779aad7ed5282f499e6fc43e0a2586052232bba4443c6a5';

var mongoose = require('mongoose');
var uri = process.env.MONGODB_URI;
if (!uri) {
	process.exit(0);
}
mongoose.connect(uri);

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

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

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
	var pollCookie = req.cookies.poll;
	var thanks = pollCookie && activePoll && pollCookie == activePoll.name;
	// var ip = req.headers['x-forwarded-for'];
	// if (ip) {
	// 	var list = ip.split(',');
	// 	ip = list[0];
	// } else {
	// 	ip = req.connection.remoteAddress;
	// }
	res.render('index', {
	  	title: 'BetaEta Voting',
	  	poll: activePoll,
	  	thanks: thanks// activePoll.voters.includes(ip)
	});
});

app.post('/vote', (req, res, next) => {
	var votes = req.body.votes.split(',');
	var ip = req.headers['x-forwarded-for'];
	if (ip) {
		var list = ip.split(',');
		ip = list[list.length - 1];
	} else {
		ip = req.connection.remoteAddress;
	}
	// if (!activePoll || activePoll.voters.includes(ip)) {
	// 	res.status(400).send();
	// 	return;
	// }
	for (candidate of votes) {
		activePoll.candidates[candidate] += 1;
	}
	activePoll.voters.push(ip);
	res.append('Set-Cookie', `poll=${activePoll.name}; Path=/; HttpOnly`);
	res.status(200).send();
});

app.get('/admin', auth, (req, res, next) => {
	Poll.find().sort({ 'when': 'desc' }).exec((err, polls) => {
		if (err) {
			res.status(500).send();
			return;
		}
		res.render('admin', {
			title: 'Admin',
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
			activePoll.when = Date();
			activePoll.save();
			activePoll = null;
		}, time * 1000);
		res.status(200).send();
	}
});

app.get('/history', auth, (req, res, next) => {
	Poll.find().sort({ 'when': 'desc' }).exec((err, polls) => {
		if (err) {
			res.render('nohistory', {
				title: 'History'
			});
		} else {
			res.render('history', {
				title: 'History',
				polls: polls
			});
		}
	})
});

app.get('/login', (req, res, next) => {
	res.render('login');
});

var httpServer = http.createServer(app);

httpServer.listen(process.env.PORT);
