var slide = require('../models/slide');



exports.setAllTitles = function(req, res) {
    var error = [];        
    slide.setAllTitles(function(err, response) {
        if (err) {
            console.log({error : err});
            error.push(err);
            return;
        }
        if (error.length){
            response = {};
            response.error = error;
        }
        res.json(response);
    });		
};





