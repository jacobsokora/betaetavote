var express = require('express');
var router = express.Router();
var mysql = require('mysql');

var activePoll = "President"

/* GET home page. */
router.get('/', function(req, res, next) {
  var connection = mysql.createConnection({
		host: 'localhost',
		user: 'root',
		password: 'd6f4f0a08e8550d09e99fd89540f8a6509f0a2d219553fe4',
		database: 'voting'
	});
  connection.connect();
  connection.query('select poll.name, candidates.name from poll join candidates on poll.id=candidates.poll where poll.active=true', (results, fields, error) => {
  	if (results) {
  		console.log(results);
  		res.render('index', {
		  	title: 'BetaEta Voting',
		  	poll: results.name,
		  	candidates: results.candidates,
		  	thanks: false
		  });
  	}
  });
  
});

router.get('/vote', function(req, res, next) {
	var connection = mysql.createConnection({
		host: 'localhost',
		user: 'root',
		password: 'd6f4f0a08e8550d09e99fd89540f8a6509f0a2d219553fe4',
		database: 'voting'
	});
	connection.connect();
	connection.query('update candidates set votes=votes + 1 join poll on poll.id=candidates.poll where poll.name=?', [req.query.poll]);
	connection.query('insert into votercache (ip) values (?)', [req.connection.remoteAddress]);
	connection.end();
});

module.exports = router;
