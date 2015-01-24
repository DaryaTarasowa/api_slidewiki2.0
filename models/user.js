var mysql = require('mysql');
var crypto = require('crypto');
var salt = 'slidewikisalt';
var connection = require('../config').connection;
var async  = require('async');

    function enrichFromLocal(user, callback){
        var sql = 'SELECT * FROM ?? WHERE id = ? LIMIT 1';
        var inserts = ['local_users', user.local_id];
        var sql = mysql.format(sql, inserts);
        
        connection.query(sql, function(err, results){
            if (err) callback(err, null);
            
            if (results.length){
                user.local = results[0];
                callback(null, user);
            }else{
                callback(null, user);
            }            
        })    
    };
    
    function enrichFromFB(user, callback){
        var sql = 'SELECT * FROM ?? WHERE id = ? LIMIT 1';
        var inserts = ['fb_users', user.fb_id];
        var sql = mysql.format(sql, inserts);
        
        connection.query(sql, function(err, results){
            if (err) callback(err, null);
            
            if (results.length){
                user.fb = results[0];
                callback(null, user);
            }else{
                callback(null, user);
            }
            
        });    
    };
    
    exports.findLocal = function(fields, where_obj, callback){
        //requires list as first and json.obj as second parameter, like {'username' : username}
        var sql = 'SELECT ?? FROM ?? WHERE ? LIMIT 1';
        var inserts = [fields, 'local_users', where_obj];
        sql = mysql.format(sql, inserts);
        connection.query(sql, function(err, results){
            if (err) callback(err, null);
            
            if (results.length){
                callback(null, results[0]);
            }else{
                callback(null, null);
            } 
        });
    };
    
    exports.find = function(fields, where_obj, callback){
        //requires list as first and json.obj as second parameter, like {'username' : username}
        var sql = 'SELECT ?? FROM ?? WHERE ? LIMIT 1';
        var inserts = [fields, 'users', where_obj];
        sql = mysql.format(sql, inserts);
        connection.query(sql, function(err, results){
            if (err) callback(err, null);
            
            if (results.length){
                callback(null, results[0]);
            }else{
                callback(null, null);
            } 
        });
    };
    
    exports.findFB = function(fields, where_obj, callback){
        //requires list as first and json.obj as second parameter, like {'username' : username}
        var sql = 'SELECT ?? FROM ?? WHERE ? LIMIT 1';
        var inserts = [fields, 'fb_users', where_obj];
        sql = mysql.format(sql, inserts);
        connection.query(sql, function(err, results){
            if (err) callback(err, null);
            
            if (results.length){
                callback(null, results[0]);
            }else{
                callback(null, null);
            } 
        });
    };
    
    
    exports.findById = function(id, callback){
        
        var sql = 'SELECT * FROM ?? WHERE id = ? LIMIT 1';
        var inserts = ['users', id];
        sql = mysql.format(sql, inserts);
        
        connection.query(sql, function(err, results){
            if (err) callback(err, null);
            
            if (results.length){
                var user = results[0];
                
                if (user.local_id){
                    enrichFromLocal(user, function(err, user){
                        if (user.fb_id){
                            enrichFromFB(user, function(err, user){
                                callback(null, user);
                            });
                        }else{
                            callback(null, user);
                        }
                    });
                }else{
                    if (user.fb_id){
                        enrichFromFB(user, function(err, user){
                            callback(null, user);
                        });
                    }else{
                        callback(null, user);
                    }
                }
            }else{
                callback(null, null);
            } 
        });
    };
    
   exports.generateHash = function(password){
        return crypto.createHash('md5').update(password + salt).digest('hex');
    };
    
    exports.saveLocal = function(newUser, callback){
        var sql = "INSERT into local_users SET ?";
        var inserts = [newUser];
        sql = mysql.format(sql, inserts);
        
        connection.query(sql, function(err, results){
            if (err) callback(err);
            
            var sql = "INSERT into users SET ?";
            var inserts = [{local_id : results.insertId}];
            sql = mysql.format(sql, inserts);
            
            connection.query(sql, function(err, results){
                newUser.id = results.insertId;
                callback(null, newUser);
            })            
        });
    };
    
    exports.saveFB = function(fbUser, callback){
        var sql = "INSERT into fb_users SET ?";
        var inserts = [fbUser];
        sql = mysql.format(sql, inserts);
        
        connection.query(sql, function(err, results){
            if (err) callback(err);
            
            var sql = "INSERT into users SET ?";
            var inserts = [{fb_id : fbUser.id}];
            sql = mysql.format(sql, inserts);
            
            connection.query(sql, function(err, results){
                fbUser.fb_id = fbUser.id;
                fbUser.id = results.insertId;
                callback(null, fbUser);
            }) 
        });
    };
    
    exports.verifyPassword = function(username, password, callback) {
        var sql = "SELECT password FROM ?? WHERE ?? = ? LIMIT 1";
        var inserts = ['local_users', 'username', username];
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
    
