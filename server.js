// Get the packages we need
var express = require('express');
var bodyParser = require('body-parser');
var mysql = require('mysql');
var Deck = require('./models/deck');
var Slide = require('./models/slide');
		

		
function start(){

	// Create Express application
	var app = express();
	
	// Use bodyParser
	app.use(bodyParser.urlencoded({
		extended: true
	}));


	// Use environment defined port or 8080
	var port = process.env.PORT || 8080;
	
	//connect to mysql
	var connection  = mysql.createConnection({
		host            : 'localhost',
		database        : 'slidewiki',
		user            : 'slidewiki',
		password        : 'sw123'
	});
		
	connection.connect(function(err) {
		if (err) {
			console.error('error connecting: ' + err.stack);
			return;
		}

		console.log('connected as id ' + connection.threadId);
	});
        var deck = new Deck(connection);
        var slide = new Slide(connection);

	// Create Express router
	var router = express.Router();

	// Initial dummy route for testing
	// http://localhost:3500/api
	router.get('/', function(req, res) {
		
		res.json({ message: 'You are running dangerously low on coffee!' });
	});
	
	//var deckRoute = router.route('/deck/tree/:rev_id');

	// Create endpoint /api/deck 
	router.get('/deck/tree/:rev_id', function(req, res) {
		
		deck.getTree(req.params.rev_id, {}, function(tree) {res.json(tree);});		
	});
        
        router.get('/deck/:rev_id', function(req, res) {
		
		deck.getMetadata(req.params.rev_id, function (metadata) {res.json(metadata);});		
	});
        
        router.get('/slide/:rev_id', function(req, res) {		
		
		slide.getMetadata(req.params.rev_id, function(metadata) {res.json(metadata);});		
	});
        
        router.get('/scripts/slide/setAllTitles', function(req, res) {
            
		slide.setAllTitles(function(response) {res.json(response);});		
	});
        
        router.get('/content/contributors/:type/:rev_id', function(req, res) {
            
            switch(req.params.type) {
                case 'deck':
                    //deck.getContributors(req.params.rev_id, [], function(contributors) {res.json(contributors);})
                    break;
                case 'slide':
                    slide.getContributors(req.params.rev_id, [], function(contributors) {res.json(contributors);})
                    break;
                default:
                    res.json('Error: type of Content is not defined!');
            } 				
	});
	
	// Register all our routes with /api
	app.use('/api', router);

	// Start the server
	app.listen(port);
	console.log('Insert coffee on port ' + port);
}

exports.start = start;
