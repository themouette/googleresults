var format = require('./format');
var fs = require('fs');
var path = require("path");

module.exports.write = function write(destDir, data, into) {
    var str = format.format(data, into);
    var id = (+new Date()).toString(36) + '.' + into.toLowerCase();
    
    fs.writeFileSync(path.join(destDir, id), str);
    
    return id;
}