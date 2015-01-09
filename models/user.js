var mysql = require('mysql');
var crypto = require('crypto');
var salt = 'slidewikisalt';
var connection = require('../config').connection;

function User(){
    
    this.getMetadata = function(id, callback){
        var sql = "SELECT id, username, registered, picture FROM ?? WHERE ?? = ? LIMIT 1";
        var inserts = ['users', 'id', id];
        sql = mysql.format(sql, inserts);
        
        connection.query(sql, function(err, results) {
            if (err) callback({error : err});
            
            if (results.length){
                callback(results[0]);
            }else{
                callback({error : 'User not found!'});
            }                   
        });
    };
    
    this.verifyPassword = function(username, password, callback) {
        var sql = "SELECT password FROM ?? WHERE ?? = ? LIMIT 1";
        var inserts = ['users', 'username', username];
        sql = mysql.format(sql, inserts);
        
        connection.query(sql, function(err, results) {
            if (err) callback(err);
            
            if (results.length){
                var password_db = results[0].password;
                var hash = crypto.createHash('md5').update(password + salt).digest('hex');
                if (password_db === hash){
                    callback(null, true);
                }else{
                    callback(null, false);
                }
            }else{
                callback('Username not found!');
            }                   
        });        
        
    };
    
    this.getID = function(username, callback){
        var sql = "SELECT id FROM ?? WHERE ?? = ? LIMIT 1";
        var inserts = ['users', 'username', username];
        sql = mysql.format(sql, inserts);
        
        connection.query(sql, function(err, results) {
            if (err) callback({error : err});
            
            if (results.length){
                callback(results[0].id);
            }else{
                callback({error : 'User not found!'});
            }
        });
    };
    
}


module.exports = User;