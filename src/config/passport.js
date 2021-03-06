// load all the things we need
var LocalStrategy   = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;

// load up the user model
var user            = require('../models/user');

var configAuth = require('./auth');

// expose this function to our app using module.exports
module.exports = function(passport) {

    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
        user.findById(id, function(err, user) {
            done(err, user);
        });
    });

    // =========================================================================
    // LOCAL SIGNUP ============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use('local-signup', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'username',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function(req, username, password, done) {

        // asynchronous
        // User.findOne wont fire unless data is sent back
        process.nextTick(function() {

            // find a user whose usernME is the same as the forms email
            // we are checking to see if the user trying to login already exists
            var error = {};
            var fields = ['id'];
            user.findLocal(fields, {'username' : username}, function(err, sign_user) {
                
                // check to see if theres already a user with that email
                if (sign_user) {
                        error.body = 'Username is already in use';
                        error.code = 'WRONG_USERNAME';
                        return done(error.code);
                    
                } else {

                    user.findLocal(fields, {'email' : req.body.email}, function(err, sign_user) {
                
                // check to see if theres already a user with that email
                        if (sign_user) {
                                error.body = 'Email is already in use';
                                error.code = 'WRONG_EMAIL';
                                return done(error.code);
                            
                        } else {

                            // if there is no user with that email
                            // create the user
                            var newUser            = {};

                            // set the user's local credentials
                            newUser.username    = username;
                            newUser.password = user.generateHash(password);
                            newUser.email = req.body.email;
                            if (req.body.fb_id) {

                                user.saveLocalwithFB(newUser, {fb_id: req.body.fb_id}, function(err, signedUser) {
                                    console.log("Saving user " + newUser.username)
                                    if (err) {
                                        error.body = err;
                                        error.code = 'INTERNAL';
                                        return done(error.code);
                                    }
                                    return done(null, signedUser);
                                });
                            }
                            // save the user
                            else {
                            user.saveLocal(newUser, function(err, signedUser) {
                                if (err) {
                                    error.body = err;
                                    error.code = 'INTERNAL';
                                    return done(error.code);
                                }
                                    return done(null, signedUser);
                                });
                            }
                        }
                    });
                }

            });    

        });

    }));
    
    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use('local-login', new LocalStrategy({
        // by default, local strategy uses username and password, we will override with email
        usernameField : 'username',
        passwordField : 'password',
        passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function(req, username, password, done) { // callback with username and password from our form
//
        // find a user whose username is the same as the forms username
        // we are checking to see if the user trying to login already exists
        var fields = ['id'];
        var error = {};
        user.findLocal(fields, {'username' : username}, function(err, local_user) {
                // if there are any errors, return the error
                if (err){
                    error.code = 'NO_USER';
                    return done(error.code, {});
                }
                // check to see if theres already a user with that email
                if (!local_user){
                    error.body = 'No user found';
                    error.code = 'NO_USER';
                    return done(error.code, {});
                }
                user.find(fields, {'local_id' : local_user.id}, function(err, user_final){
                    if (err){
                        error.body = err;
                        error.code = 'INTERNAL';
                        return done(error.code, {});
                    }
                    
                    user.verifyPassword(username, password, function(err, isMatch){
                        if (err) {
                            error.body = err;
                            error.code = 'INTERNAL';
                            return done(error.code, {});
                        }
                    
                        if (!isMatch){
                            error.body = 'Password mismatch';
                            error.code = 'WRONG_PASS';
                            return done(error.code, {});
                        }
                        // all is well, return successful user
                        
                        user.enrich(user_final.id, function(err, enriched){
                            if (err) {
                                error.body = err;
                                error.code = 'INTERNAL';
                                return done(error.code, {});
                            }
                            return done(null, enriched);
                        });
                        
                    });  
                })
                
                                 
            });
        
     }));
     
     
    passport.use(new FacebookStrategy({

        // pull in our app id and secret from our auth.js file
        clientID        : configAuth.facebookAuth.clientID,
        clientSecret    : configAuth.facebookAuth.clientSecret,
        callbackURL     : configAuth.facebookAuth.callbackURL

    },

    // facebook will send back the token and profile
    function(token, refreshToken, profile, done) {

        // asynchronous
        process.nextTick(function() {

            // find the user in the database based on their facebook id
            var fields = ['id', 'email', 'name'];
            user.findFB(fields, { 'id' : profile.id }, function(err, fb_user) {

                // if there is an error, stop everything and return that
                // ie an error connecting to the database
                // if (err)
                //     return done(err);

                // if the user is found, then log them in
                if (fb_user) {
                    console.log(fb_user);
                    fb_user.fb_id = fb_user.id;
                    user.find('local_id', { 'fb_id' : fb_user.fb_id }, function(err, fb_user_found) {
                    
                    user.enrichFromFB(fb_user, function(err, enriched) {
                        if (fb_user_found){
                            console.log(fb_user);
                            enriched.flag = 'true';
                            user.findLocal(fields, {'id' : fb_user_found.local_id}, function(err, sign_user){
                                if (err) return done(err);
                                
                                sign_user.name = sign_user.username;
                                sign_user.fb_id = fb_user.fb_id;
                                sign_user.flag = enriched.flag;
                                return done(err, sign_user);
                            });
                        }
                        else {return done(err, enriched);}
                    });
                });
                    
                } 
                else {
                    // if there is no user found with that facebook id, create them
                    var fb_user = {};

                    // set all of the facebook information in our user model
                    fb_user.id    = profile.id; // set the users facebook id                   
                    fb_user.token = token; // we will save the token that facebook provides to the user                    
                    fb_user.name  = profile.name.givenName + ' ' + profile.name.familyName; // look at the passport user profile to see how names are returned
                    fb_user.email = profile.emails[0].value; // facebook can return multiple emails so we'll take the first

                    // save our user to the database
                    user.saveFB(fb_user, function(err, savedUser) {
                        if (err)
                            throw err;

                        // if successful, return the new user
                        return done(null, savedUser);
                    });
                }

            });
        });

    }));



};

