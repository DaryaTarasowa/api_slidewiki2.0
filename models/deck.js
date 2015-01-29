var mysql = require('mysql');
var slide = require('./slide');
var lib = require('./library');
var connection = require('../config').connection;
var user = require('../models/user');
var async = require('async');

    
    //high-order fundtions
    
    function ifSlideThen(child, callback){
        //parsing the tree, on slide - doing callback, on deck - getting deeper
        
        
        if (child.type === 'slide'){
            callback(child);
        }else{            
            child.children.forEach(function(child_child){                
                ifSlideThen(child_child, callback);
            });
        }
    };
    
    
    //methods
    
    function getChildren(id, callback){
        //gets direct children of deck
        var sql = "SELECT item_id AS id, item_type AS type, position FROM ?? WHERE ?? = ? ORDER BY position";
        var inserts = ['deck_content', 'deck_revision_id', id];
        sql = mysql.format(sql, inserts);
        connection.query(sql, function(err, results) {
            if (err) callback({error : err});
            
            callback(results);
        });	
    };
        
    exports.getTitle = function(rev_id, callback){
        var sql = "SELECT title FROM ?? WHERE ?? = ?";
        var inserts = ['deck_revision', 'id', rev_id];
        sql = mysql.format(sql, inserts);
            connection.query(sql, function(err, results) {
                if (err) callback({error : err});
                
                if (results.length){
                    callback(results[0].title);
                }else{
                    callback({error : 'Deck not found!'});
                }                
            }); 
        };        
    
    exports.getTree = function(id, acc, callback) {
        //tail recursion which builds the deck tree, accumulating in acc
       
        var new_children = [];
        exports.getTitle(id, function (title_str) {
            if (!title_str.error){
                acc.title = title_str;
                acc.id = id;
                acc.type = 'deck';
                acc.children = [];
                //acc.numberOfSlides = 0;
                getChildren(acc.id, function(children){//get direct children
                    children.forEach(function(child){
                        if (child.type === 'deck'){
                            exports.getTree(child.id, child, function(child_child){//get the tree for a child
                                acc.children[child_child.position - 1] = child_child;
                                new_children = acc.children.filter(function(value) { return value !== null });
                                if(new_children.length === children.length) {
                                    acc.children = new_children;
                                    callback(acc);
                                }
                            });                            
                        }
                        else{ 
                            slide.getTitle(child.id, function(title_str){
                                if (!title_str.error){
                                    child.title = title_str;
                                    acc.children[child.position - 1] = child;
                                    new_children = acc.children.filter(function(value) { return value !== null });
                                    if(new_children.length === children.length) {
                                        acc.children = new_children;
                                        callback(acc);
                                    }
                                }else{
                                    new_children = acc.children.filter(function(value) { return value !== null });
                                    if(new_children.length === children.length) {
                                        acc.children = new_children;
                                        callback(acc);
                                    }
                                }                                
                            });                            
                        }
                    });
                    new_children = acc.children.filter(function(value) { return value !== null });
                    if(new_children.length === children.length) {
                        acc.children = new_children;
                        callback(acc);
                    }
                });
            }else{
                callback({error : 'Deck not found!'});
            }            
        });
    };
    
    exports.getMetadata = function(id, callback){
        var sql = "SELECT id, title, timestamp AS created_at, abstract AS description FROM ?? WHERE ?? = ? LIMIT 1";
        var inserts = ['deck_revision', 'id', id];
        sql = mysql.format(sql, inserts);
        
        connection.query(sql, function(err, results) {
            if (err) callback({error : err});
            
            if (results.length){
                exports.getTree(results[0].id, {}, function(tree){ //getting number of slides
                    if (!tree.error){
                        var numberOfSlides = 0;
                        tree.children.forEach(function(child){ 
                            ifSlideThen(child, function(){
                                numberOfSlides++;                       
                            });                    
                        });
                        results[0].numberOfSlides = numberOfSlides;
                        callback(results[0]);
                    }else{
                        callback(tree);
                    }                    
                });     
            }else{
                callback({error : 'Deck not found!'});
            }                   
        });
    };
    
       
    exports.getAllSlides = function(rev_id, callback){
        //builds the list of all slides (ids) of the deck, including the slides from subdecks
        
        var slides = [];
        
        exports.getTree(rev_id, {}, function(tree){
            if (!tree.error){
                tree.children.forEach(function(child){
                    ifSlideThen(child, function(child){
                        slides.push(child.id);
                    });
                });
                callback(slides);
            }else{ //get tree has an error
                callback(tree);
            }            
        });
    };
    
    exports.getSlides = function(id, offset, limit, onlyIDs, callback){
        
        var result = {};
        result.id = id;
        result.offset = offset;
        result.limit = limit;
        result.slides = [];
        offset = parseInt(offset);
        limit = parseInt(limit);
        exports.getAllSlides(id, function(slides){
            if (slides.error){
                callback(slides);
            }else{
                if (limit && limit+offset < slides.length){ //limit is set and doesn't exceed the number of slides
                    slides.forEach(function(slide_id, index){
                        if (index+1 >= offset && index+1 <= offset + limit){ //while in the borders
                            if (onlyIDs === 'false'){ //get all metadata
                                slide.getMetadata(slide_id, function(metadata){
                                    if (metadata.error){
                                        callback(metadata);
                                    }
                                    result.slides.push(metadata);
                                    if (index+2 === offset + limit){ //if reached the limit
                                        callback(result);
                                    }
                                });
                            }else{ //get only IDs
                                result.slides.push({'id' : slide_id});
                                if (index+2 === offset + limit){ //if reached the limit
                                    callback(result);
                                }
                            }                        
                        };
                    });     
                }else{ //limit is 0 or exceed the number of slides
                    slides.forEach(function(slide_id, index){
                        if (index+1 >= offset){ //while in the borders
                            if (onlyIDs === 'false'){ //get all metadata
                                slide.getMetadata(slide_id, function(metadata){
                                    if (metadata.error){
                                        callback(metadata);
                                    }
                                    result.slides.push(metadata);
                                    if (index+1 === slides.length){ //if reached the limit
                                        callback(result);
                                    }
                                });
                            }else{ //get only IDS
                                result.slides.push({'id' : slide_id});
                                if (index+1 === slides.length){ //if reached the limit
                                    callback(result);
                                }
                            }
                        };
                    });
                    if (slides.length === 0){
                        callback({error : 'A deck with the rev_id does not have slides!'});
                    }
                }                       
            }
        });
    };
    
    exports.getContributors = function(rev_id, callback){
        //TODO: the user having different roles should be filtered?
        //TODO: translators
       
        async.waterfall([
            function getUser(cbAsync){
                var sql = 'SELECT user_id FROM deck_revision WHERE ?? = ? LIMIT 1';
                var inserts = ['id', rev_id];
                sql = mysql.format(sql, inserts);
                
                connection.query(sql,function(err,results){
                    if (err) cbAsync(err);
                    cbAsync(null, results[0].user_id);
                });
            },
            
            function collectContributors(owner_id, cbAsync){
                var contributors = [];
                var cbs = 0;
                exports.getAllSlides(rev_id, function(slide_ids){ //get contributors of slides
                    slide_ids.forEach(function(slide_id, index){
                        cbs++;
                        slide.getContributorsShort(slide_id, [], function(slide_contributors){
                            contributors = contributors.concat(slide_contributors); //merge contributors from slides
                            cbs--;
                            if (cbs === 0){
                                cbAsync(null, owner_id, lib.arrUnique(contributors));}
                        });
                    });
                    
                });
            },
            
            function enrichUsers(owner_id, slide_contributors, cbAsync){
                slide_contributors.forEach(function(element, index){
                    user.enrich(element, function(enriched){
                        slide_contributors[index] = enriched;
                        if (index === slide_contributors.length - 1){
                            cbAsync(null, owner_id, slide_contributors);
                        }
                    })
                })
            },
            
            function addDeckOwner(owner_id, slide_contributors, cbAsync){
                
                
                user.enrich(owner_id, function(enriched){
                    slide_contributors.push(enriched);
                    var contributors = lib.arrUnique(slide_contributors);
                    contributors.forEach(function(element, index){
                        contributors[index].role = ['contributor'];
                        if (element.id === owner_id){
                            contributors[index].role.push('creator');
                            if (index === contributors.length - 1){
                                cbAsync(null, contributors);
                            }
                        }else{
                            if (index === contributors.length - 1){
                                cbAsync(null, contributors);
                            }
                        }
                        
                    });
                }) 
//                    if (user_obj.local_id){
//                        user.enrichFromLocal(user_obj, function(err, enriched){
//                            delete user_obj.local_id;
//                            delete user_obj.fb_id;
//                            user_obj.id = user_obj.user_id;
//                            user_obj.email = enriched.local.email;
//                            
//                            
//                            user_obj.role = [];
//                            user_obj.registered = enriched.local.registered;
//                            user_obj.username = enriched.local.username;
//                            delete user_obj.local;
//                            delete user_obj.user_id;
//                            slide_contributors.push(user_obj);
//                            var contributors = lib.arrUnique(slide_contributors); //unique
//                            console.log(contributors);
//                            contributors.forEach(function(user, index){
//                                user.role.push('contributor');
//                                if (user.id === user_obj.id){
//                                    user.role.push('creator');
//                                }
//                                contributors[index] = user;
//
//                                if (index === contributors.length -1 ){
//                                    cbAsync(null, contributors);
//                                }                            
//                            }) 
//                        });
//                    }
                 
            }
        ], function(err, results){callback(results);});
        
    };
    
    exports.getTags = function(rev_id, callback){
            
        var sql = 'SELECT tag FROM tag WHERE ?? = ? AND item_type = "deck"';
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


