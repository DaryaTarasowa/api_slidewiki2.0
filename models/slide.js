var mysql = require('mysql');
var lib = require('./library');
var connection = require('../config').connection;

// Constructor
exports.getTitle = function(rev_id, callback){
        //gets the title either from title field or parsing the content, returns the cb(title)
        
        var sql = "SELECT title FROM ?? WHERE ?? = ? LIMIT 1";
        var inserts = ['slide_revision', 'id', rev_id];
        sql = mysql.format(sql, inserts);
        connection.query(sql, function(err, results) {
            if (err) callback({error : err});
            
            if (results.length){
                if (results[0].title){
                    callback(results[0].title);
                }else{
                    exports.getContent(rev_id, function(content){
                        if (content.error){
                            callback(content);
                        }
                        exports.setTitleFromContent(rev_id, content, function(title){
                            callback(title);
                        });
                    });
                };  
            }else{
                callback({error : 'slide not found!'});
            }                          
        });
    };
    
    exports.getContent = function(rev_id, callback){
        //gets the content of a slide, returns the cb of content
        
        var sql = "SELECT content FROM ?? WHERE ?? = ? LIMIT 1";
        var inserts = ['slide_revision', 'id', rev_id];
        sql = mysql.format(sql, inserts);
        connection.query(sql, function(err, results) {
            if (err) callback({error : err});
            
            if (results.length){
                callback(results[0].content);   
            }else{
                callback({error: 'slide not found!'});
            }                         
        });        
    };    
    
    exports.setTitleFromContent = function(rev_id, content, callback){
        //sets the title field in the content parsing the content, returns the cb of set title
        
        var patt = new RegExp(/<h2(.*?)>(.*?)<\/( *?)h2>/);
        var title = patt.exec(content);
        var content = content.replace(patt, '');
        if (title){ //title is set
            title = lib.strip_tags(title[0],'').trim(); //remove tags and trimming
        }        
        var sql_title = "UPDATE ?? SET title = ? WHERE ?? = ? LIMIT 1";
        var sql_content = "UPDATE ?? SET content = ? WHERE ?? = ? LIMIT 1";
        
        if (title){ //title is not empty
            var inserts_title = ['slide_revision', title, 'id', rev_id]; //set title field (only tags)
            sql_title = mysql.format(sql_title, inserts_title);
            connection.query(sql_title, function(err, results) {
                    if (err) callback({error : err});

                    var inserts_content = ['slide_revision', content, 'id', rev_id]; //remove title from content
                        sql_content = mysql.format(sql_content, inserts_content);
                        connection.query(sql_content, function(err, results) {
                            if (err) callback({error : err});
                    
                            callback(title);
                    });                    
            }); 
        }else{ //no title is set in the content or empty title
            var inserts = ['slide_revision', 'Untitled', 'id', rev_id];
            sql = mysql.format(sql_title, inserts);
            connection.query(sql, function(err, results) {
                if (err) callback({error : err});

                callback('Untitled');
            }); 
        }        
    };
    
    exports.getContributors = function(rev_id, contributors, callback){
        //TODO: the user having different roles should be filtered?
        //TODO: translators
        var sql = 'SELECT users.username AS username, picture AS avatar, registered, slide_revision.based_on AS based_on FROM slide_revision INNER JOIN users ON(slide_revision.user_id=users.id) WHERE ?? = ? LIMIT 1';
        var inserts = ['slide_revision.id', rev_id];
        sql = mysql.format(sql, inserts);
        connection.query(sql,function(err,results){
            if (err) callback({error : err});
            
            if (results.length){
                var based_on = results[0].based_on;
                delete results[0].based_on;
                if (based_on){      //this is not the first revision
                    contributors.push(results[0]);                    
                    exports.getContributors(based_on, contributors, function(result){
                        callback(result);
                    });                                                              
                }else{ 
                    contributors.push(results[0]);                
                    contributors = lib.arrUnique(contributors);
                    contributors.forEach(function(user, index){
                            
                        user.role = [];
                        user.role.push('contributor');
                        if (user.username === results[0].username){
                            user.role.push('creator');
                        }
                        contributors[index] = user;

                        if (index === contributors.length -1 ){
                            callback(contributors);
                        }                            
                    });
                }    
            }else{
                callback({error: 'slide not found'});   
            }                    
        });
    };
    
    exports.getTags = function(rev_id, callback){
            
        var sql = 'SELECT tag FROM tag WHERE ?? = ? AND item_type = "slide"';
        var inserts = ['item_id', rev_id];
        var tags = [];
        sql = mysql.format(sql, inserts);
        connection.query(sql,function(err,results){
            if (err) callback({error : err});
            
            if (results.length){
                results.forEach(function(tag_object){
                    tags.push(tag_object.tag);
                    if (tags.length === results.length){
                        callback(tags);
                    };
                });  
            }else{
                callback([]);
            }
                               
        });
    };
    
    exports.setAllTitles = function(callback){
        //sets all titles in the database parsing the content, returns the set of all titles
        
        var result = [];
        var sql = "SELECT id FROM ?? WHERE 1";
        var inserts = ['slide_revision'];
        sql = mysql.format(sql, inserts);
        connection.query(sql, function(err, results){
            if (err) callback({error : err});
            
            results.forEach(function(element){   //results = all ids of the slides   
                exports.getTitle(element.id, function(title){ //for each id call the getTitle
                    if (title.error) callback(title);
                    
                    result.push(title);
                    if (result.length === results.length){
                        callback(result);
                    }                    
                });
            });
            if (result.length === results.length){
                callback(result);
            }
        });
    };
    
    exports.getMetadata = function(id, callback){
        //gets metadata of a slide
        
        var sql = "SELECT id, timestamp AS created_at, content AS body FROM ?? WHERE ?? = ? LIMIT 1";
        var inserts = ['slide_revision', 'id', id];
        sql = mysql.format(sql, inserts);
        connection.query(sql, function(err, results) {
            if (err) callback({error : err});
            
            if (results.length){
                exports.getTitle(id, function(title){
                    if (title.error) callback(title);
                    
                    results[0].title = title;
                    callback(results[0]);
                }); 
            }else{
                callback({error :'Slide not found'});
            }            
        });
    };



