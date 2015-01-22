var Slide = require('../models/slide');
var slide = new Slide();
var User = require('../models/user');
var user = new User();


exports.setAllTitles = function(req, res) {
            
    slide.setAllTitles(function(response) {res.json(response);});		
};





