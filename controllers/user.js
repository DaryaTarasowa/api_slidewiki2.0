var user = require('../models/user');



exports.getMetadata = function(req, res) {		
    if (parseInt(req.params.id) > 0){
        var fields = ['id', 'email', 'picture', 'username', 'password', 'registered'];
        user.findLocal(fields, {'id' : req.params.id}, function(err, metadata) {res.json(metadata);});	
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




