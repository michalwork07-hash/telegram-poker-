const noop = () => {};
const logger = { debug: noop, info: noop, warn: noop, error: console.error };
module.exports = { getLogger: () => logger };
