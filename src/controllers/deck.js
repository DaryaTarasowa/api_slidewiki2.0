var deck = require('../models/deck');

exports.getTree = function(req, res) {
    var error = [];
    if (parseInt(req.params.rev_id) > 0){
        deck.getTree(req.params.rev_id, {}, function(err, tree) {
            if (err) {
                    console.log({error : err});
                    error.push(err);
                    return;
                }
                if (error.length){
                    tree = {};
                    tree.error = error;
                }
                res.json(tree);
        });
    }else{
        var tree = {};
        tree.error = "rev_id (" + req.params.rev_id +")is not valid!";
        res.json(tree);
    }         		
};

exports.getMetadata = function(req, res){
    var error = [];
    if (parseInt(req.params.rev_id) > 0){
        deck.getMetadata(req.params.rev_id, function (err, metadata) {
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
        deck.getContributors(req.params.rev_id, function(err, contributors) {
            if (err) {
                console.log({error : err});
                error.push(err);
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
        deck.getTags(req.params.rev_id, function(err, tags) {
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

exports.getSlides = function(req, res) {
    var error = [];
    if (parseInt(req.params.rev_id) > 0 && parseInt(req.params.limit) >= 0 && parseInt(req.params.offset) >= 0){
        if (req.params.onlyIDs === 'true' || req.params.onlyIDs === 'false'){
            deck.getSlides(req.params.rev_id, req.params.offset, req.params.limit, req.params.onlyIDs, function(err, slides){
                if (err) {
                    console.log({error : err});
                    error.push(err);
                    return;
                }
                if (error.length){
                    slides = {};
                    slides.error = error;
                }
                res.json(slides);
            });
        }else{
            var slides = {};
        slides.error = "onlyIDs parameter (" + req.params.onlyIDs + "is not valid (should be true or false)";
        res.json(slides);
        } 
    }else{
        var slides = {};
        slides.error = "rev_id (" + req.params.rev_id + ") and/or offset (" + req.params.offset + ") and/or limit (" + req.params.limit + ") is not valid!";
        res.json(slides);
    }
};

exports.translate = deck.translate;




