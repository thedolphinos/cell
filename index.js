const {Error} = require("@thedolphinos/utility4js"); // this is imported from utility4js instead of utility4js due to node's duplicate module imports which causes reference problems during instanceof checks.

const Cell = require("./lib/core/Cell");
const Logger = require("./lib/core/Logger");
const Validator = require("./lib/core/Validator");

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

module.exports = {
  Error,

  Cell,
  Logger,
  Validator,

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
