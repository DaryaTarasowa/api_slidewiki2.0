var mysql = require('mysql');
var slide = require('./slide');
var lib = require('./library');
var connection = require('../config').connection;
var user = require('../models/user');


    
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
       
        var contributors = [];
        var cbs = 0;
        var sql = 'SELECT users.username AS username, picture AS avatar, registered FROM deck_revision INNER JOIN users ON(deck_revision.user_id=users.id) WHERE ?? = ? LIMIT 1';
        var inserts = ['deck_revision.id', rev_id];
        sql = mysql.format(sql, inserts);
        
        exports.getAllSlides(rev_id, function(slide_ids){ //get contributors of slides
            if (!slide_ids.error){
                slide_ids.forEach(function(slide_id){
                    cbs++;
                    slide.getContributors(slide_id, [], function(slide_contributors){
                        if (slide_contributors.error){
                            callback(slide_contributors);
                        }
                        contributors = contributors.concat(slide_contributors); //merge contributors from slides
                        cbs--;
                        if (cbs === 0){
                            contributors.forEach(function(user,index){
                                contributors[index].role = [];
                            });
                            contributors = lib.arrUnique(contributors); //unique
                           
                            connection.query(sql,function(err,results){ //add deck_revision creator
                                if (err) callback({error : err});

                                if (results.length){
                                    contributors.push(results[0]);
                                    contributors = lib.arrUnique(contributors); //unique
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
                                    })                                   
                                }else{
                                    callback(lib.arrUnique(contributors));
                                }                            
                            });
                        };
                    });                
                });
            }else{
                callback(slide_ids);
            }
                        
        });
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


