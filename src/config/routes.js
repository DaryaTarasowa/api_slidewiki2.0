var express = require('express');

var deckController = require('../controllers/deck');
var slideController = require('../controllers/slide');
var userController = require('../controllers/user');
var scriptsController = require('../controllers/scripts');
var lib = require('../models/library');

function sendUserback(error, user){
    
}

module.exports = function(app, passport) {

    

    // Create Express router
	var router = express.Router();
        
        router.route('/')
                .get(function(req, res){res.render('index.ejs');});
		
        router.route('/deck/tree/:rev_id')
                .get(deckController.getTree);
        
        router.route('/deck/:rev_id')
                .get(deckController.getMetadata);
        
        router.route('/slide/:rev_id')
                .get(slideController.getMetadata);
        
        router.route('/slide/new')
                .post(slideController.newSlide);
        
        router.route('/slide/update')
                .put(slideController.updateSlide);
        
        router.route('/translate/:target/:type/:id')
        //todo for now is always for user '3'
                .get(function(req, res){
                    switch (req.params.type){
                        case 'deck' : deckController.translate('3', req.params.id, req.params.target, function(err, result){
                                        res.json(result);
                                    });
                                    break;
//                        case 'slide' : slideController.translate(req.user.id, req.params.id, req.params.target, function(err, result){
//                                        res.json(result);
//                                    });
//                                    break;
                    }
                });
        
        router.route('/user/:id')
                .get(userController.getMetadata);
        
        router.route('/content/contributors/deck/:rev_id')
                .get(deckController.getContributors);
        
        router.route('/content/contributors/slide/:rev_id')
                .get(slideController.getContributors);
        
        router.route('/content/tags/deck/:rev_id')
                .get(deckController.getTags);
        
        router.route('/content/tags/slide/:rev_id')
                .get(slideController.getTags);
        
        router.route('/deck/slides/:rev_id/offset/:offset/limit/:limit/:onlyIDs')
                .get(deckController.getSlides);
        
        router.route('/moveItem/:parent/:parent_position/:target/:target_position')
                .get(deckController.moveItem);
        
        router.route('/deleteFrom/:parent/:type/:id')
                .get(deckController.deleteFrom);
        
        router.route('/languages')
                .get(function(req, res){
                        lib.getLanguagesArray(function(err, results){
                            if (err){
                                res.json({error : err});
                            }
                            res.json(results);
                        });
                    });
        
        router.route('/rename/:type/:id/:new_title')
                .get( function(req, res){
                        switch(req.params.type) {
                            case 'deck' : deckController.rename(req.params.id, req.params.new_title, function(err, response){
                                    if (err){
                                        res.json([err]);
                                    }else{
                                        if (response) return res.json(true);
                                        else return res.json(null);
                                    }   
                                });
                                break;
                            case 'slide' : slideController.rename(req.params.id, req.params.new_title, function(err, response){
                                if (err){
                                        res.json([err]);
                                    }else{
                                        if (response) return res.json(true);
                                        else return res.json(null);
                                    } 
                                });
                                break;
                        }
                    });
                    
        router.route('/login')
                
                .post(function(req, res, next) {
                    passport.authenticate('local-login', function(err, user) {
                        if (err) user = {error : [err]};
                        return res.json(user);
                      })
                    (req, res, next);
                  });
        router.route('/logout')
                .get(function(req, res) {
                    req.logout();
                    res.redirect('/api/');
                });
                
        router.route('/signup')
                .get(function(req, res) {res.render('signup.ejs', { message: req.flash('signupMessage') });})
                .post(function(req, res, next) {
                    passport.authenticate('local-signup', function(err, user) {
                        if (err) user = {error : [err]};
                        return res.json(user);
                      })
                    (req, res, next);
                  });            
        router.route('/auth/facebook')
                .get(function(req, res, next){
                    passport.authenticate('facebook', { scope : 'email' })(req, res, next);
        });
        
        router.route('/auth/facebook/callback')
                .get(function(req, res, next){
                    passport.authenticate('facebook', function(err, user){
                        console.log(user);
                        return res.json(user);
                    }) (req, res, next);
                });
                    
        
    
        router.route('/profile')
                .get(isLoggedIn, function(req, res) {res.render('profile.ejs', {user : req.user });});
    
        /////////////Scripts for changing from SlideWiki1.0/////////////////////
        router.route('/scripts/setAllTitles')
                .get(scriptsController.setAllTitles);
        

    
         // Register all our routes with /api
      
	app.use('/api', router);
      
};

    

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on 
    if (req.isAuthenticated())
        return next();

    // if they aren't redirect them to the home page
    res.redirect('/api/');
}



