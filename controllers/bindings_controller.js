const db = require('./db_controller.js');
const debug = require('debug')('masked-numbers');

module.exports.validateMessage = (req, res, next) => {
	next();
};