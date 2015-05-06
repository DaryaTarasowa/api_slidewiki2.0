var user = require('../models/user');



exports.getMetadata = function(req, res) {
    var error = [];
    // if (parseInt(req.params.id) > 0){
    //     var fields = ['id', 'email', 'username', 'password', 'registered', 'default_theme'];
    //     // user.findLocal(fields, {'id' : req.params.id}, function(err, metadata) {
    //     user.findLocal(fields, req.params.id, function(err, metadata) {
    //          if (err) {
    //                 console.log({error : err});
    //                 error.push(err);
    //                 return;
    //             }
    //         if (error.length){
    //                 metadata.error = error;
    //             }
    //             res.json(metadata);
    //     });	
    // }else{
    //     var metadata = {};
    //     metadata.error = "User id (" + req.params.rev_id +")is not valid!";
    //     res.json(metadata);
    // }
        var fields = ['id', 'email', 'username', 'password', 'registered', 'default_theme'];
        user.getUser(fields, {'id' : req.params.id}, function(err, metadata) {
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
                
                    var isMatch = {};
                    isMatch.error = err;
                    res.json(isMatch);
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




