var slide = require('../models/slide');



exports.setAllTitles = function(req, res) {
            
    slide.setAllTitles(function(response) {res.json(response);});		
};





