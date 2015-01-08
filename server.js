// Get the packages we need
var express = require('express');
var bodyParser = require('body-parser');
var mysql = require('mysql');
var Deck = require('./models/deck');
var Slide = require('./models/slide');
var Config = require('./config');
var config = new Config();

		
function start(){

	// Create Express application
	var app = express();
	
	// Use bodyParser
	app.use(bodyParser.urlencoded({
		extended: true
	}));

        
	// Use environment defined port or 8080
	var port = config.port;
	
	//connect to mysql
	var connection  = config.connection;
		
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

	
	router.get('/', function(req, res) {
		
		res.json({ message: 'You are running dangerously low on coffee!' });
	});	

	
	router.get('/deck/tree/:rev_id', function(req, res) {
                if (parseInt(req.params.rev_id) > 0){
                    deck.getTree(req.params.rev_id, {}, function(tree) {res.json(tree);});
                }else{
                    res.json('Error: rev_id is not valid!');
                }         		
	});
        
        router.get('/deck/:rev_id', function(req, res) {
            //if (typeof req.params.rev_id  !== 'undefined'){
                if (parseInt(req.params.rev_id) > 0){
                    deck.getMetadata(req.params.rev_id, function (metadata) {res.json(metadata);});
                }else{
                    res.json('Error: rev_id is not valid!');
                }
           // }else{
            //    res.json('Error: rev_id is not set!');
           // }            		
	});
        
        router.get('/slide/:rev_id', function(req, res) {		
            if (parseInt(req.params.rev_id) > 0){
                slide.getMetadata(req.params.rev_id, function(metadata) {res.json(metadata);});	
            }else{
                res.json('Error: rev_id is not valid!');
            }
	});
        
        router.get('/scripts/slide/setAllTitles', function(req, res) {
            
		slide.setAllTitles(function(response) {res.json(response);});		
	});
        
        router.get('/content/contributors/:type/:rev_id', function(req, res) {
            if (parseInt(req.params.rev_id) > 0){
                switch(req.params.type) {
                    case 'deck':
                        deck.getContributors(req.params.rev_id, function(contributors) {res.json(contributors);});
                        break;
                    case 'slide':
                        slide.getContributors(req.params.rev_id, [], function(contributors) {res.json(contributors);});
                        break;
                    default:
                        res.json('Error: type of Content is not valid!');
                }
            }else{
                res.json('Error: rev_id is not valid!');
            }
	});
        
        router.get('/content/tags/:type/:rev_id', function(req, res) {
            if (parseInt(req.params.rev_id) > 0){
                switch(req.params.type) {
                    case 'deck':
                        deck.getTags(req.params.rev_id, function(tags) {res.json(tags);});
                        break;
                    case 'slide':
                        slide.getTags(req.params.rev_id, function(tags) {res.json(tags);});
                        break;
                    default:
                        res.json('Error: type of Content is not valid!');
                } 
            }else{
                res.json('Error: rev_id is not valid!');
            }
	});
        
        router.get('/deck/slides/:rev_id/offset/:offset/limit/:limit/:onlyIDs', function(req, res) {
            if (parseInt(req.params.rev_id) > 0 && parseInt(req.params.limit) >= 0 && parseInt(req.params.offset) >= 0){
                if (req.params.onlyIDs === 'true' || req.params.onlyIDs === 'false'){
                    deck.getSlides(req.params.rev_id, req.params.offset, req.params.limit, req.params.onlyIDs, function(slides){res.json(slides);});
                }else{
                    res.json('Error: onlyIDs parameter is not valid (should be true or false)!');
                } 
            }else{
                res.json('Error: rev_id and/or limit and/or offset is not valid!');
            }
	});
	
	// Register all our routes with /api
	app.use('/api', router);

	// Start the server
	app.listen(port);
	console.log('Insert coffee on port ' + port);
}

exports.start = start;
