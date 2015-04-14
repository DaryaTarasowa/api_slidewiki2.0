var mysql = require('mysql');
var crypto = require('crypto');
var salt = 'slidewikisalt';
var connection = require('../config/config').connection;
var async  = require('async');
var lib = require('./library');


    exports.enrich = function(user_id, callback){
        var sql = 'SELECT users.id AS id, users.picture AS avatar, local_id, fb_id, local_users.email, local_users.username, local_users.registered, fb_users.email AS fb_email, fb_users.name FROM users LEFT JOIN local_users ON users.local_id = local_users.id LEFT JOIN fb_users ON users.fb_id = fb_users.id WHERE users.id = ? LIMIT 1';
        var inserts = [user_id];
        var sql = mysql.format(sql, inserts);

        connection.query(sql, function(err, results){
            if (err) callback(err);
            
            callback(null, lib.compactObject(results[0]));            
        });
    };

    exports.enrichFromLocal = function(user, callback){
        var sql = 'SELECT * FROM ?? WHERE id = ? LIMIT 1';
        var inserts = ['local_users', user.local_id];
        var sql = mysql.format(sql, inserts);
        
        connection.query(sql, function(err, results){
            if (err) callback(err);
            
            if (results.length){
                user.local = results[0];
            }
            callback(null, user);
        });    
    };
    
    exports.enrichFromFB = function(user, callback){
        var sql = 'SELECT * FROM ?? WHERE id = ? LIMIT 1';
        var inserts = ['fb_users', user.fb_id];
        var sql = mysql.format(sql, inserts);
        
        connection.query(sql, function(err, results){
            if (err) callback(err);
            
            if (results.length){
                user.fb = results[0];
            }
            callback(null, user);
        });    
    };
    
    exports.findLocal = function(fields, where_obj, callback){
        //requires list as first and json.obj as second parameter, like {'username' : username}
        // var sql = 'SELECT ?? FROM ?? WHERE ? LIMIT 1';
        var sql = 'select * from local_users, users where local_users.id = users.local_id AND users.local_id = ? LIMIT 1;'
        var inserts = [where_obj.id];
        sql = mysql.format(sql, inserts);
        connection.query(sql, function(err, results){
            if (err) callback(err);
            
            if (results.length){
                callback(null, results[0]);
            }else{
                callback('LocalUser not found');
            } 
        });
    };
    
    exports.find = function(fields, where_obj, callback){
        //requires list as first and json.obj as second parameter, like {'username' : username}
        var sql = 'SELECT ?? FROM ?? WHERE ? LIMIT 1';
        var inserts = [fields, 'users', where_obj];
        sql = mysql.format(sql, inserts);
        connection.query(sql, function(err, results){
            if (err) callback(err);
            
            if (results.length){
                callback(null, results[0]);
            }else{
                callback('User not found');
            } 
        });
    };
    
    exports.findFB = function(fields, where_obj, callback){
        //requires list as first and json.obj as second parameter, like {'username' : username}
        var sql = 'SELECT ?? FROM ?? WHERE ? LIMIT 1';
        var inserts = [fields, 'fb_users', where_obj];
        sql = mysql.format(sql, inserts);
        connection.query(sql, function(err, results){
            if (err) callback(err);
            
            if (results.length){
                callback(null, results[0]);
            }else{
                callback('FBUser not found ');
            } 
        });
    };
    
    
    exports.findById = function(id, callback){
        
        var sql = 'SELECT * FROM ?? WHERE id = ? LIMIT 1';
        var inserts = ['users', id];
        sql = mysql.format(sql, inserts);
        
        connection.query(sql, function(err, results){
            if (err) callback(err);
            
            if (results.length){
                var user = results[0];
                
                if (user.local_id){
                    exports.enrichFromLocal(user, function(err, user){
                        if (err) callback(err);
                        
                        if (user.fb_id){
                            exports.enrichFromFB(user, function(err, user){
                                callback(err, user);
                            });
                        }else{
                            callback(null, user);
                        }
                    });
                }else{
                    if (user.fb_id){
                        exports.enrichFromFB(user, function(err, user){
                            callback(err, user);
                        });
                    }else{
                        callback(null, user);
                    }
                }
            }else{
                callback('User not found with id ' + id);
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
                if (err) callback(err);
                
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
                if (err) callback(err);
                
                fbUser.fb_id = fbUser.id;
                fbUser.id = results.insertId;
                callback(null, fbUser);
            }); 
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
                callback('Not found username ' + username);
            }                   
        });        
        
    };
    
