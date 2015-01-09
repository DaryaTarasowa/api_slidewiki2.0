// Get the packages we need
var express = require('express');
var bodyParser = require('body-parser');
var mysql = require('mysql');
var passport = require('passport');
var Deck = require('./models/deck');
var Slide = require('./models/slide');
var User = require('./models/user');
var authController = require('./controllers/auth');
var deckController = require('./controllers/deck');
var connection = require('./config').connection;

		
function start(){

	// Create Express application
	var app = express();
	
	// Use bodyParser
	app.use(bodyParser.urlencoded({
		extended: true
	}));
        
        app.use(passport.initialize());
	
	var port = require('./config').port;
	
	connection.connect(function(err) {
		if (err) {
			console.error('error connecting: ' + err.stack);
			return;
		}

		console.log('connected as id ' + connection.threadId);
	});
        var deck = new Deck();
        var slide = new Slide();
        var user = new User();

	// Create Express router
	var router = express.Router();

	
		
	router.route('/deck/tree/:rev_id')
            .get(deckController.getTree);
        
        router.get('/deck/:rev_id', function(req, res) {
            if (parseInt(req.params.rev_id) > 0){
                deck.getMetadata(req.params.rev_id, function (metadata) {res.json(metadata);});
            }else{
                res.json({error : "rev_id is not valid!"});
            }       		
	});
        
        router.get('/slide/:rev_id', function(req, res) {		
            if (parseInt(req.params.rev_id) > 0){
                slide.getMetadata(req.params.rev_id, function(metadata) {res.json(metadata);});	
            }else{
                res.json({error : "rev_id is not valid!"});
            }
	});
        
        router.get('/user/:id', function(req, res) {		
            if (parseInt(req.params.id) > 0){
                user.getMetadata(req.params.id, function(metadata) {res.json(metadata);});	
            }else{
                res.json({error : "id is not valid!"});
            }
	});
        
        router.get('/user/login/:username/:pass', function(req, res) {		
            if (req.params.username.length > 0){
                user.verifyPassword(req.params.username, req.params.pass, function(error,isMatch) {
                    if (error){
                        res.json({error : error});
                    }else{
                        if (!isMatch){
                            res.json('Wrong pass!');
                        }else{
                            res.json('Authentification succed!');
                        }
                    }                
                });	
            }else{
                res.json({error : "id is not valid!"});
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
                        res.json({error : "content type is not valid!"});
                }
            }else{
                res.json({error : "rev_id is not valid!"});
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
                        res.json({error : "content type is not valid!"});
                } 
            }else{
                res.json({error : "rev_id is not valid!"});
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
                res.json({error : "rev_id and/or offset and/or limit is not valid!"});
            }
	});
	
	// Register all our routes with /api
	app.use('/api', router);

	// Start the server
	app.listen(port);
	
}

exports.start = start;
