var mongoose = require('mongoose');
var Muser = require('../models/muser');
var mysql = require('mysql');
var connection = require('../config').connection;

exports.convertUsers = function(callback){
        var sql = "SELECT id AS sql_id, username, password, email, registered, picture as avatar, description FROM ?? WHERE 1";
        var inserts = ['users'];
        sql = mysql.format(sql, inserts);
        
        connection.query(sql, function(err, results) {
            if (err) callback({error : err});
            
            var count_db = results.length;
            if (count_db){
                mongoose.connection.collections['musers'].drop( function(err) { //drop collection
                    results.forEach(function(user, index){
                        var muser = new Muser({
                            username: user.username,
                            password: user.password,
                            sql_id : user.sql_id,
                            email: user.email,
                            registered: user.registered,
                            avatar: user.avatar,
                            description: user.description                        
                        });

                        muser.save(function(err) {
                            if (err) callback(err);

                            if (index === count_db-1){
                                callback({ message: 'Converting has been finished!' });
                            }

                        });

                    });
                });
                
            }else{
                callback({error : 'No users found!'});
            }
        });
    };

