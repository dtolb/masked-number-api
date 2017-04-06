const Bandwidth = require('node-bandwidth');
const bodyParser = require('body-parser');
const name = 'masked-numbers';
const debug = require('debug')(masked-numbers);
debug('booting %s', name);


const express = require('express');
let app = express();

function startServer() {
	debug('Starting Server');
	app.use(bodyParser.json());
	app.use('/bandwidth/', require('./routes/bandwidth.js'));
	app.use('/v1/bindings', require('./routes/bindings.js'));
	/// catch 404 and forward to error handler
	app.use(function (req, res, next) {
		//debug(req)
		debug(req.body)
		debug(req.url)
		var err = new Error('not found');
		err.status = 404;
		res.sendStatus(404, 'Not Found')
	});

	// production error handler, no stacktraces leaked to user
	app.use(function (err, req, res, next) {
		res.status(err.status || 500);
		debug(err);
		if (typeof(err.status) === 'undefined') {
			res.send({
				status: 'error',
				error: 'service error'
			});
		} else {
			res.send({
				status: 'error',
				error: err.message
			});
		}
	});

	const port = process.env.PORT || 3000;
	app.listen(port, process.env.HOST || "0.0.0.0", function () {
		console.log('Masked Numbers listening on port ' + port);
	});
}

startServer();