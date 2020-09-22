"use strict";

const Cell = require("./lib/core/Cell");
const DbConnectionSafe = require("./lib/safes/DbConnectionSafe");
const DbSafe = require("./lib/safes/DbSafe");
const LanguageSafe = require("./lib/safes/LanguageSafe");
const Schema = require("./lib/db/Schema");
const DbOperation = require("./lib/db/DbOperation");
const DbService = require("./lib/services/DbService");
const ApplicationService = require("./lib/services/ApplicationService");
const ControllerService = require("./lib/services/ControllerService");
const Controller = require("./lib/core/Controller");
const AuthController = require("./lib/controllers/AuthController");
const CrudController = require("./lib/controllers/CrudController");
const RouteHelper = require("./lib/helpers/RouteHelper");

module.exports = {
  Cell,

  DbSafe,
  LanguageSafe,

  Schema,
  DbOperation,

  DbService,
  ApplicationService,
  ControllerService,

  Controller,
  AuthController,
  CrudController,

  RouteHelper,

  startSession: () => DbConnectionSafe.get().mongoClient.startSession()
};
