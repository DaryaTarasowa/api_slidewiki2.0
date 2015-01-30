var mysql = require('mysql');
var lib = require('./library');
var connection = require('../config').connection;
var async = require('async');
var user = require('./user');
var googleTranslate = require('google-translate')('AIzaSyBlwXdmxJZ__ZNScwe4zq5r3qh3ebXb26k');



function getCreatedAt(id, callback){
    var sql = "SELECT created_at FROM ?? WHERE ?? = ? LIMIT 1";
    var inserts = ['slide_revision', 'id', id];
    sql = mysql.format(sql, inserts);
    
    connection.query(sql, function(err, results) {
        if (err) callback({error : err});
        callback(results[0].created_at);
    });
}

function getContent (rev_id, callback){
    //gets the content of a slide, returns the cb of content

    var sql = "SELECT body FROM ?? WHERE ?? = ? LIMIT 1";
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
                    getContent(rev_id, function(content){
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
    
   
    
    exports.setTitleFromContent = function(rev_id, content, callback){
        //sets the title field in the content parsing the content, returns the cb of set title
        
        var patt = new RegExp(/<h2(.*?)>(.*?)<\/( *?)h2>/);
        var title = patt.exec(content);
        content = content.replace(patt, '');
        if (title){ //title is set
            title = lib.strip_tags(title[0],'').trim(); //remove tags and trimming
        }        
        var sql_title = "UPDATE ?? SET title = ? WHERE ?? = ? LIMIT 1";
        var sql_content = "UPDATE ?? SET body = ? WHERE ?? = ? LIMIT 1";
        
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
    
    exports.getContributorsShort = function(rev_id, contributors, callback){
        //returns an array of contributors ids (filtered)
        var sql = 'SELECT user_id, based_on FROM slide_revision WHERE ?? = ? LIMIT 1';
        var inserts = ['id', rev_id];
        sql = mysql.format(sql, inserts);

        connection.query(sql,function(err,results){
            if (err) callback({error : err});

            
            if (results[0].based_on){      //this is not the first revision
                contributors.push(results[0].user_id);                    
                exports.getContributorsShort(results[0].based_on, contributors, function(result){
                    callback(result);
                });                                                              
            }else{ 
                contributors.push(results[0].user_id);               
                contributors = lib.arrUnique(contributors);
                callback(contributors);
            }
        });
    };
    
    exports.getContributors = function(rev_id, contributors, callback){
        //returns an array of contributors
        var sql = 'SELECT user_id, based_on FROM slide_revision WHERE ?? = ? LIMIT 1';
        var inserts = ['id', rev_id];
        sql = mysql.format(sql, inserts);

        connection.query(sql,function(err,results){
            if (err) callback({error : err});

            
            if (results[0].based_on){      //this is not the first revision
                contributors.push(results[0].user_id);                    
                exports.getContributors(results[0].based_on, contributors, function(result){
                    callback(result);
                });                                                              
            }else{ 
                contributors.push(results[0].user_id);               
                contributors = lib.arrUnique(contributors);
                contributors.forEach(function(element, index){
                    user.enrich(element, function(enriched){
                        contributors[index] = enriched;
                        contributors[index].role = ['contributor'];
                        if (element.id === results[0].user_id){
                            contributors[index].role.push('creator');
                            if (index === contributors.length - 1){
                                callback(contributors);
                            }
                        }else{
                            if (index === contributors.length - 1){
                                callback(contributors);
                            }
                        }
                        
                    })
                })
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
        
        var sql = "SELECT id, created_at, body, language FROM ?? WHERE ?? = ? LIMIT 1";
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
    
    exports.new = function(slide_metadata, callback){
        var injection = {};
        injection.position = slide_metadata.position;
        injection.title = slide_metadata.title;
        injection.user_id = slide_metadata.user_id;
        injection.body = slide_metadata.body;
        if (!injection.body) injection.body = '';
        injection.branch_owner = slide_metadata.user_id;
        injection.language = slide_metadata.language;
        if (!injection.language) injection.language = null;
        injection.parent_deck_id = slide_metadata.parent_deck_id;
        
        async.waterfall(
            [
                function getPositionNewSlide(cbAsync){
                    if (!injection.position){
                        var sql = "SELECT max(position) AS max_position FROM deck_content WHERE ?";
                        var inserts = [{deck_revision_id : injection.parent_deck_id}];
                        sql = mysql.format(sql, inserts);

                        connection.query(sql, function(err, results){
                            injection.position = results[0].max_position + 1;
                            cbAsync(err, injection);
                        });
                    }else{
                        var sql = "UPDATE deck_content SET position = position + 1 WHERE deck_revision_id = ? AND position >= ? ORDER BY position DESC";
                        var inserts = [injection.parent_deck_id, injection.position];
                        sql = mysql.format(sql, inserts);
                        
                        connection.query(sql, function(err, results){
                             cbAsync(err, injection);
                        });

                    }
                    
                },

                function getBranchNewSlide(injection, cbAsync) {
                    var sql = "SELECT max(branch_id) AS max_brunch FROM slide_revision WHERE 1";
                    connection.query(sql, function(err, results){
                        injection.branch_id = results[0].max_brunch + 1;
                        cbAsync(err, injection);
                    });
                },
                function saveSlide(injection, cbAsync){
                    var deck_revision_id = injection.parent_deck_id;
                    delete injection.parent_deck_id;
                    var position = injection.position;
                    delete injection.position;                    
                    var sql = "INSERT into slide_revision SET ?";
                    var inserts = [injection];
                    sql = mysql.format(sql, inserts);
                    console.log(sql);
                    connection.query(sql, function(err, qresults){
                        if (err) callback(err);

                        injection.id = qresults.insertId;
                        delete injection.branch_id;
                        delete injection.branch_owner;
                        delete injection.language;

                        var sql = "INSERT into deck_content SET ?";
                        var inserts = [{deck_revision_id :deck_revision_id, item_id : injection.id, item_type: 'slide', position: position}];
                        sql = mysql.format(sql, inserts);
                        connection.query(sql, function(err, results_insert){
                            getCreatedAt(injection.id, function(created_at){
                                injection.created_at = created_at;
                                cbAsync(null, injection);
                            });
                        });
                    });
                }
            ], 
            function asyncComplete(err, result) {
                callback(err, result);  
            }
        );
    };
    
    exports.update = function(slide_metadata, callback){
        if (slide_metadata.no_new_revision === 'true'){
            var sql = "UPDATE slide_revision SET ? WHERE ?";
            var inserts = [{title: slide_metadata.title, body: slide_metadata.body}, {id : slide_metadata.id}];
            sql = mysql.format(sql, inserts);
            
            connection.query(sql, function(err, results){
                if (err) callback(err);
                console.log(slide_metadata);
                callback(null, slide_metadata);
            });
        }else{
            var injection = {};
            injection.id = slide_metadata.id;
            injection.position = slide_metadata.position;
            injection.title = slide_metadata.title;
            injection.user_id = slide_metadata.user_id;
            injection.body = slide_metadata.body;
            if (!injection.body) injection.body = '';
            injection.branch_owner = slide_metadata.user_id;
            injection.language = slide_metadata.language;
            if (!injection.language) injection.language = null;
            injection.parent_deck_id = slide_metadata.parent_deck_id;

            async.waterfall(
                [
                    function getPositionNewSlide(cbAsync){
                        var sql = "SELECT position FROM deck_content WHERE ?? = ? AND ?? = ? AND ?? = ?";
                        var inserts = ['deck_revision_id', injection.parent_deck_id, 'item_id', injection.id, 'item_type', 'slide'];
                        sql = mysql.format(sql, inserts);
                        
                        connection.query(sql, function(err, results){
                            injection.position = results[0].position;
                            cbAsync(err, injection);
                        });
                    },

                    function getBranchNewSlide(injection, cbAsync) {
                        var sql = "SELECT branch_id FROM slide_revision WHERE ?";
                        var inserts = [{id : injection.id}];
                        sql = mysql.format(sql, inserts);
                        connection.query(sql, function(err, results){
                            injection.branch_id = results[0].branch_id;
                            cbAsync(err, injection);
                        });
                    },
                    function saveSlide(injection, cbAsync){
                        var deck_revision_id = injection.parent_deck_id;
                        delete injection.parent_deck_id;
                        delete injection.position; 
                        var old_id = injection.id;
                        injection.based_on = old_id;
                        delete injection.id;
                        var sql = "INSERT into slide_revision SET ?";
                        var inserts = [injection];
                        sql = mysql.format(sql, inserts);
                        
                        connection.query(sql, function(err, qresults){
                            if (err) callback(err);

                            injection.id = qresults.insertId;
                            
                            delete injection.branch_id;
                            delete injection.branch_owner;
                            delete injection.language;
                            delete injection.user_id;
                            delete injection.based_on;

                            var sql = "UPDATE deck_content SET ? WHERE ?? = ? AND ?? = ? AND ?? = ?";
                            var inserts = [{item_id : injection.id}, 'deck_revision_id', deck_revision_id, 'item_id', old_id, 'item_type' , 'slide'];
                            sql = mysql.format(sql, inserts);
                            connection.query(sql, function(err, results_insert){
                                
                                getCreatedAt(injection.id, function(created_at){
                                    injection.created_at = created_at;
                                    cbAsync(null, injection);
                                })

                            });

                        });
                    }
                ], 
                function asyncComplete(err, result) {
                    callback(err, result);  
                }
            );
            
        }
    };
    
    exports.translate = function(user_id, slide_id, target, callback){
        var translated = {};
        translated.language = target;
        
        
        async.waterfall([
            function getSlideMetadata(cbAsync){
                exports.getMetadata(slide_id, function(metadata){
                    cbAsync(null, metadata);
                });
            },
            
            function translate_title(metadata, cbAsync){
                googleTranslate.translate(metadata.title, target, function(err, translation){
                    translated.title = translation.translatedText;
                    cbAsync(null, translated);
                });
            }
        ],
        function asyncComplete(err, translated){
            callback(translated);
        });
        
        
    };



