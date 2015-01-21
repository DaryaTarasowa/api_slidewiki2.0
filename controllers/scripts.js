var Slide = require('../models/slide');
var slide = new Slide();
var User = require('../models/user');
var user = new User();
var convertion = require('../models/convertion');
var async = require('async');

exports.setAllTitles = function(req, res) {
            
    slide.setAllTitles(function(response) {res.json(response);});		
};

exports.convert = function(req, res) {
    convertion.convertUsers(function(response1) {
        convertion.convertDecks(function(response2){
            convertion.convertSlides(function(response3){
                res.json(response1 + ' ' + response2 + ' ' + response3);
            });
        });            
        
    });
//convertion.convertSlides(function(response){
//    res.json(response);
//})
      
};




