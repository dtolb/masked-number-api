const debug = require('debug')('masked-numbers');

let db = {};

const arraysEqual = (arr1, arr2) => {
    if(arr1.length !== arr2.length)
        return false;
    for(var i = arr1.length; i--;) {
        if(arr1[i] !== arr2[i])
            return false;
    }
    return true;
};

module.exports.checkIfBindingExists = (req, res, next) => {
	debug('Checking for binding');
	const numbers = req.body.numbers;
	let numbersAlreadyBound = false;
	for (let binding in db) {
		if (arraysEqual(db[binding], numbers)) {
			numbersAlreadyBound = true;
			break;
		}
	}
	if (numbersAlreadyBound) {
		const errMessage = 'Numbers: ' + req.body.numbers[0] + ' and ' +
			req.body.numbers[1] + ' are already bound';
		debug(errMessage);
		let err = new Error(errMessage);
		err.status = 409;
		next(err);
	}
	else {
		debug('Numbers: ' + req.body.numbers[0] + ' and ' + req.body.numbers[1] +
			' are not bound');
		next();
	}
};

module.exports.saveBinding = (req, res, next) => {
	debug('Saving new Binding');
	const newNumber = req.newNumber;
	const numbers = req.body.numbers;
	db[newNumber] = numbers;
	debug('New binding saved as: ' + newNumber);
	resBody = {
		maskedNumber: newNumber,
		numbers: numbers
	}
	res.status('201').send(resBody);
};

module.exports.findNumbers = (req, res, next) => {
	debug('Finding number bindings');
	const key = req.body.to;
	const from = req.body.from;
	const bindingExists = (db.hasOwnProperty(key));
	req.bindingExists = bindingExists;
	if (bindingExists){
		//deep copy here :)
		let numbers = JSON.parse(JSON.stringify(db[key]));
		const index = numbers.indexOf(from);
		if (index !== -1) {
    		numbers.splice(index, 1);
    		req.pairedNumber = numbers[0];
		}
		else {
			req.bindingExists = false;
		}
	}
	next();
}

module.exports.listBindings = (req, res, next) => {
	debug('Returning Bindings');
	debug(db);
	res.status(200).send(db);
}