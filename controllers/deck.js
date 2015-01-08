var Deck = require('../models/deck');
var connection = require('../config').connection;
var deck = new Deck();

exports.getTree = function(req, res) {
    if (parseInt(req.params.rev_id) > 0){
        deck.getTree(req.params.rev_id, {}, function(tree) {res.json(tree);});
    }else{
        res.json({error : "rev_id is not valid!"});
    }         		
};


