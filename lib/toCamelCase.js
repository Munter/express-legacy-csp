module.exports = function toCamelCase(str) {
    return str.replace(/-([a-z])/g, function ($0, ch) {
        return ch.toUpperCase();
    });
};
