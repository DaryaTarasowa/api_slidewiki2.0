var passport = require('passport');
var BasicStrategy = require('passport-http').BasicStrategy;
var User = require('../models/user');


passport.use(new BasicStrategy(
    function(username, password, callback) {
        var user = new User();
        user.verifyPassword(username, password, function(err, isMatch) {
            if (err) { return callback(err); }

            // Password did not match
            if (!isMatch) { return callback(null, false); }

            // Success                              
            user.getID(username, function(id){
                if (id.error){
                    return callback(id.error);
                };
                user.getMetadata(id, function(metadata){
                    return callback(null, metadata);
                });
            });                                
                               
        });    
    }
));

exports.isAuthenticated = passport.authenticate('basic', { session : false });



