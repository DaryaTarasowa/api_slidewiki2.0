var slide = require('../models/slide');

exports.getMetadata = function(req, res) {
    var error = [];
    if (parseInt(req.params.rev_id) > 0){
        slide.getMetadata(req.params.rev_id, function(err, metadata) {
            if (err) {
                console.log({error : err});
                error.push(err);
                return;
            }
            if (error.length){
                metadata = {};
                metadata.error = error;
            }
            res.json(metadata);
        });	
    }else{
        var metadata = {};
        metadata.error = "rev_id (" + req.params.rev_id +")is not valid!";
        res.json(metadata);
    }
};

exports.getContributors = function(req, res) {
    var error = [];
    if (parseInt(req.params.rev_id) > 0){
                slide.getContributors(req.params.rev_id, [], function(err, contributors) {
                    if (err) {
                        console.log({error : err});
                        error.push(err);
                        return;
                    }
                    if (error.length){
                        contributors = {};
                        contributors.error = error;
                    }
                    res.json(contributors);
                });
    }else{
        var contributors = {};
        contributors.error = "rev_id (" + req.params.rev_id +")is not valid!";
        res.json(contributors);
    }
};

exports.getTags = function(req, res) {
    var error = [];
    if (parseInt(req.params.rev_id) > 0){
        slide.getTags(req.params.rev_id, function(err, tags) {
           if (err) {
                        console.log({error : err});
                        error.push(err);
                        return;
                    }
                    if (error.length){
                        tags = {};
                        tags.error = error;
                    }
                    res.json(tags);
        });
    }else{
        var tags = {};
        tags.error = "rev_id (" + req.params.rev_id +")is not valid!";
        res.json(tags);
    }
};

exports.newSlide = function(req, res){
    var error = [];
    slide.new(req.body, function(err, new_slide){
        if (err) {
                    console.log({error : err});
                    error.push(err);
                    return;
                }
                
        slide.addToDeck(req.body.parent_deck_id, new_slide.id, req.body.position, function(err, result){
            if (err) {
                    console.log({error : err});
                    error.push(err);
                    return;
                }
            if (error.length){
                    result.error = error;
                }
                res.json(result);
        });
    });
};

exports.updateSlide = function(req, res){
    var error = [];
    slide.update(req.body, function(err, new_slide){
        if (err) {
                    console.log({error : err});
                    error.push(err);
                    return;
                }
            if (error.length){
                    new_slide.error = error;
                }
                res.json(new_slide);
    });
};

exports.translate = slide.translate;


