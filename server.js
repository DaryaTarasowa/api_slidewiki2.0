// Get the packages we need
var express = require('express');
var bodyParser = require('body-parser');
var session = require('express-session');
var ejs = require('ejs');
var mysql = require('mysql');
var connection = require('./config').connection; //mysql connection
var passport = require('passport');
var flash    = require('connect-flash');
var morgan       = require('morgan');
var cookieParser = require('cookie-parser');




		
function start(){

	// Create Express application
	var app = express();
        
        // Set view engine to ejs
        app.set('view engine', 'ejs');

	
	// Use bodyParser
	app.use(bodyParser.urlencoded({
		extended: true
	}));
        
        // Use express session support since OAuth2orize requires it
        app.use(session({
          secret: 'Super Secret Session Key',
          saveUninitialized: true,
          resave: true
        }));
        
        app.use(morgan('dev')); // log every request to the console
        app.use(cookieParser()); // read cookies (needed for auth)

        
        app.use(passport.initialize());
        app.use(passport.session()); // persistent login sessions
        app.use(flash()); // use connect-flash for flash messages stored in session
	
	var port = require('./config').port;
	
        //mysql connection
	connection.connect(function(err) {
		if (err) {
			console.error('error connecting: ' + err.stack);
			return;
		}

		console.log('connected as id ' + connection.threadId);
	});
        require('./config/passport')(passport); // pass passport for configuration
        require('./routes.js')(app, passport); // load our routes and pass in our app and fully configured passport
        
       
        
      

	// Start the server
	app.listen(port);
	
}

exports.start = start;
