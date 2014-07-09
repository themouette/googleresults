module.exports.format = function (data, into) {
    into = (into || '').toLowerCase();
    switch(into) {
        case "csv":
            return formatCsv(data);
        case "json":
        default:
            return formatJson(data);
    }
}

function formatJson(data) {
    return JSON.stringify(data);
}

function formatCsv(data) {
    function formatLine (item) {
        return Object.keys(item)
                .map(function (key) {
                    return item[key];
                })
                .join(';');
    }
    
    var results = [];
    Array.prototype.forEach.call(data, function (item, index) {
        results.push(formatLine(item));
    });
    
    return results.join("\n");
}

module.exports.formatJson = formatJson;
module.exports.formatCsv = formatCsv;