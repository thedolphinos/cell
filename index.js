const Error = require("@thedolphinos/error4js"); // this is imported due to node's duplicate module imports which causes reference problems during instanceof checks.

const Cell = require("./lib/core/Cell");
const Logger = require("./lib/core/Logger");
const Safe = require("./lib/core/Safe");
const DbSafe = require("./lib/safes/DbSafe");
const LanguageSafe = require("./lib/safes/LanguageSafe");
const Injector = require("./lib/core/Injector");

const Schema = require("./lib/db/Schema");
const DbOperation = require("./lib/db/DbOperation");
const SessionManager = require("./lib/db/SessionManager");
const DbService = require("./lib/services/DbService");
const ApplicationService = require("./lib/services/ApplicationService");
const ControllerService = require("./lib/services/ControllerService");

const Controller = require("./lib/core/Controller");
const AuthController = require("./lib/controllers/AuthController");
const CrudController = require("./lib/controllers/CrudController");
const Router = require("./lib/core/Router");

module.exports = {
  Error,

  Cell,
  Logger,
  Safe,
  DbSafe,
  LanguageSafe,
  Injector,

  Schema,
  DbOperation,
  SessionManager,
  DbService,
  ApplicationService,
  ControllerService,

  Controller,
  AuthController,
  CrudController,
  Router
};
