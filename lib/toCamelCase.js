module.exports = function toCamelCase(str) {
  return str.replace(/-([a-z])/g, ($0, ch) => ch.toUpperCase());
};
