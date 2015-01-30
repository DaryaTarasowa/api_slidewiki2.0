var slide = require('../models/slide');

exports.getMetadata = function(req, res) {		
    if (parseInt(req.params.rev_id) > 0){
        slide.getMetadata(req.params.rev_id, function(metadata) {res.json(metadata);});	
    }else{
        res.json({error : "rev_id is not valid!"});
    }
};

exports.getContributors = function(req, res) {
    if (parseInt(req.params.rev_id) > 0){
                slide.getContributors(req.params.rev_id, [], function(contributors) {res.json(contributors);});
    }else{
        res.json({error : "rev_id is not valid!"});
    }
};

exports.getTags = function(req, res) {
    if (parseInt(req.params.rev_id) > 0){
        slide.getTags(req.params.rev_id, function(tags) {res.json(tags);});
    }else{
        res.json({error : "rev_id is not valid!"});
    }
};

exports.newSlide = function(req, res){
    slide.new(req.body, function(err, new_slide){res.json(new_slide)});
};

exports.updateSlide = function(req, res){
    slide.update(req.body, function(err, new_slide){res.json(new_slide)});
};

exports.translate = slide.translate;


