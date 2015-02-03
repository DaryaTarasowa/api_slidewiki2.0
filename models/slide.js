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
        callback(err, results[0].created_at);
    });
}

function getBranchId(slide_id, callback){
    var sql = "SELECT branch_id FROM ?? WHERE ?? = ? LIMIT 1";
    var inserts = ['slide_revision', 'id', slide_id];
    sql = mysql.format(sql, inserts);
    
    connection.query(sql, function(err, results) {
        callback(err, results[0].branch_id);
    });
}

function getAllRevisions(rev_id, callback){
    getBranchId(rev_id, function(err, branch_id){
        if (err) callback(err);
        
        var sql = "SELECT id, title, translated_from, translated_from_revision, body, created_at, user_id FROM ?? WHERE ?? = ? ORDER BY created_at DESC";
        var inserts = ['slide_revision', 'branch_id', branch_id];
        sql = mysql.format(sql, inserts);

        connection.query(sql, function(err, results) {
            callback(err, results);
        });
    });
}

function getLastRevision(rev_id, callback){
    getBranchId(rev_id, function(err, branch_id){
        if (err) callback(err);
        var sql = "SELECT id, title, translated_from, translated_from_revision, body, created_at, user_id FROM ?? WHERE ?? = ? ORDER BY created_at DESC LIMIT 1";
        var inserts = ['slide_revision', 'branch_id', branch_id];
        sql = mysql.format(sql, inserts);

        connection.query(sql, function(err, results) {
            callback(err, results[0]);
        });
    });
}

function getContent (rev_id, callback){
    //gets the content of a slide, returns the cb of content

    var sql = "SELECT body FROM ?? WHERE ?? = ? LIMIT 1";
    var inserts = ['slide_revision', 'id', rev_id];
    sql = mysql.format(sql, inserts);
    connection.query(sql, function(err, results) {
        if (err) callback(err);

        if (results.length){
            callback(null, results[0].body);   
        }else{
            callback('Not found slide with id ' + rev_id);
        }                         
    });        
};

function formatForTranslation(body){
    if (body.length){
        body = body.trim().replace( /  +/g, ' ' ); //removing double spaces and trimming
        body = body.replace(/\r|\n/g, '');
        return body;
    }else{
        return '';
    }
    
}

function splitBody(body){
    //splits body into an array of 5000 characters strings
    
    return body.match(/.{1,5000}/g);
}

exports.getTitle = function(rev_id, callback){
        //gets the title either from title field or parsing the content, returns the cb(title)
        
        var sql = "SELECT title FROM ?? WHERE ?? = ? LIMIT 1";
        var inserts = ['slide_revision', 'id', rev_id];
        sql = mysql.format(sql, inserts);
        connection.query(sql, function(err, results) {
            if (err) callback(err);
            
            if (results.length){
                if (results[0].title){
                    callback(null, results[0].title);
                }else{
                    getContent(rev_id, function(err, content){
                        if (err){callback(err);}
                        exports.setTitleFromContent(rev_id, content, function(err, title){
                            callback(err, title);
                        });
                    });
                };  
            }else{
                callback('Not found slide with id ' + rev_id);
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
                if (err) callback(err);

                var inserts_content = ['slide_revision', content, 'id', rev_id]; //remove title from content
                sql_content = mysql.format(sql_content, inserts_content);
                connection.query(sql_content, function(err, results) {
                    callback(err, title);
                });                    
            }); 
        }else{ //no title is set in the content or empty title
            var inserts = ['slide_revision', 'Untitled', 'id', rev_id];
            sql = mysql.format(sql_title, inserts);
            connection.query(sql, function(err, results) {
                callback(err, 'Untitled');
            }); 
        }        
    };
    
    exports.getContributorsShort = function(rev_id, contributors, callback){
        //returns an array of contributors ids (filtered)
        var sql = 'SELECT user_id, based_on FROM slide_revision WHERE ?? = ? LIMIT 1';
        var inserts = ['id', rev_id];
        sql = mysql.format(sql, inserts);

        connection.query(sql,function(err,results){
            if (err) callback(err);
            if (results.length){
                if (results[0].based_on){      //this is not the first revision
                    contributors.push(results[0].user_id);                    
                    exports.getContributorsShort(results[0].based_on, contributors, function(err, result){
                        callback(err, result);
                    });                                                              
                }else{ 
                    contributors.push(results[0].user_id);               
                    contributors = lib.arrUnique(contributors);
                    callback(null, contributors);
                }
            }else{
                callback('Not found slide with id ' + rev_id);
            }
            
        });
    };
    
    exports.getContributors = function(rev_id, contributors, callback){
        //returns an array of contributors
        var sql = 'SELECT user_id, based_on FROM slide_revision WHERE ?? = ? LIMIT 1';
        var inserts = ['id', rev_id];
        sql = mysql.format(sql, inserts);

        connection.query(sql,function(err,results){
            if (err) callback(err);

            
            if (results[0].based_on){      //this is not the first revision
                contributors.push(results[0].user_id);                    
                exports.getContributors(results[0].based_on, contributors, function(err, result){
                    callback(err, result);
                });                                                              
            }else{ 
                contributors.push(results[0].user_id);               
                contributors = lib.arrUnique(contributors);
                contributors.forEach(function(element, index){
                    user.enrich(element, function(err, enriched){
                        if (err) callback(err);
                        contributors[index] = enriched;
                        contributors[index].role = ['contributor'];
                        if (element.id === results[0].user_id){
                            contributors[index].role.push('creator');
                            if (index === contributors.length - 1){
                                callback(null, contributors);
                            }
                        }else{
                            if (index === contributors.length - 1){
                                callback(null, contributors);
                            }
                        }
                    });
                });
            }
        });
    };
    
    exports.getTags = function(rev_id, callback){
        
        var tags = [];
        var sql = 'SELECT tag FROM tag WHERE ?? = ? AND item_type = "slide"';
        var inserts = ['item_id', rev_id];        
        sql = mysql.format(sql, inserts);
        
        connection.query(sql,function(err,results){
            if (err) callback(err);
            
            if (results.length){
                results.forEach(function(tag_object){
                    tags.push(tag_object.tag);
                    if (tags.length === results.length){
                        callback(null, tags);
                    };
                });  
            }else{
                callback(null, []);
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
            if (err) callback(err);
            
            results.forEach(function(element){   //results = all ids of the slides   
                exports.getTitle(element.id, function(err, title){ //for each id call the getTitle
                    if (err) callback(err);
                    
                    result.push(title);
                    if (result.length === results.length){
                        callback(null, result);
                    }                    
                });
            });
            if (result.length === results.length){
                callback(null, result);
            }
        });
    };
    
    exports.getMetadata = function(id, callback){
        //gets metadata of a slide
        
        var sql = "SELECT id, created_at, body, language FROM ?? WHERE ?? = ? LIMIT 1";
        var inserts = ['slide_revision', 'id', id];
        sql = mysql.format(sql, inserts);
        connection.query(sql, function(err, results) {
            if (err) callback(err);
            
            if (results.length){
                exports.getTitle(id, function(err, title){
                    if (err) callback(err);
                    
                    results[0].title = title;
                    callback(null, results[0]);
                }); 
            }else{
                callback('Not found slide with id ' + id);
            }            
        });
    };
    
    exports.new = function(slide_metadata, callback){
        var injection = {};
        
        injection.title = slide_metadata.title;
        injection.user_id = slide_metadata.user_id;
        injection.body = slide_metadata.body;
        if (!injection.body) injection.body = '';
        injection.branch_owner = slide_metadata.user_id;
        injection.language = slide_metadata.language;
        if (!injection.language) injection.language = null;
        injection.translated_from = slide_metadata.translated_from;
        injection.translated_from_revision = slide_metadata.translated_from_revision;
        injection.translation_status = slide_metadata.translation_status;
        
        
        async.waterfall(
            [
                function getBranchNewSlide(cbAsync) {
                    var sql = "SELECT max(branch_id) AS max_brunch FROM slide_revision WHERE 1";
                    connection.query(sql, function(err, results){
                        if (err) cbAsync(err);
                        injection.branch_id = results[0].max_brunch + 1;
                        cbAsync(null, injection);
                    });
                },
                function saveSlide(injection, cbAsync){
                    
                    var sql = "INSERT into slide_revision SET ?";
                    var inserts = [injection];
                    sql = mysql.format(sql, inserts);
                    
                    
                    connection.query(sql, function(err, qresults){
                        if (err) cbAsync(err);

                        injection.id = qresults.insertId;
                        delete injection.branch_id;
                        delete injection.branch_owner;
                        delete injection.language;
                        
                        getCreatedAt(injection.id, function(err, created_at){
                            if (err) cbAsync(err);
                            injection.created_at = created_at;
                            cbAsync(null, injection);
                        });
                    });
                }
            ], 
            function asyncComplete(err, result) {
                callback(err, result);  
            }
        );
    };
    
    exports.addToDeck = function(deck_id, slide_id, position, callback){
        //todo: what it should return?
        async.waterfall([
            function getPositionNewSlide(cbAsync){
                if (!position){
                    var sql = "SELECT max(position) AS max_position FROM deck_content WHERE ?";
                    var inserts = [{deck_revision_id : deck_id}];
                    sql = mysql.format(sql, inserts);

                    connection.query(sql, function(err, results){
                        if (err) cbAsync(err);
                        position = results[0].max_position + 1;
                        cbAsync(null, position);
                    });
                }else{
                    var sql = "UPDATE deck_content SET position = position + 1 WHERE deck_revision_id = ? AND position >= ? ORDER BY position DESC";
                    var inserts = [deck_id, position];
                    sql = mysql.format(sql, inserts);

                    connection.query(sql, function(err, results){
                         cbAsync(err, position);
                    });
                }
            },
            function addToDeckContent(position, cbAsync){
                var sql = "INSERT into deck_content SET ?";
                var inserts = [{deck_revision_id :deck_id, item_id : slide_id, item_type: 'slide', position: position}];
                sql = mysql.format(sql, inserts);
                connection.query(sql, function(err, results_insert){
                    
                    cbAsync(err, position);
                });
            }
        ], 
        
        function(err, result){
            callback('done');
        });
    };
    
    exports.update = function(slide_metadata, callback){
        if (slide_metadata.no_new_revision === 'true'){
            var sql = "UPDATE slide_revision SET ? WHERE ?";
            var inserts = [{title: slide_metadata.title, body: slide_metadata.body}, {id : slide_metadata.id}];
            sql = mysql.format(sql, inserts);
            
            connection.query(sql, function(err, results){
                if (err) callback(err);
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

            async.waterfall([
                function getPositionNewSlide(cbAsync){
                    var sql = "SELECT position FROM deck_content WHERE ?? = ? AND ?? = ? AND ?? = ?";
                    var inserts = ['deck_revision_id', injection.parent_deck_id, 'item_id', injection.id, 'item_type', 'slide'];
                    sql = mysql.format(sql, inserts);

                    connection.query(sql, function(err, results){
                        if (err) cbAsync(err);
                        injection.position = results[0].position;
                        cbAsync(null, injection);
                    });
                },

                function getBranchNewSlide(injection, cbAsync) {
                    var sql = "SELECT branch_id FROM slide_revision WHERE ?";
                    var inserts = [{id : injection.id}];
                    sql = mysql.format(sql, inserts);
                    connection.query(sql, function(err, results){
                        if (err) cbAsync(err);
                        injection.branch_id = results[0].branch_id;
                        cbAsync(null, injection);
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
                        if (err) cbAsync(err);

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
                            if (err) cbAsync(err);
                            getCreatedAt(injection.id, function(err, created_at){
                                if (err) cbAsync(err);
                                injection.created_at = created_at;
                                cbAsync(null, injection);
                            });

                        });

                    });
                }], 
                function asyncComplete(err, result) {
                    callback(err, result);  
                }
            );
            
        }
    };
    
    exports.translate = function(user_id, slide_id, source, target, callback){
        
        var translated = {};
        
        
        async.waterfall([
            function getSlideMetadata(cbAsync){
                exports.getMetadata(slide_id, function(err, metadata){
                    if (err) cbAsync(err);
                    cbAsync(null, metadata);
                });
            },
            
            function getTargetName(metadata, cbAsync){
                
                lib.getLanguages(function(err, languageArray){
                    if (err) cbAsync(err);
                    var targetForDB = languageArray[target];
                    translated.language = target + '-' + targetForDB;
                    
                    cbAsync(null, metadata);
                });
            },
            
            function translate_title(metadata, cbAsync){
                googleTranslate.translate(metadata.title, source, target, function(err, translation){
                    if (err) cbAsync(err);
                    translated.title = translation.translatedText;
                    
                    cbAsync(err, metadata);
                });
            },
            
            function translate_body(metadata, cbAsync){
                var string = formatForTranslation(metadata.body);
                if (string.length > 4999){
                    string = splitBody(string);
                }
                googleTranslate.translate(string, source, target, function(err, translation){
                    if (err) cbAsync(err);
                    
                    var translatedText = '';
                    
                    if (translation.length > 1){
                        
                        translation.forEach(function(chunk){
                            translatedText += chunk.translatedText;
                        });
                    }else{
                        translatedText = translation.translatedText;
                    }
                    translated.body = translatedText;
                    cbAsync(null, metadata);
                });
            },            
            function save(metadata, cbAsync){
                translated.user_id = user_id;
                translated.translated_from_revision = slide_id;
                translated.translation_status = 'google';
                getBranchId(slide_id, function(err, branch_id){
                    if (err) cbAsync(err);
                    translated.translated_from = branch_id;
                    exports.new(translated, function(err, saved){
                        if (err) cbAsync(err);
                        translated.id = saved.id;
                        cbAsync(err, translated);
                    });
                });                
            }
        ],
        function asyncComplete(err, translated){
            callback(err, translated);
        });
    };



