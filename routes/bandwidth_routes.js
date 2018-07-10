const express = require("express");
let router = (module.exports = express.Router());
const bw = require("../controllers/bw_controller.js");
const db = require("../controllers/db_controller.js");
const debug = require("debug")("masked-numbers");

router
  .route("/messages")
  .get(bw.extractEvent, db.findNumbers, bw.makeMessage, bw.sendMessage);

router
  .route("/calls")
  .get(bw.extractEvent, bw.checkEvent, db.findNumbers, bw.transferCall);
