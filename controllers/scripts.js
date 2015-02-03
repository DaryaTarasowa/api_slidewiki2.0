var slide = require('../models/slide');



exports.setAllTitles = function(req, res) {
            
    slide.setAllTitles(function(err, response) {
        if (err) res.json({error : err});
        res.json(response);
    });		
};





