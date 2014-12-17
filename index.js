var server = require("./server");
var dnode = require("dnode");
var server_dn = dnode({
    zing : function (n, cb) { cb(n * 10) }
});
server_dn.listen(7070);		

server.start();
