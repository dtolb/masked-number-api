const Bandwidth = require("node-bandwidth");
const userId = process.env.BANDWIDTH_USER_ID;
const apiToken = process.env.BANDWIDTH_API_TOKEN;
const apiSecret = process.env.BANDWIDTH_API_SECRET;

const debug = require("debug")("masked-numbers");
let app = require("../index.js");
const areaCodes = ["919", "415"];

// let applicationId = process.env.BANDWIDTH_APPLICATION_ID;

if (!userId || !apiToken || !apiSecret) {
  throw new Error(
    "Invalid or non-existing Bandwidth credentials. \n Please set your: \n * userId \n * apiToken \n * apiSecret"
  );
}

const bwApi = new Bandwidth({
  userId: userId,
  apiToken: apiToken,
  apiSecret: apiSecret
});

module.exports.getNewNumber = (req, res, next) => {
  debug("Searching for new binding number");
  // Order number from bandwidth
  let newNumber = "";
  bwApi.AvailableNumber.searchAndOrder("local", {
    areaCode: areaCodes[0],
    quantity: 1
  })
    .then(numbers => {
      debug(numbers);
      // Make number name the two numbers binded
      const numberName = req.body.numbers;
      newNumber = numbers[0].number;
      debug("Found New Number: " + newNumber + " for: " + numberName);
      // Need number id to update
      const numberId = numbers[0].id;
      // Assign number to application
      debug("Updating Number to application: " + app.applicationId);
      return bwApi.PhoneNumber.update(numberId, {
        name: numberName.toString(),
        applicationId: app.applicationId
      });
    })
    .then(() => {
      debug("Assigned number: " + newNumber + " to application");
      req.newNumber = newNumber;
      next();
    })
    .catch(reason => {
      debug(reason);
      next(reason);
    });
};

module.exports.validateMessage = (req, res, next) => {
  debug("Validating new message");
  debug(req.body);
  res.sendStatus(200);
  next();
};

module.exports.validateCall = (req, res, next) => {
  debug("Validating new call");
  debug(req.body);
  res.sendStatus(200);
  next();
};

module.exports.checkEvent = (req, res, next) => {
  debug("Checking event type");
  const eventType = req.body.eventType;
  debug(eventType);
  if (eventType === "answer") {
    next();
  } else {
    debug("Don't care about this event");
    return;
  }
};

module.exports.transferCall = (req, res, next) => {
  const callId = req.body.callId;
  if (req.bindingExists) {
    const transfer = {
      transferTo: req.pairedNumber,
      transferCallerId: req.body.to
    };
    bwApi.Call.transfer(callId, transfer)
      .then(transferId => {
        debug("Call Transfered! TransferId: " + transferId);
        return;
      })
      .catch(reason => {
        debug(reason);
      });
  } else {
    bwApi.Call.hangup(callId)
      .then(() => {
        debug("Call binding incorrect");
      })
      .catch(reason => {
        debug(reason);
      });
  }
};

module.exports.makeMessage = (req, res, next) => {
  debug("Making Message to send");
  let message = {
    from: req.body.to
  };
  if (req.bindingExists) {
    message.to = req.pairedNumber;
    message.text = req.body.text;
  } else {
    message.to = req.body.from;
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
