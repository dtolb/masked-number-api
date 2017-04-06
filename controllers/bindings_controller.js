const db = require('./db_controller.js');
const debug = require('debug')('masked-numbers');

module.exports.validateMessage = (req, res, next) => {
	if (req.body.numbers[0] === req.body.numbers[1]){
		var err = new Error('Can not bind a number to itself');
		err.status = 400;
		next(err);
	}
	next();
};