var _ = require('underscore');


    
    exports.strip_tags = function(input, allowed) {// remove all tags from a string, except those in allowed (e.g. strip_tags(str, '<i><b>'))
        allowed = (((allowed || '') + '')
        .toLowerCase()
        .match(/<[a-z][a-z0-9]*>/g) || [])
        .join(''); // making sure the allowed arg is a string containing only tags in lowercase (<a><b><c>)
        var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi,
        commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;
        return input.replace(commentsAndPhpTags, '')
        .replace(tags, function ($0, $1) {
            return allowed.indexOf('<' + $1.toLowerCase() + '>') > -1 ? $0 : '';
        });
    }; 
    
    exports.sortByKey = function (array, key) {
        return array.sort(function(a, b) {
            var x = a[key]; var y = b[key];
            return ((x < y) ? -1 : ((x > y) ? 1 : 0));
        });
    };
    
	

    exports.arrUnique = function(arr) {
        var cleaned = [];
        arr.forEach(function(itm) {
            var unique = true;
            cleaned.forEach(function(itm2) {
                if (JSON.stringify(itm) === JSON.stringify(itm2)) unique = false;
            });
            if (unique)  cleaned.push(itm);
        });
        return cleaned;
    };

    

