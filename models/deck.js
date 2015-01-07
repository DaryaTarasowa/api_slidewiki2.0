var mysql = require('mysql');
var Slide = require('./slide');
var Library = require('./library');
var lib = new Library();

function Deck(connection) {
    
    //high-order fundtions
    
    this.ifSlideThen = function(child, callback){
        //parsing the tree, on slide - doing callback, on deck - getting deeper
        
        var deck = new Deck(connection);
        if (child.type === 'slide'){
            callback(child);
        }else{            
            child.children.forEach(function(child_child){                
                deck.ifSlideThen(child_child, callback);
            });
        }
    };
    
    
    //methods
    
    this.getChildren = function(id, callback){
        var sql = "SELECT item_id AS id, item_type AS type, position FROM ?? WHERE ?? = ? ORDER BY position";
        var inserts = ['deck_content', 'deck_revision_id', id];
        sql = mysql.format(sql, inserts);
        connection.query(sql, function(err, results) {
            if (err) throw err;
            callback(results);
        });	
    };
        
    this.getTitle = function(rev_id, callback){
        var sql = "SELECT title FROM ?? WHERE ?? = ?";
        var inserts = ['deck_revision', 'id', rev_id];
        sql = mysql.format(sql, inserts);
            connection.query(sql, function(err, results) {
                if (err) throw err;

                callback(results[0].title);
            }); 
        };
        
    
    this.getTree = function(id, acc, callback) {
        //tail recursion which builds the deck tree, accumulating in acc
        
        var deck = new Deck(connection);
        var new_slide = new Slide(connection);
        deck.getTitle(id, function (title_str) {
            acc.title = title_str;
            acc.id = id;
            acc.type = 'deck';
            acc.children = [];
            //acc.numberOfSlides = 0;
            deck.getChildren(acc.id, function(children){//get direct children
                children.forEach(function(child){
                    if (child.type === 'deck'){
                        deck.getTree(child.id, child, function(child_child){//get the tree for a child
                            acc.children[child_child.position - 1] = child_child;
                            var size = acc.children.filter(function(value) { return value !== null }).length;
                            if (size === children.length){
                                callback(acc);
                            }
                        });                            
                    }
                    else{ 
                        new_slide.getTitle(child.id, function(title_str){
                            child.title = title_str;
                            acc.children[child.position - 1] = child;
                            var size = acc.children.filter(function(value) { return value !== null }).length;
                            if(size === children.length) {
                                callback(acc);
                            }
                        });                            
                    }
                });                    
            });
        });
    };
    
    this.getMetadata = function(id, callback){
        var sql = "SELECT id, title, timestamp AS created_at, abstract AS description FROM ?? WHERE ?? = ? LIMIT 1";
        var inserts = ['deck_revision', 'id', id];
        sql = mysql.format(sql, inserts);
        
        connection.query(sql, function(err, results) {
            if (err) throw err;
            
            var deck = new Deck(connection);
            deck.getTree(results[0].id, {}, function(tree){
                var numberOfSlides = 0;
                tree.children.forEach(function(child){ 
                    deck.ifSlideThen(child, function(){
                        numberOfSlides++;                       
                    });                    
                });
                results[0].numberOfSlides = numberOfSlides;
                callback(results[0]);
            });            
        });
    };
    
       
    this.getAllSlides = function(rev_id, callback){
        //tail recursion which builds the list of all slides (ids) of the deck, including the slides from subdecks
        var slides = [];
        var deck = new Deck(connection);
        deck.getTree(rev_id, {}, function(tree){
            tree.children.forEach(function(child){
                deck.ifSlideThen(child, function(child){
                    slides.push(child.id);
                });
            });
            callback(slides);
        });
    };
    
    this.getSlides = function(id, offset, limit, callback){
        var deck = new Deck(connection);
        var result = {};
        result.id = id;
        result.offset = offset;
        result.limit = limit;
        result.slides = [];
        offset = parseInt(offset);
        limit = parseInt(limit);
        deck.getAllSlides(id, function(slides){
            slides.forEach(function(slide_id, index){
                if (index+1 >= offset && index+1 <= offset + limit){ //while in the borders
                    var new_slide = new Slide(connection);
                    new_slide.id = slide_id;
                    new_slide.getMetadata(slide_id, function(metadata){
                        result.slides.push(metadata);
                        if (index+2 === offset + limit){ //if reached the limit
                            callback(result);
                        }
                    });
                };
            });            
        });
    };
    
    this.getContributors = function(rev_id, callback){
        //TODO: the user having different roles should be filtered?
        //TODO: translators
        var deck = new Deck(connection);
        var contributors = [];
        var cbs = 0;
        var sql = 'SELECT users.id AS id, users.username AS username, users.picture AS avatar FROM deck_revision INNER JOIN users ON(deck_revision.user_id=users.id) WHERE ?? = ? LIMIT 1';
        var inserts = ['deck_revision.id', rev_id];
        sql = mysql.format(sql, inserts);
        
        deck.getAllSlides(rev_id, function(slide_ids){ //get contributors of slides
            slide_ids.forEach(function(slide_id){
                cbs++;
                var new_slide = new Slide(connection);
                new_slide.getContributors(slide_id, [], function(slide_contributors){
                    contributors = contributors.concat(slide_contributors); //merge contributors from slides
                    cbs--;
                    if (cbs === 0){
                        contributors = lib.arrUnique(contributors); //unique
                        contributors.forEach(function(user, index){
                            contributors[index].role = 'contributor'; //change roles from slides to contributors
                        });
                        connection.query(sql,function(err,results){ //add deck_revision creator
                            if (err) throw err;

                            results[0].role = 'creator';
                            contributors.push(results[0]);
                            callback(lib.arrUnique(contributors));
                        });
                    };
                });                
            });            
        });
    };
    
    this.getTags = function(rev_id, callback){
            
        var sql = 'SELECT tag FROM tag WHERE ?? = ? AND item_type = "deck"';
        var inserts = ['item_id', rev_id];
        var tags = [];
        sql = mysql.format(sql, inserts);
        connection.query(sql,function(err,results){
            if (err) throw err;
            
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

};


module.exports = Deck;
