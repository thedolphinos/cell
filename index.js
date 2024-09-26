const Error = require("@thedolphinos/error4js"); // this is imported due to node's duplicate module imports which causes reference problems during instanceof checks.
const Validator = require("./src/helpers/Validator");

const Cell = require("./src/core/Cell");
const Logger = require("./src/core/Logger");
const Safe = require("./src/core/Safe");
const DbSafe = require("./src/safes/DbSafe");
const LanguageSafe = require("./src/safes/LanguageSafe");
const Injector = require("./src/core/Injector");

const BsonType = require("./src/db/BsonType");
const Schema = require("./src/db/Schema");
const DbOperation = require("./src/db/DbOperation");
const SessionManager = require("./src/db/SessionManager");
const DbService = require("./src/services/DbService");
const ApplicationService = require("./src/services/ApplicationService");
const ControllerService = require("./src/services/ControllerService");

const DataType = require("./src/core/DataType.json");
const Controller = require("./src/core/Controller");
const AuthController = require("./src/controllers/AuthController");
const CrudController = require("./src/controllers/CrudController");
const Router = require("./src/core/Router");

module.exports = {
    Error,

    Cell,
    Logger,
    Safe,
    DbSafe,
    LanguageSafe,
    Injector,

    BsonType,
    Schema,
    DbOperation,
    SessionManager,
    DbService,
    ApplicationService,
    ControllerService,

    DataType,
    Controller,
    AuthController,
    CrudController,
    Router,

    Validator
};
