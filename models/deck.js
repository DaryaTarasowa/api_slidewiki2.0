var mysql = require('mysql');
var Slide = require('./slide');


function Deck(connection) {
    
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
            callback(results[0]);
        });
    };
};


module.exports = Deck;
