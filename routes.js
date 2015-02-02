var express = require('express');
var authController = require('./controllers/auth');
var deckController = require('./controllers/deck');
var slideController = require('./controllers/slide');
var userController = require('./controllers/user');
var scriptsController = require('./controllers/scripts');

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
                .get(isLoggedIn, function(req, res){
                    switch (req.params.type){
                        case 'deck' : deckController.translate(req.user.id, req.params.id, req.params.target, function(err, result){
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
        
        router.route('/login')
                .get(function(req, res) {res.render('login.ejs', { message: req.flash('loginMessage') })})
                .post(passport.authenticate('local-login', {
                        successRedirect : '/api/profile', // redirect to the secure profile section
                        failureRedirect : '/api/login', // redirect back to the signup page if there is an error
                        failureFlash : true // allow flash messages
                    })
                );
        router.route('/logout')
                .get(function(req, res) {
                    req.logout();
                    res.redirect('/api/');
                });
                
        router.route('/signup')
                .get(function(req, res) {res.render('signup.ejs', { message: req.flash('signupMessage') });})
                .post(passport.authenticate('local-signup', {
                    successRedirect : '/api/profile', // redirect to the secure profile section
                    failureRedirect : '/api/signup', // redirect back to the signup page if there is an error
                    failureFlash : true // allow flash messages
                })
            );
        router.route('/auth/facebook')
                .get(passport.authenticate('facebook', { scope : 'email' }));
        
        router.route('auth/facebook/callback')
                .get(passport.authenticate('facebook', {
                    successRedirect : '/api/profile',
                    failureRedirect : '/api/'
                }));
        
    
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



