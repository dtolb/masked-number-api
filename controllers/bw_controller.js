const Bandwidth = require("node-bandwidth");
const userId = process.env.BANDWIDTH_USER_ID;
const apiToken = process.env.BANDWIDTH_API_TOKEN;
const apiSecret = process.env.BANDWIDTH_API_SECRET;

const debug = require("debug")("masked-numbers");
let app = require("../index.js");
const areaCodes = ["919", "828", "704"];

// let applicationId = process.env.BANDWIDTH_APPLICATION_ID;

if (!userId || !apiToken || !apiSecret) {
  throw new Error(
    "Invalid or non-existing Bandwidth credentials. \n Please set your: \n * userId \n * apiToken \n * apiSecret"
  );
}

module.exports.extractEvent = (req, res, next) => {
  const isGetRequest = req.method.toLowerCase() === "get";
  const isPostRequest = req.method.toLowerCase() === "post";
  if (isGetRequest) {
    res.locals.event = req.query;
  } else if (isPostRequest) {
    res.locals.event = req.body;
  } else {
    debug("Not either a post nor get request");
    debug("Query Parameters:");
    debug(req.query);
    debug("Body Parameters:");
    debug(req.body);
    throw new Error('Not a GET or POST request');
  }
  next();
};

const bwApi = new Bandwidth({
  userId: userId,
  apiToken: apiToken,
  apiSecret: apiSecret
});

module.exports.getNewNumber = async (req, res, next) => {
  debug("Searching for new binding number");
  // Order number from bandwidth
  const numbers = await bwApi.AvailableNumber.searchAndOrder("local", {
    areaCode: areaCodes[Math.floor(Math.random() * myArray.length)],
    quantity: 1
  })
  debug(numbers);
  // Make number name the two numbers binded
  const numberName = req.body.numbers;
  const newNumber = numbers[0].number;
  debug("Found New Number: " + newNumber + " for: " + numberName);
  // Need number id to update
  const numberId = numbers[0].id;
  // Assign number to application
  debug("Updating Number to application: " + app.applicationId);
  await bwApi.PhoneNumber.update(numberId, {
    name: numberName.toString(),
    applicationId: app.applicationId
  });
  debug("Assigned number: " + newNumber + " to application");
  req.newNumber = newNumber;
  next();
};

module.exports.checkEvent = (req, res, next) => {
  debug("Checking event type");
  const eventType = req.body.event.eventType;
  debug(eventType);
  if (eventType === "answer") {
    next();
  } else {
    debug("Don't care about this event");
    return;
  }
};

module.exports.transferCall = (req, res, next) => {
  const callId = res.locals.event.callId;
  const bxml = new Bandwidth.BXMLResponse();
  if (req.bindingExists) {
		/** Build the BXML
		* <Response>
		* <Transfer transferTo={req.transferTo} transferCallerId={req.transferCallerId}>
		* 	<Record multiChannel=true/>
		* </Transfer>
		* </Response>
		**/
    bxml.transfer({
      transferTo: req.transferTo,
      transferCallerId: req.transferCallerId
    }, function () {
      this.record({
        multiChannel: true
      });
    });
  }
  else {
		/** Build the BXML
		* <Response>
		* <Hangup/>
		* </Response>
		**/
    bxml.hangup();
  }
  debug(bxml.toString());
  res.send(bxml.toString());
};

module.exports.makeMessage = (req, res, next) => {
  debug("Making Message to send");
  let message = {
    from: res.locals.event.to
  };
  if (req.bindingExists) {
    message.to = req.pairedNumber;
    message.text = res.locals.event.text;
  } else {
    message.to = res.locals.event.from;
    message.text = "Sorry, there is no none association with this number";
  }
  req.message = message;
  next();
};

module.exports.sendMessage = (req, res, next) => {
  debug("Sending message");
  debug(req.message);
  bwApi.Message.send(req.message)
    .then(message => {
      req.sentMessage = message;
      debug("Message Sent");
      debug(message);
    })
    .catch(reason => {
      debug(reason);
    });
};

/**
 * Below here is setup logic. This is only run once per instance of this application
 * The main use of the logic below is for one click deployments. Most likely,
 * you would NOT need this in a production envirnonment.
 *
 * This handles the oddness of heroku sleep and not knowing the heroku url until
 * deploying.
 */

//Checks the current Applications to see if we have one.
module.exports.checkOrCreateApplication = (req, res, next) => {
  if (app.applicationId) {
    next();
    return;
  }
  app.callbackUrl = getBaseUrlFromReq(req);
  const appName = app.rootName + " on " + app.callbackUrl;
  debug("appName: " + appName);
  bwApi.Application.list({
    size: 1000
  })
    .then(apps => {
      const appId = searchForApplication(apps.applications, appName);
      if (appId !== false) {
        debug("Application Found: " + appId);
        app.applicationId = appId;
        next();
      } else {
        debug("No Application Found");
        newApplication(appName, app.callbackUrl).then(application => {
          debug("Created Application: " + application.id);
          app.applicationId = application.id;
          next();
        });
      }
    })
    .catch(reason => {
      debug(reason);
      next(reason);
    });
};

// Searches for applicatoin by name
const searchForApplication = (applications, name) => {
  for (var i = 0; i < applications.length; i += 1) {
    if (applications[i].name === name) {
      return applications[i].id;
    }
  }
  return false;
};

// Creates a new application with callbacks set to this server
const newApplication = (appName, url) => {
  return bwApi.Application.create({
    name: appName,
    incomingMessageUrl: url + "/bandwidth/messages",
    incomingCallUrl: url + "/bandwidth/calls",
    callbackHttpMethod: "post",
    autoAnswer: true
  });
};

const getBaseUrlFromReq = req => {
  return "http://" + req.hostname;
};
