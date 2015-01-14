var User = require('../models/user');
var user = new User();
var Muser = require('../models/muser');


exports.getMetadata = function(req, res) {		
    if (parseInt(req.params.id) > 0){
        user.getMetadata(req.params.id, function(metadata) {res.json(metadata);});	
    }else{
        res.json({error : "id is not valid!"});
    }
};

exports.verifyPassword = function(req, res) {		
    if (req.params.username.length > 0){
        user.verifyPassword(req.params.username, req.params.pass, function(error,isMatch) {
            if (error){
                res.json({error : error});
            }else{
                if (!isMatch){
                    res.json('Wrong pass!');
                }else{
                    res.json('Authentification succed!');
                }
            }                
        });	
    }else{
        res.json({error : "id is not valid!"});
    }
};




