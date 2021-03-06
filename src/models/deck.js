var mysql = require('mysql');
var slide = require('./slide');
var lib = require('./library');
var connection = require('../config/config').connection;
var user = require('../models/user');
var async = require('async');
var googleTranslate = require('google-translate')('AIzaSyAy-A64pHjmioVt5kMt7lvnVrFkPJavzvk');
var debug = require('debug');
var _ = require('lodash');

    
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
    //private
    
    function getChildren(id, callback){
        //gets direct children of deck
        var sql = "SELECT item_id AS id, item_type AS type, position FROM ?? WHERE ?? = ? ORDER BY position";
        var inserts = ['deck_content', 'deck_revision_id', id];
        sql = mysql.format(sql, inserts);
        connection.query(sql, function(err, results) {
            
            callback(err, results);
        });	
    };
    
    function getMetadataForTranslation(deck_id, target, callback){
       
        async.waterfall([
            function setMaxBranchId(cbAsync){ //set current max branch_id 
                var sql = "SELECT max(branch_id) AS max_brunch FROM deck_revision WHERE 1";
                connection.query(sql, function(err, results){
     
                    if (err) cbAsync(err);
                    
                    exports.currentMaxBranchID = results[0].max_brunch;
                    cbAsync(null);
                });
            },
            
            function setMaxBranchId_slide(cbAsync){ //the same for slide
                var sql = "SELECT max(branch_id) AS max_brunch FROM slide_revision WHERE 1";
                connection.query(sql, function(err, results){
     
                    if (err) cbAsync(err);
                    
                    exports.currentMaxBranchID_slide = results[0].max_brunch;
                    cbAsync(null);
                });
            },
            
            function getDeckMetadata(cbAsync){
                exports.getMetadataShort(deck_id, function(err, metadata){
                    if (err) cbAsync(err);
                    delete metadata.created_at;
                    delete metadata.id;
                    
                    cbAsync(null, metadata);
                });
            },
            
            function getSourceCode(metadata, cbAsync){
                metadata.source = metadata.language.split('-')[0];
                cbAsync(null, metadata);
            },
            
            function getTargetName(metadata, cbAsync){
                
                lib.getLanguages(function(err, languageArray){
                    if (err) cbAsync(err);
                    
                    var targetForDB = languageArray[target];
                    metadata.language = target + '-' + targetForDB;
                    metadata.target = target;
                    metadata.translated_from_revision = deck_id;
                    metadata.deck_id = deck_id;
                    cbAsync(null, metadata);
                });
            }        
            
        ], callback); 
    };
    exports.currentMaxBranchID;
    
    function translateContent(user_id, metadata, callback){
        getChildren(metadata.deck_id, function(err, children){
            if (err) callback(err);
            if (children.length){
                var sql = "SELECT max(branch_id) AS max_brunch FROM deck_revision WHERE 1";
                connection.query(sql, function(err, results){
     
                    if (err) cbAsync(err);
                    
                    exports.currentMaxBranchID = results[0].max_brunch;
                    var i = children.length;
                    children.forEach(function(child, index){
                        if (child.type === 'deck'){ 
                            
                            exports.handleTranslation(user_id, child.id, metadata.target, function(err, results){
                                if (results){
                                    child.id = results.id;                                                          
                                }else{
                                    console.log("problem in deck " + child);
                                }
                                i--;
                                //console.log('We have ' + i + ' children left');
                                if (i === 0){
                                    callback(err, metadata, children);
                                }
                            });
                        }else{
                            //console.log('Start translating slide ' + child.id);
                            slide.handleTranslation(user_id, child.id, metadata.source, metadata.target, metadata.language, function(err, translated){                            
                                if (translated){                                
                                    child.id = translated.id;                               
                                } 
                                i--;
                                //console.log('We have ' + i + ' children left');
                                if (i === 0){
                                    callback(err, metadata, children);
                                }
                            });
                        }
                    });
                });
                
            }else{
                callback('While translating No children of deck ' + deck_id);
            }
            
        });
    };
    function getDirectTranslations(branch_id, callback){
        //returns an array of branch_ids of direct translations
        var sql = "SELECT id, branch_id, language, created_at FROM ?? WHERE ?? = ? GROUP BY branch_id ORDER BY created_at DESC";
        var inserts = ['deck_revision', 'translated_from', branch_id];
        sql = mysql.format(sql, inserts);

        connection.query(sql, function(err, results) {
            callback(err, results);
        });
    }
    function getRootForTranslation(branch_id, callback){
        //gets the original deck looking
        console.log('branch:' + branch_id);
        exports.getTranslatedFrom(branch_id, function(err, parent_branch){
            if (err) callback(err);
            
            if (parent_branch[0].translated_from === null) {
                callback(null, branch_id);
            }else{
                getRootForTranslation(parent_branch[0].translated_from, callback);
            }        
        });            
    };
    
    function getTranslationsFromRoot(root_branch, acc, callback){
        getDirectTranslations(root_branch, function(err, translations){
            if (err) callback(err);

            if (translations.length){
                translations.forEach(function(deck_branch_info, index){
                    acc.push(deck_branch_info);
                    getTranslationsFromRoot(deck_branch_info.branch_id, acc, function(err, result){
                        if (err) callback(err);

                        if (index === translations.length - 1){
                            callback(null, acc);
                        }
                    });                    
                });
            }else{
                callback(null, acc);
            }            
        });
    };
    
    function getLastRevisionId(branch_id, callback){
        var sql = "SELECT id FROM ?? WHERE ?? = ? ORDER BY created_at DESC LIMIT 1";
            var inserts = ['deck_revision', 'branch_id', branch_id];
            sql = mysql.format(sql, inserts);

            connection.query(sql, function(err, results) {
                callback(err, results[0].id);
            });
    }

    
    //public
    
    exports.getTranslatedFrom = function(branch_id, callback){        
        console.log(branch_id);
        var sql = "SELECT translated_from FROM ?? WHERE ?? = ? LIMIT 1";
        var inserts = ['deck_revision', 'branch_id', branch_id];
        sql = mysql.format(sql, inserts);

        connection.query(sql, function(err, results) {
            callback(err, results);
        });
         
    };
        
    exports.getTitle = function(rev_id, callback){
        var sql = "SELECT title FROM ?? WHERE ?? = ?";
        var inserts = ['deck_revision', 'id', rev_id];
        sql = mysql.format(sql, inserts);
            connection.query(sql, function(err, results) {
                if (err) callback(err);
                
                if (results.length){
                    callback(null, results[0].title);
                }else{
                    callback('Not found deck '+ rev_id);
                }                
            }); 
        };        
    
    exports.getTree = function(id, acc, callback) {
        //tail recursion which builds the deck tree, accumulating in acc
       
        var new_children = [];
        exports.getTitle(id, function (err, title_str) {
            if (err) callback(err);
           
            acc.title = title_str;
            acc.id = id;
            acc.type = 'deck';
            acc.children = [];
            //acc.numberOfSlides = 0;
            getChildren(acc.id, function(err, children){//get direct children
                if (err) callback(err);
                
                if (children.length){
                    children.forEach(function(child){
                        if (child.type === 'deck'){
                            exports.getTree(child.id, child, function(err, child_child){//get the tree for a child
                                if (err) callback(err);
                                else {
                                    acc.children[child_child.position - 1] = child_child;
                                    new_children = acc.children.filter(function(value) { return value !== null });
                                    if(new_children.length === children.length) {
                                        acc.children = new_children;
                                        callback(null, acc);
                                    }
                                }
                            });                            
                        }
                        else{ 
                            slide.getTitle(child.id, function(err, title_str){
                                if (err) callback(err);        
                                
                                child.title = title_str;
                                acc.children[child.position - 1] = child;
                                new_children = acc.children.filter(function(value) { return value !== null });
                                if(new_children.length === children.length) {
                                    acc.children = new_children;
                                    callback(null, acc);
                                }
                            });                            
                        }
                    });
                }else{
                    callback('No children for deck ' + acc.id);
                }
            });
        });
    };
    
    exports.getAllTranslations = function(id, callback){
        getBranchId(id, function(err, branch_id){
            if (err) callback(err);
           
            getRootForTranslation(branch_id, function(err, root_branch_id){
                if (err) callback(err);
                
                var sql = "SELECT id, branch_id, language, created_at FROM ?? WHERE ?? = ? GROUP BY branch_id ORDER BY created_at DESC";
                var inserts = ['deck_revision', 'branch_id', root_branch_id];
                sql = mysql.format(sql, inserts);

                connection.query(sql, function(err, results) {
                    if (err) callback(err);
                    
                    getTranslationsFromRoot(root_branch_id, [], function(err, translations){
                        if (err) callback(err);
                        
                        translations.push(results[0]);
                        translations = _.sortBy(translations, 'created_at', false);
                        translations = _.uniq(translations, 'language');
                        _.forEach(translations, function(chr, key){
                            lib.languageToJson(chr.language , function(err, language_json){
                                chr.language = language_json;
                                return chr;
                            })                    
                        });
                        callback(null, translations);
                    });
                });
                
            });
        });     
    };
    
    exports.getMetadata = function(id, callback){
        var sql = "SELECT id, title, created_at, description, footer_text, origin, language, translation_status, translated_from_revision FROM ?? WHERE ?? = ? LIMIT 1";
        var inserts = ['deck_revision', 'id', id];
        sql = mysql.format(sql, inserts);
        
        connection.query(sql, function(err, results) {
            if (err) callback(err);
            
            if (results.length){
                exports.getTree(results[0].id, {}, function(err, tree){ //getting number of slides
                    if (err) callback(err);
                    if (tree){
                        if (tree.children.length){
                            var numberOfSlides = 0;
                            tree.children.forEach(function(child){ 
                                ifSlideThen(child, function(){
                                    numberOfSlides++;                       
                                });                    
                            });
                            results[0].numberOfSlides = numberOfSlides;
                            callback(null, results[0]);
                        }else{
                            callback('No children for deck ' + results[0].id);
                        }
                    }else{
                        callback(err);
                    }
                    
                });     
            }else{
                callback('Not found deck ' + id);
            }                   
        });
    };
    
    exports.getMetadataShort = function(id, callback){
        var sql = "SELECT id, title, created_at, language, description, footer_text, origin FROM ?? WHERE ?? = ? LIMIT 1";
        var inserts = ['deck_revision', 'id', id];
        sql = mysql.format(sql, inserts);
        
        connection.query(sql, function(err, results) {
            if (err) callback(err);
            
            if (results.length){
                callback(null, results[0]);    
            }else{
                callback('Not found deck ' + id);
            }                   
        });
    };
    
       
    exports.getAllSlides = function(rev_id, callback){
        //builds the list of all slides (ids) of the deck, including the slides from subdecks
        
        var slides = [];
        
        exports.getTree(rev_id, {}, function(err, tree){
            if (err) callback(err);
            if (tree){
                tree.children.forEach(function(child){
                    ifSlideThen(child, function(child){
                        slides.push(child.id);
                    });
                });
                callback(null, slides);
            }else{
                callback('No tree has been built for deck ' + rev_id);
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
        exports.getAllSlides(id, function(err, slides){
            if (err) callback(err);
                
            if (limit && limit+offset < slides.length){ //limit is set and doesn't exceed the number of slides
                slides.forEach(function(slide_id, index){
                    if (index+1 >= offset && index+1 <= offset + limit){ //while in the borders
                        if (onlyIDs === 'false'){ //get all metadata
                            slide.getMetadata(slide_id, function(err, metadata){
                                if (err) callback(err);
                                
                                result.slides.push(metadata);
                                if (index+2 === offset + limit){ //if reached the limit
                                    callback(null, result);
                                }
                            });
                        }else{ //get only IDs
                            result.slides.push({'id' : slide_id});
                            if (index+2 === offset + limit){ //if reached the limit
                                callback(null, result);
                            }
                        }                        
                    };
                });     
            }else{ //limit is 0 or exceed the number of slides
                slides.forEach(function(slide_id, index){
                    if (index+1 >= offset){ //while in the borders
                        if (onlyIDs === 'false'){ //get all metadata
                            slide.getMetadata(slide_id, function(err, metadata){
                                if (err) callback(err);
                                
                                result.slides.push(metadata);
                                if (index+1 === slides.length){ //if reached the limit
                                    callback(null, result);
                                }
                            });
                        }else{ //get only IDS
                            result.slides.push({'id' : slide_id});
                            if (index+1 === slides.length){ //if reached the limit
                                callback(null, result);
                            }
                        }
                    };
                });
                if (slides.length === 0){
                    callback('No slides in deck ' + id);
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
                    if (results.length) cbAsync(null, results[0].user_id);
                    else cbAsync('No contributors for deck ' + rev_id);
                });
            },
            
            function collectContributors(owner_id, cbAsync){
                var contributors = [];
                var cbs = 0;
                exports.getAllSlides(rev_id, function(err, slide_ids){ //get contributors of slides
                    if (err) cbAsync(err);
                    
                    if (slide_ids){
                        slide_ids.forEach(function(slide_id, index){
                            cbs++;
                            slide.getContributorsShort(slide_id, [], function(err, slide_contributors){
                                if (err) cbAsync(err);
                                
                                contributors = contributors.concat(slide_contributors); //merge contributors from slides
                                cbs--;
                                if (cbs === 0){
                                    cbAsync(null, owner_id, lib.arrUnique(contributors));}
                            });
                        });
                    }else{
                        cbAsync('No slides found for deck ' + rev_id);
                    }
                });
            },
            
            function enrichUsers(owner_id, slide_contributors, cbAsync){
                if (slide_contributors.length){
                    slide_contributors.forEach(function(element, index){
                        user.enrich(element, function(err, enriched){
                            if (err) cbAsync(err);
                            
                            if (enriched){
                               slide_contributors[index] = enriched; 
                            }else{
                                delete slide_contributors[index];
                            }
                            
                            if (index === slide_contributors.length - 1){
                                cbAsync(null, owner_id, slide_contributors);
                            }
                        });
                    });
                }else{
                    cbAsync('No contributors for deck ' + rev_id);
                }
            },
            
            function addDeckOwner(owner_id, slide_contributors, cbAsync){
                
                user.enrich(owner_id, function(err, enriched){
                    if (err) cbAsync(err);
                    
                    if (enriched){
                        slide_contributors.push(enriched);
                    }
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
                });
            }
        ], callback);
        
    };
    
    exports.getTags = function(rev_id, callback){
            
        var sql = 'SELECT tag FROM tag WHERE ?? = ? AND item_type = "deck"';
        var inserts = ['item_id', rev_id];
        var tags = [];
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
    
    exports.newRevision = function(deck, callback){
        var injection = {};
        injection.title = deck.title;
        injection.language = deck.language;
        injection.description = deck.description;
        injection.footer_text = deck.footer_text;
        injection.origin = deck.origin;
        injection.translated_from_revision = deck.translated_from_revision;
        injection.user_id = deck.user_id;
        injection.translation_status = deck.translation_status;
        injection.translated_from = deck.translated_from;
        injection.branch_owner = deck.branch_owner;
        injection.branch_id = deck.branch_id;
        injection.based_on = deck.based_on;
        
        var sql = "INSERT into deck_revision SET ?";
        var inserts = [injection];
        sql = mysql.format(sql, inserts);                

        connection.query(sql, function(err, qresults){

            if (err) cbAsync(err);

            deck.id = qresults.insertId;
            callback(null, deck);
        });
    };
    
    exports.new = function(deck, callback){   
        
        var injection = {};
        injection.title = deck.title;
        injection.language = deck.language;
        injection.description = deck.description;
        injection.footer_text = deck.footer_text;
        injection.origin = deck.origin;
        injection.translated_from_revision = deck.translated_from_revision;
        injection.user_id = deck.user_id;
        injection.translation_status = deck.translation_status;
        injection.translated_from = deck.translated_from;
        injection.branch_owner = deck.user_id;
        injection.branch_id = deck.branch_id;
        injection.based_on = null;

        var sql = "INSERT into deck_revision SET ?";
        var inserts = [injection];
        sql = mysql.format(sql, inserts);                
        connection.query(sql, function(err, qresults){

            if (err) cbAsync(err);
            
            deck.id = qresults.insertId;
            callback(null, deck);
        });
          
    };
    
    exports.addDirectContent = function(deck_id, children, callback){
        var injection = {};
        if (children.length){
            var i = children.length;
            children.forEach(function(child, index){
                injection.deck_revision_id = deck_id;
                injection.item_id = child.id;
                injection.item_type = child.type;
                injection.position = child.position;

                var sql = 'INSERT INTO deck_content SET ?';
                var inserts = [injection];
                sql = mysql.format(sql, inserts);
                
                connection.query(sql, function(err, results){
                    if (err) callback(err);
                    i--;
                    if (i === 0){
                        callback(null, 'done!');
                    }
                });
            });
        }else{
            callback('No children given for deck ' + deck_id);
        }
    };
    
    function getBranchId(deck_id, callback){
        var sql = "SELECT branch_id FROM ?? WHERE ?? = ? LIMIT 1";
        var inserts = ['deck_revision', 'id', deck_id];
        sql = mysql.format(sql, inserts);

        connection.query(sql, function(err, results) {
            if (err) callback(err);
            if (results.length){
                callback(null, results[0].branch_id);
            }else{
                callback('Not found deck ' + deck_id);
            }
        });
    };
        
    function translateMetadata(user_id, metadata, callback){

        async.waterfall([
                       
            function translate_title(cbAsync){                
                if (!metadata.title) {metadata.title = '';}
                googleTranslate.translate(metadata.title, metadata.source, metadata.target, function(err, translation){
                    if (translation){
                        metadata.title = translation.translatedText;
                    }  
                      
                    cbAsync(err, metadata);
                });
            },
          
            function translate_desciption(metadata, cbAsync){
                if (!metadata.description) {metadata.description = '';}
                googleTranslate.translate(metadata.description, metadata.source, metadata.target, function(err, translation){
                    if (translation){
                        metadata.description = translation.translatedText;
                    }
                    
                    cbAsync(err, metadata);
                });
            },
            function translate_footer(metadata, cbAsync){
                if (!metadata.footer_text) {metadata.footer_text = '';}
                googleTranslate.translate(metadata.footer_text, metadata.source, metadata.target, function(err, translation){
                    if (translation){
                        metadata.footer_text = translation.translatedText;
                    }                    
                    cbAsync(err, metadata);
                });
            },
            function save(metadata, cbAsync){
                
                metadata.user_id = user_id;               
                metadata.translation_status = 'in_progress';
                
                getBranchId(metadata.deck_id, function(err, branch_id){
                    if (err) cbAsync(err);
                    
                    metadata.translated_from = branch_id;
                   
                    exports.new(metadata, function(err, saved){
                        if (err) cbAsync(err);
                        
                        metadata.id = saved.id;
                        cbAsync(null, metadata);
                    });
                });                
            }
        ], callback);
    }
    
    function translateMetadataNewRevision(user_id, metadata, callback){
        
        async.waterfall([
                       
            function translate_title(cbAsync){
                
                if (!metadata.title) {metadata.title = '';}
                googleTranslate.translate(metadata.title, metadata.source, metadata.target, function(err, translation){
                    if (translation){
                        metadata.title = translation.translatedText;
                    }                    
                    cbAsync(err, metadata);
                });
            },
            
            function translate_desciption(metadata, cbAsync){
                if (!metadata.description) {metadata.description = '';}
                googleTranslate.translate(metadata.description, metadata.source, metadata.target, function(err, translation){
                    if (translation){
                        metadata.description = translation.translatedText;
                    }
                    
                    cbAsync(err, metadata);
                });
            },
            function translate_footer(metadata, cbAsync){
                if (!metadata.footer_text) {metadata.footer_text = '';}
                googleTranslate.translate(metadata.footer_text, metadata.source, metadata.target, function(err, translation){
                    if (translation){
                        metadata.footer_text = translation.translatedText;
                    }                    
                    cbAsync(err, metadata);
                });
            },
            function saveNewRevision(metadata, cbAsync){
                metadata.user_id = user_id;               
                metadata.translation_status = 'in_progress';
                exports.newRevision(metadata, function(err, saved){
                    if (err) cbAsync(err);

                    metadata.id = saved.id;
                    cbAsync(null, metadata);
                });                               
            }
        ], callback);
    }
    exports.currentMaxBranchID_slide;
    
    exports.handleTranslation = function(user_id, deck_id, target, callback){
        getMetadataForTranslation(deck_id, target, function(err, metadata){
            if (err) callback(err);
            
            getBranchId(deck_id, function(err, branch_id){
                if (err) callback(err);

                var sql = "SELECT * FROM deck_revision WHERE ?? = ? AND ?? = ? ORDER BY created_at DESC";
                var inserts = ['translated_from', branch_id, 'language', metadata.language];
                sql = mysql.format(sql, inserts);
                
                connection.query(sql, function(err, results){
                    if (err) callback(err);

                    if (results.length){
                        metadata.based_on = results[0].id;
                        metadata.translated_from = branch_id;
                        metadata.branch_id = results[0].branch_id;
                        metadata.branch_owner = results[0].branch_owner;
                        exports.translateNewRevision(user_id, metadata, callback);
                    }else{
                        metadata.branch_id = exports.currentMaxBranchID + 1;
                        exports.currentMaxBranchID++;
                        exports.translate(user_id, metadata, callback);
                    }
                });
            }); 
        });
    };
    
    exports.translateNewRevision = function(user_id, metadata, callback){
        async.waterfall([
            
            function process_translate_metadata(cbAsync){
                translateMetadataNewRevision(user_id, metadata, cbAsync);
            },
            
            function save_content(metadata, cbAsync){
                 translateContent(user_id, metadata, cbAsync);
            },
            
            function saveChildren(translated, children, cbAsync){
                exports.addDirectContent(translated.id, children, function(err, results){
                    cbAsync(err, translated);
                });
            }
        ], callback);
    };
    
    exports.translate = function(user_id, metadata, callback){  
        console.log(metadata);
        async.waterfall([
            
            function process_translate_metadata(cbAsync){
                translateMetadata(user_id, metadata, cbAsync);
            },
            
            function save_content(metadata, cbAsync){
                 translateContent(user_id, metadata, cbAsync);
            },
            
            function saveChildren(translated, children, cbAsync){
                exports.addDirectContent(translated.id, children, function(err, results){
                    cbAsync(err, translated);
                });
            }
        ], callback);
    };
    
    exports.decreaseIndexes = function(rev_id, position, callback){
        var sql = "UPDATE ?? SET position = position - 1 WHERE ?? = ? AND ?? > ?";
        var inserts = ['deck_content', 'deck_revision_id', rev_id, 'position', position];
        sql = mysql.format(sql, inserts);
        
        connection.query(sql, function(err, results) {
            
            if (err) callback(err);
            return callback(null);
        });
    };
    
    exports.increaseIndexes = function(rev_id, position, callback){
        var sql = "UPDATE deck_content SET position = position + 1 WHERE deck_revision_id = ? AND position >= ? ORDER BY position DESC";
        var inserts = [rev_id, position];
        sql = mysql.format(sql, inserts);
        
        connection.query(sql, function(err, results) {
            if (err) callback(err);
            return callback(null);
        });
    };
    
    exports.removeFromPosition = function(rev_id, position, callback){
        var sql = "DELETE FROM ?? WHERE ?? = ? AND ?? = ? LIMIT 1";
        var inserts = ['deck_content', 'deck_revision_id', rev_id,  'position', position];
        sql = mysql.format(sql, inserts);
        
        connection.query(sql, function(err, results) {
            if (err) callback(err);
            exports.decreaseIndexes(rev_id, position, function(err){
                if (err) return callback(err);
                return callback(null, true);
            });            
        });
    };
    
    exports.removeFromById = function(rev_id, item_type, item_id, callback){
        var sql = "SELECT position FROM ?? WHERE ?? = ? AND ?? = ? AND ?? = ? LIMIT 1"
        var inserts = ['deck_content', 'deck_revision_id', rev_id, 'item_type' , item_type, 'item_id', item_id];
        sql = mysql.format(sql, inserts);
        
        
        connection.query(sql, function(err, results){
            if (err) callback(err);
            if (results.length){
                var position = results[0].position;
                exports.removeFromPosition(rev_id, position, callback);
            }else{
                callback('Item ' + item_id + 'was not found in deck' + rev_id, false);
            }
        });
    };
    
    exports.insertIntoPosition = function(item, rev_id, position, callback){
        var injection = {
            deck_revision_id : rev_id,
            item_type : item.item_type,
            item_id : item.item_id,
            position : position
        };
        var sql = "INSERT INTO deck_content SET ? ";
        sql = mysql.format(sql, injection);
       
        
        exports.increaseIndexes(rev_id, position, function(err){
            if (err) return callback(err);
            connection.query(sql, function(err, results) {
                if (err) callback(err);
                return callback(null, true);
            });
        });        
    };
    
    
    exports.getItemByPosition = function(parent, position, callback){
        var sql = "SELECT item_id, item_type FROM ?? WHERE ?? = ? AND ?? = ? LIMIT 1";
        var inserts = ['deck_content', 'deck_revision_id', parent, 'position', position];
        sql = mysql.format(sql, inserts);
        connection.query(sql, function(err, results) {
            
            if (err) callback(err);
            if (results.length){
                console.log(results[0]);
                callback(null, results[0]);
            }else{
                callback('Not found item in deck ' + parent + ' at position ' + position);
            }
        });
    };
    
    exports.moveItem = function(parent, parent_position, target, target_position, callback){
        exports.getItemByPosition(parent, parent_position, function(err, item){
            if (err) callback(err);
            if (!item){
                callback('Item not found at deck ' + parent + 'at the position ' + parent_position)
            }else{
                console.log(item);
                async.waterfall([
                    function removeItem(cbAsync){
                        exports.removeFromPosition(parent, parent_position, cbAsync)
                    },
                    function insertItem(result, cbAsync){
                            exports.insertIntoPosition(item, target, target_position, cbAsync)
                    }
                ], callback);
            }
            
        });
    };
    
    exports.rename = function(id, new_title, callback){
        var sql = "UPDATE deck_revision SET title = ? WHERE ?? = ?";
        var inserts = [new_title, 'id', id];
        sql = mysql.format(sql, inserts);
        console.log(sql);
        connection.query(sql, function(err, results) {
            if (err) callback(err);
            return callback(null, true);
        });
    };


