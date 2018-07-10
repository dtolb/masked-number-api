const debug = require("debug")("masked-numbers");
const _ = require("underscore");
var sequelize = require("./../models/index").sequelize;
let app = require("./../index");

let Binding = app.get("models").Binding;
let db = {};

const arraysEqual = (arr1, arr2) => {
  arr1.sort();
  arr2.sort();
  return _.isEqual(arr1, arr2);
};

module.exports.checkIfBindingExists = (req, res, next) => {
  debug("Checking for binding");
  debug(req.body);
  const numbers = req.body.numbers;
  let numbersAlreadyBound = false;
  Binding.findOne({
    where: {
      $or: [
        {
          $and: {
            numberOne: numbers[0],
            numberTwo: numbers[1]
          }
        },
        {
          $and: {
            numberOne: numbers[1],
            numberTwo: numbers[0]
          }
        }
      ]
    }
  }).then(binding => {
    if (binding) {
      numbersAlreadyBound = true;
      const errMessage =
        "Numbers: " +
        req.body.numbers[0] +
        " and " +
        req.body.numbers[1] +
        " are already bound to: " +
        binding.maskedNumber;
      debug(errMessage);
      let err = new Error(errMessage);
      err.status = 409;
      next(err);
    } else {
      debug(
        "Numbers: " +
          req.body.numbers[0] +
          " and " +
          req.body.numbers[1] +
          " are not bound"
      );
      next();
    }
  });
};

module.exports.saveBinding = (req, res, next) => {
  debug("Saving new Binding");
  const newNumber = req.newNumber;
  const numbers = req.body.numbers;
  Binding.create({
    maskedNumber: req.newNumber,
    numberOne: req.body.numbers[0],
    numberTwo: req.body.numbers[1]
  })
    .then(binding => {
      debug("New binding saved as: " + newNumber);
      resBody = {
        maskedNumber: newNumber,
        numbers: numbers
      };
      res.status("201").send(resBody);
    })
    .catch(reason => {
      debug(reason);
      const err = new Error("Couldn't save to database");
      err.status = 500;
      next(err);
    });
};

module.exports.findNumbers = (req, res, next) => {
  debug("Finding number bindings");
  const maskedNumber = res.locals.event.to;
  const fromNumber = res.locals.event.from;
  Binding.find({
    where: {
      maskedNumber: maskedNumber
    }
  })
    .then(binding => {
      if (binding) {
        if (binding.numberOne === fromNumber) {
          req.bindingExists = true;
          req.pairedNumber = binding.numberTwo;
        } else if (binding.numberTwo === fromNumber) {
          req.bindingExists = true;
          req.pairedNumber = binding.numberOne;
        } else {
          req.bindingExists = false;
        }
      } else {
        req.bindingExists = false;
      }
      next();
    })
    .catch(reason => {
      debug(reason);
      let err = new Error("Couldn't find masked number in database");
      next(err);
    });
};

module.exports.listBindings = (req, res, next) => {
  debug("Returning Bindings");
  Binding.findAll()
    .then(bindings => {
      res.status(200).send(bindings);
    })
    .catch(reason => {
      debug(reason);
      let err = new Error("Couldn't fetch from database");
      next(err);
    });
};
