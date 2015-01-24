var passport = require('passport');
var BasicStrategy = require('passport-http').BasicStrategy;
var user = require('../models/user');


passport.use(new BasicStrategy(
    function(username, password, callback) {
        user.verifyPassword(username, password, function(err, isMatch){
            if (err) { return callback(err); }

            // Password did not match
            if (!isMatch) { return callback(null, false); }

            // Success
            return callback(null, user);
        });
    }
));









exports.isAuthenticated = passport.authenticate(['basic'], { session : false });





