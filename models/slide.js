var mysql = require('mysql');
var Library = require('./library');
var lib = new Library();


// Constructor
function Slide(connection) {
    
    this.getTitle = function(rev_id, callback){
        //gets the title either from title field or parsing the content, returns the cb(title)
        
        var sql = "SELECT title FROM ?? WHERE ?? = ? LIMIT 1";
        var inserts = ['slide_revision', 'id', rev_id];
        sql = mysql.format(sql, inserts);
        connection.query(sql, function(err, results) {
            if (err) throw err;
                
            if (results[0].title){
                callback(results[0].title);
            }else{
                var slide = new Slide(connection);
                slide.getContent(rev_id, function(content){
                    slide.setTitleFromContent(rev_id, content, function(title){
                        callback(title);
                    });
                });
            };                
        });
    };
    
    this.getContent = function(rev_id, callback){
        //gets the content of a slide, returns the cb of content
        
        var sql = "SELECT content FROM ?? WHERE ?? = ? LIMIT 1";
        var inserts = ['slide_revision', 'id', rev_id];
        sql = mysql.format(sql, inserts);
        connection.query(sql, function(err, results) {
            if (err) throw err;
            callback(results[0].content);                
        });        
    };    
    
    this.setTitleFromContent = function(rev_id, content, callback){
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
                    if (err) throw err;

                    var inserts_content = ['slide_revision', content, 'id', rev_id]; //remove title from content
                        sql_content = mysql.format(sql_content, inserts_content);
                        connection.query(sql_content, function(err, results) {
                            if (err) throw err;
                    
                            callback(title);
                    });                    
            }); 
        }else{ //no title is set in the content or empty title
            var inserts = ['slide_revision', 'Untitled', 'id', rev_id];
            sql = mysql.format(sql, inserts);
            connection.query(sql, function(err, results) {
                if (err) throw err;

                callback('Untitled');
            }); 
        }        
    };
    
    this.getContributors = function(rev_id, contributors, callback){
        //TODO: the user having different roles should be filtered?
        //TODO: translators
        var sql = 'SELECT users.id AS id, users.username AS username, users.picture AS avatar, slide_revision.based_on AS based_on FROM slide_revision INNER JOIN users ON(slide_revision.user_id=users.id) WHERE ?? = ? LIMIT 1';
        var inserts = ['slide_revision.id', rev_id];
        sql = mysql.format(sql, inserts);
        connection.query(sql,function(err,results){
            if (err) throw err;
            
            var slide = new Slide(connection);
            var based_on = results[0].based_on;
            delete results[0].based_on;
            if (based_on){      //this is not the first revision                 
                results[0].role = 'contributor';                
                contributors.push(results[0]);                    
                slide.getContributors(based_on, contributors, function(result){
                    callback(result);
                });                                                              
            }else{                
                results[0].role = 'creator';
                contributors.push(results[0]);                
                contributors = lib.arrUnique(contributors);                          
                callback(contributors);
            }            
        });
    };
    
    this.getTags = function(rev_id, callback){
            
        var sql = 'SELECT tag FROM tag WHERE ?? = ? AND item_type = "slide"';
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
    
    this.setAllTitles = function(callback){
        //sets all titles in the database parsing the content, returns the set of all titles
        
        var result = [];
        var sql = "SELECT id FROM ?? WHERE 1";
        var inserts = ['slide_revision'];
        var slide = new Slide(connection);
        sql = mysql.format(sql, inserts);
        connection.query(sql, function(err, results){
            if (err) throw err;
            
            results.forEach(function(element){   //results = all ids of the slides   
                slide.getTitle(element.id, function(title){ //for each id call the getTitle
                    result.push(title);
                    if (result.length === results.length){
                        callback(result);
                    }                    
                });
            });
        });
    };
    
    this.getMetadata = function(id, callback){
        //gets metadata of a slide
        
        var sql = "SELECT id, timestamp AS created_at, content AS body FROM ?? WHERE ?? = ? LIMIT 1";
        var inserts = ['slide_revision', 'id', id];
        sql = mysql.format(sql, inserts);
        connection.query(sql, function(err, results) {
            if (err) throw err;
            
            var slide = new Slide(connection);
            slide.getTitle(id, function(title){
                results[0].title = title;
                callback(results[0]);
            });       
            
        });
    };
}

module.exports = Slide;
