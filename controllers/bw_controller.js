const Bandwidth = require('node-bandwidth');

const userId = process.env.BANDWIDTH_USER_ID;
const apiToken = process.env.BANDWIDTH_API_TOKEN;
const apiSecret = process.env.BANDWIDTH_API_SECRET;
const applicationId = process.env.BANDWIDTH_APPLICATION_ID;
const debug = require('debug')(masked-numbers);
const areaCodes = ['919', '415']

if (!userId || !apiToken || !apiSecret ) {
  throw new Error('Invalid or non-existing Bandwidth credentials. \Please set your: \n * userId \n * apiToken \n * apiSecret');
}

const bwApi = new Bandwidth({
  userId    : userId,
  apiToken  : apiToken,
  apiSecret : apiSecret
});

module.exports.getNewNumber = (req, res, next) => {
	debug('Searching for new binding number');
	// Order number from bandwidth
	let newNumber = '';
	bwApi.AvailableNumber.searchAndOrder('local', {
		areaCode : areaCodes[0]
		quantity : 1
	})
	.then((numbers) => {
		// Make number name the two numbers binded
		const numberName = req.body.numbers;
		newNumber = numbers[0].number;
		debug('Found New Number: ' + newNumber + ' for: ' + numberName);
		// Need number id to update
		const numberId = numbers[0].id;
		// Assign number to application
		return bwApi.PhoneNumber.update(numberId, {
			name: numberName,
			applicationId: applicationId
		});
	})
	.then( () => {
		debug('Assigned number: ' + newNumber + ' to application');
		req.newNumber = newNumber;
		next();
	})
	.catch( (reason) => {
		debug(reason);
		next(reason);
	});
};

module.exports.validateMessage = (req, res, next) => {
	debug('Validating new message');
	debug(req.body);
	res.sendStatus(200);
	next();
};

module.exports.validateCall = (req, res, next) => {
	debug('Validating new call');
	debug(req.body);
	res.sendStatus(200);
	next();
};

module.exports.checkEvent = (req, res, next) => {
	debug('Checking event type');
	const eventType = req.body.eventType;
	debug(eventType);
	if (eventType === 'answer') {
		next();
	}
	else {
		debug('Don\'t care about this event');
		return;
	}
};

module.exports.transferCall = (req, res, next) => {
	const callId = req.body.callId
	if (req.bindingExists) {
		const transfer = {
			transferTo: req.pairedNumber,
			transferCallerId: req.body.to
		};
		bwApi.Call.transfer(callId, transfer)
		.then( (transerId) => {
			debug('Call Transfered! TransferId: ' + transferId);
			return
		})
		.catch( (reason) => {
			debug(reason);
		});
	}
	else {
		bw.Call.hangup(callId)
		.then( () => {
			debug('Call binding incorrect');
		})
		.catch( (reason) => {
			debug(reason);
		})
	}
}

module.exports.makeMessage = (req, res, next) => {
	debug('Making Message to send');
	let message = {
		from: req.body.to
	};
	if (req.bindingExists){
		message.to = req.pairedNumber;
		message.text = req.body.text;
	}
	else {
		message.to = req.body.from;
		message.text = 'Sorry, there is no none association with this number';
	}
	req.message = message;
	next();
};

module.exports.sendMessage = (req, res, next) => {
	debug('Sending message');
	debug(req.message);
	bwApi.Message.send(req.message)
	.then((message) => {
		req.sentMessage = message;
		debug('Message Sent');
		debug(message);
	})
	.catch( (reason) => {
		debug(reason);
	});
};