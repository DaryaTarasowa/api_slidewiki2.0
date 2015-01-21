var Deck = require('../models/deck');
var deck = new Deck();

exports.getTree = function(req, res) {
    if (parseInt(req.params.rev_id) > 0){
        deck.getTree(req.params.rev_id, {}, function(tree) {res.json(tree);});
    }else{
        res.json({error : "rev_id is not valid!"});
    }         		
};

exports.getMetadata = function(req, res){
    if (parseInt(req.params.rev_id) > 0){
        deck.getMetadata(req.params.rev_id, function (metadata) {res.json(metadata);});
    }else{
        res.json({error : "rev_id is not valid!"});
    }
};

exports.getContributors = function(req, res) {
    if (parseInt(req.params.rev_id) > 0){
        deck.getContributors(req.params.rev_id, function(contributors) {res.json(contributors);});
    }else{
        res.json({error : "rev_id is not valid!"});
    }
};

exports.getTags = function(req, res) {
    if (parseInt(req.params.rev_id) > 0){
        deck.getTags(req.params.rev_id, function(tags) {res.json(tags);});
    }else{
        res.json({error : "rev_id is not valid!"});
    }
};

exports.getSlides = function(req, res) {
    if (parseInt(req.params.rev_id) > 0 && parseInt(req.params.limit) >= 0 && parseInt(req.params.offset) >= 0){
        if (req.params.onlyIDs === 'true' || req.params.onlyIDs === 'false'){
            deck.getSlides(req.params.rev_id, req.params.offset, req.params.limit, req.params.onlyIDs, function(slides){res.json(slides);});
        }else{
            res.json('Error: onlyIDs parameter is not valid (should be true or false)!');
        } 
    }else{
        res.json({error : "rev_id and/or offset and/or limit is not valid!"});
    }
};

exports.getAllSlides = function(req, res){
    deck.getAllSlides(req.params.rev_id, function(response){
        res.json(response);
    })
}




