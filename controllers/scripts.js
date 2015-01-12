var Slide = require('../models/slide');
var slide = new Slide();

exports.setAllTitles = function(req, res) {
            
    slide.setAllTitles(function(response) {res.json(response);});		
}


