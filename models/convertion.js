var mongoose = require('mongoose');
var Muser = require('../models/muser');
var Mdeck = require('../models/mdeck');
var Mslide = require('../models/mslide');
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
                        var muser = new Muser(user);

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
    
    exports.convertDecks = function(callback){
        var sql = "SELECT deck_revision.id AS sql_id, deck_id, description AS origin, abstract AS description, language, translated_from, deck.translated_from_revision AS translated_from_revision, deck_revision.user_id AS user_id, title, deck_revision.timestamp, based_on, popularity, default_theme, default_transition, footer_text AS footer, is_featured, priority, visibility, translation_status FROM deck INNER JOIN deck_revision ON deck.id = deck_revision.deck_id WHERE 1";
        var inserts = [];
        sql = mysql.format(sql, inserts);
        
        connection.query(sql, function(err, results) {
            if (err) callback( {error : err});
            
            var count_db = results.length;
            if (count_db){
                
                
                mongoose.connection.collections['mdecks'].drop( function(err) { //drop collection
                    results.forEach(function(deck, index){
                        
                        //merging description and abstract
                        
                        
                        
                        //TODO: add children, connect with users
                        var sql_id = deck.sql_id;
                        sql = "SELECT item_id, item_type, position FROM deck_content INNER JOIN deck_revision ON deck_revision_id = deck_revision.id WHERE deck_revision.id = ?";
                        inserts = [sql_id];
                        sql = mysql.format(sql, inserts);
                        
                         connection.query(sql, function addChildren(err, children) {
                            if (err) callback({error : err});
            
                            if (children.length){
                                deck.children = children;
                            }
                            sql = "SELECT tag FROM tag WHERE item_id = ?";
                            inserts = [sql_id];
                            sql = mysql.format(sql, inserts);
                            
                            connection.query(sql, function addTags(err, tags) {
                                deck.tags = [];
                                tags.forEach(function(tag){
                                    
                                    deck.tags.push(tag.tag);
                                    
                                });
                                if(tags.length === deck.tags.length){
                                    
                                    
                                    var new_deck = new Mdeck(deck);

                                    new_deck.save(function(err) {
                                        if (err) console.log(err);

                                        if (index === count_db-1){
                                            callback({ message: 'Converting has been finished!' });
                                        }

                                    });
                                }
                            })
                        })
                    });
                });
                
            }else{
                return {error : 'No users found!'};
            }
        });
    };
    
    exports.convertSlides = function(callback){
        var sql = "SELECT slide_revision.id AS sql_id, slide AS slide_id, description, language, translated_from, slide.translated_from_revision AS translated_from_revision, slide_revision.user_id AS user_id, title, slide_revision.timestamp, content, based_on, popularity, comment, note, translation_status, translator_id FROM slide INNER JOIN slide_revision ON slide.id = slide_revision.slide WHERE 1";
        var inserts = [];
        sql = mysql.format(sql, inserts);
        
        connection.query(sql, function(err, results) {
            if (err) callback( {error : err});
            
            var count_db = results.length;
            if (count_db){
                mongoose.connection.collections['mslides'].drop( function(err) { //drop collection
                    results.forEach(function(slide, index){                                                 
                                
                        var new_slide = new Mslide(slide);

                        new_slide.save(function(err) {
                            if (err) console.log(err);

                            if (index === count_db-1){
                                callback('Done');
                            }
                        });
                    });
                });
            }
        });
    };

