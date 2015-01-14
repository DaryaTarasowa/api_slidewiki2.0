var Slide = require('../models/slide');
var slide = new Slide();
var User = require('../models/user');
var user = new User();
var convertion = require('../models/convertion');

exports.setAllTitles = function(req, res) {
            
    slide.setAllTitles(function(response) {res.json(response);});		
};

exports.convert = function(req, res) {
    convertion.convertUsers(function(response) {res.json(response);});
};




