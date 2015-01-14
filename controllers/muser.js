
var Muser = require('../models/muser');

exports.getMetadata = function(req, res) {		
    if (parseInt(req.params.id) > 0){
        var query = Muser.findOne({ sql_id : req.params.id});
        query.select('avatar username registered');
    
        query.exec(function (err, user) {
            if (err) return handleError(err);
            res.json(user);
        });	
    }else{
        res.json({error : "id is not valid!"});
    }
};

// Create endpoint /api/users for GET
exports.getUsers = function(req, res) {
    Muser.find(function(err, users) {
        if (err)
            res.send(err);

        res.json(users);
    });
};

exports.postUsers = function(req, res) {
    var user = new Muser({
        username: req.body.username,
        password: req.body.password,
        email: req.body.email,
        avatar: req.body.avatar,
        description: req.body.description
    });

    user.save(function(err) {
        if (err)
            res.send(err);

        res.json({ message: 'New user added' });
    });
};



