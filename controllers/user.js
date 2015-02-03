var user = require('../models/user');



exports.getMetadata = function(req, res) {
    var error = [];
    if (parseInt(req.params.id) > 0){
        var fields = ['id', 'email', 'picture', 'username', 'password', 'registered'];
        user.findLocal(fields, {'id' : req.params.id}, function(err, metadata) {
             if (err) {
                    console.log({error : err});
                    error.push(err);
                    return;
                }
            if (error.length){
                    metadata.error = error;
                }
                res.json(metadata);
        });	
    }else{
        var metadata = {};
        metadata.error = "User id (" + req.params.rev_id +")is not valid!";
        res.json(metadata);
    }
};

exports.verifyPassword = function(req, res) {
    var error = [];
    if (req.params.username.length > 0){
        user.verifyPassword(req.params.username, req.params.pass, function(err,isMatch) {
             if (err) {
                    console.log({error : err});
                    error.push(err);
                    return;
                }
            if (error.length){
                    res.json(error);
                }
            if (!isMatch){
                res.json('Wrong pass!');
            }else{
                res.json('Authentification succed!');
            }
        });	
    }else{
        var isMatch = {};
        isMatch.error = "User id (" + req.params.rev_id +")is not valid!";
        res.json(isMatch);
    }
};




