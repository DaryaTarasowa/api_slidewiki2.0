var mysql = require('mysql');


    
exports.port = process.env.PORT || 8080;

exports.connection = mysql.createConnection({
            host            : 'localhost',
            database        : 'slidewiki',
            user            : 'root',
            password        : 'root'
});



