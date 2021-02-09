const Error = require("@thedolphinos/error4js"); // this is imported due to node's duplicate module imports which causes reference problems during instanceof checks.

const Cell = require("./lib/core/Cell");
const Logger = require("./lib/core/Logger");
const Validator = require("./lib/core/Validator");
const Injector = require("./lib/core/Injector");
const Safe = require("./lib/core/Safe");

const DbSafe = require("./lib/safes/DbSafe");
const LanguageSafe = require("./lib/safes/LanguageSafe");

const SessionManager = require("./lib/db/SessionManager");
const Schema = require("./lib/db/Schema");
const DbOperation = require("./lib/db/DbOperation");

const DbService = require("./lib/services/DbService");
const ApplicationService = require("./lib/services/ApplicationService");
const ControllerService = require("./lib/services/ControllerService");

const Controller = require("./lib/core/Controller");
const AuthController = require("./lib/controllers/AuthController");
const CrudController = require("./lib/controllers/CrudController");

const RouteHelper = require("./lib/helpers/RouteHelper");
const ERROR_DATA = require("./lib/helpers/ERROR_DATA.json");

module.exports = {
  Error,
  ErrorData: {
    ...Error.DATA,
    ...ERROR_DATA
  },

  Cell,
  Logger,
  Validator,
  Injector,
  Safe,

  DbSafe,
  LanguageSafe,

  SessionManager,
  Schema,
  DbOperation,

  DbService,
  ApplicationService,
  ControllerService,

  Controller,
  AuthController,
  CrudController,

  RouteHelper
};
