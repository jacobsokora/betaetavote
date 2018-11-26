var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

const readline = require('readline');

var app = express();

var fs = require('fs');

var polls = null;
loadPolls();

var activePoll = null
var activeVote = null

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res, next) {
	if (!activePoll) {
		res.render('nopoll', {
			title: 'BetaEta Voting'
		});
		return;
	}
	res.render('index', {
	  	title: 'BetaEta Voting',
	  	poll: activePoll,
	  	candidates: Object.keys(polls[activePoll].candidates),
	  	winners: polls[activePoll].winners,
	  	thanks: polls[activePoll].voters.includes(req.connection.remoteAddress)
	  });
});

app.get('/vote', function(req, res, next) {
	if (!activePoll) {
		res.status(400).send();
		return;
	}
	if (polls[activePoll].voters.includes(req.connection.remoteAddress)) {
		res.status(500).send();
		return;
	}
	polls[activePoll].voters.push(req.connection.remoteAddress);
	polls[activePoll].candidates[req.query.candidate1] += 1
	if (req.query.candidate2) {
		polls[activePoll].candidates[req.query.candidate2] += 1
	}
	fs.writeFileSync(path.join(__dirname, 'routes/polls.json'), JSON.stringify(polls, null, 2));
	res.redirect('/');
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

rl.on('line', (input) => {
	var parts = input.split(' ');
	var poll = parts[1];
	if (parts[0] == 'help') {
		console.log('info <poll>');
		console.log('create <poll> <winners>');
		console.log('reload');
		console.log('add <poll> <name>');
		console.log('remove <poll> <name>');
		console.log('end');
		console.log('start <poll> [time (seconds)]');
	} else if (parts[0] == 'info') {
		pollInfo();
	} else if (parts[0] == 'create' && parts.length >= 3) {
		polls[poll] = {
			candidates: {},
			voters: [],
			winners: parseInt(parts[2], 1)
		};
	} else if (parts[0] == 'reload') {
		loadPolls();
		activePoll == null;
	} else if (parts[0] == 'add' && parts.length >= 3) {
		polls[poll].candidates[parts.slice(2).join(" ")] = 0;
	} else if (parts[0] == 'remove' && parts.length >= 3) {
		delete polls[poll].candidates[parts.slice(2).join(" ")];
	} else if (parts[0] == 'end') {
		clearTimeout(activeVote);
		closeVoting();
	} else if (parts[0] == 'start' && parts.length >= 2) {
		if (!polls[poll]) {
			console.log('Invalid poll!');
			return;
		}
		activePoll = poll;
		activeVote = setTimeout(closeVoting, (parseInt(parts[2], 30) * 1000) || 30000);
	} else {
		console.log('Invalid command, type `help` for a list of commands');
	}
	fs.writeFileSync(path.join(__dirname, 'routes/polls.json'), JSON.stringify(polls, null, 2));
});

function loadPolls() {
	if (!fs.existsSync(path.join(__dirname, 'routes/polls.json'))) {
		fs.writeFileSync(path.join(__dirname, 'routes/polls.json'), JSON.stringify({
			Test: {
				candidates: {
					"Option 1": 0,
					"Option 2": 0
				},
				voters: [],
				winners: 1
			}
		}));
	}
	polls = JSON.parse(fs.readFileSync(path.join(__dirname, 'routes/polls.json')));
	pollInfo();
}

function pollInfo() {
	console.log('Avaialable elections: ')
	Object.keys(polls).forEach((item) => {
		console.log(`${item}: ${Object.keys(polls[item].candidates).join(', ')}`)
	});
}

function closeVoting() {
	if (!activePoll) {
		return;
	}
	var candidates = polls[activePoll].candidates;
	var totalVotes = polls[activePoll].voters.length;
	var winners = polls[activePoll].winners;
	var max = 0;
	var runner = 0;
	var maxCandidates = [];
	var runnerCandidates = [];

	var people = Object.keys(candidates);
	for (var i = 0; i < people.length; i++) {
		var votes = candidates[people[i]];
		if (votes > max) {
			max = votes;
			maxCandidates = [people[i]];
		} else if (votes == max) {
			maxCandidates.push(people[i]);
		} else if (votes > runner) {
			runner = votes;
			runnerCandidates = [people[i]];
		} else if (votes == runner) {
			runnerCandidates.push(people[i]);
		}
	}
	if (max < totalVotes / 2) {
		var newCandidates = {}
		for (let candidate of maxCandidates) {
			newCandidates[candidate] = 0;
		}
		if (maxCandidates.length <= winners) { 
			for (let candidate of runnerCandidates) {
				newCandidates[candidate] = 0;
			}
		}
		console.log(`${maxCandidates.join(', ')} had ${max} votes`);
		console.log(`${runnerCandidates.join(', ')} had ${runner} votes`);
		console.log(`Adding resultion poll for ${Object.keys(newCandidates).join(', ')}`);
		polls[activePoll]  = {
			candidates: newCandidates,
			voters: [],
			winners: winners
		};
		return;
	}
	if (maxCandidates.length < winners) {
		console.log(`${maxCandidates.join(', ')} won, but there aren't enough to satisfy requirements, adding ${runnerCandidates.join(', ')} to satisfy`);
		maxCandidates.concat(runnerCandidates);
	}
	if (maxCandidates.length > winners) {
		console.log(`${maxCandidates.join(', ')} is too many candidates, second vote to narrow!`);
		var newCandidates = {};
		for (let candidate of maxCandidates) {
			newCandidates[candidate] = 0;
		}
		polls[activePoll] = {
			candidates: newCandidates,
			voters: [],
			winners: winners
		};
	} else {
		console.log(`${maxCandidates.join(', ')} wins ${activePoll}!`);
	}
	activePoll = null
}

module.exports = app;
