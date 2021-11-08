const {
  StaticClassInstantiationError,
  DATA: ERROR_DATA_OF_ERROR4JS
} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");

const express = require("express");

const Logger = require("./Logger");
const ErrorSafe = require("../safes/ErrorSafe");
const DbConnectionSafe = require("../safes/DbConnectionSafe");
const Interceptor = require("./Interceptor");
const Server = require("./Server");
const DbConnection = require("../db/DbConnection");
const Validator = require("../helpers/Validator");
const ERROR_DATA_OF_CELL = require("../helpers/ERROR_DATA.json");

/**
 * The initiation point of the framework.
 */
class Cell
{
  /**
   * Static classes must not be instantiated.
   */
  constructor ()
  {
    throw new StaticClassInstantiationError("Cell");
  }

  /**
   * Starts the application.
   *
   * @param {Object} [config] - Where you can manage servers, DBs, interceptors, and error.
   * @param {Object} [config.server] - Where you can manage servers. You don't have to define it, if you don't want the application to serve.
   * @param {boolean} config.server.isEnabled - Allows enabling/disabling both HTTP and HTTPS servers.
   * @param {Object} [config.server.options] - Container for HTTP and HTTPS servers. You don't have to define it, if `config.server.isEnabled` is false.
   * @param {Object} config.server.options.http - Container for HTTP server.
   * @param {boolean} config.server.options.http.isEnabled - Allows enabling/disabling HTTP server.
   * @param {Object} [config.server.options.http.config] - Container for HTTP server configurations. You don't have to define it, if `config.server.options.http.isEnabled` is false.
   * @param {number} config.server.options.http.config.port - Represents port number of HTTP server.
   * @param {Object} config.server.options.https - Container for HTTPS server.
   * @param {boolean} config.server.options.https.isEnabled - Allows enabling/disabling HTTPS server.
   * @param {Object} [config.server.options.https.config] - Container for HTTPS server configurations. You don't have to define it, if `config.server.options.https.isEnabled` is false.
   * @param {number} config.server.options.https.config.port - Represents port number of HTTPS server.
   * @param {Object} config.server.options.https.config.sslTlsCertificate - Container for SSL/TLS certificate.
   * @param {string} config.server.options.https.config.sslTlsCertificate.key - Represent the path of the private key of the SSL/TLS certificate.
   * @param {string} config.server.options.https.config.sslTlsCertificate.cert - Represent the path of the public key of the SSL/TLS certificate.
   * @param {string} config.server.options.https.config.sslTlsCertificate.ca - Represent the path of the certificate authority of the SSL/TLS certificate.
   * @param {Object} [config.db] - Where you can manage DBs. You don't have to define it, if you don't want to use a DB in the application.
   * @param {Object} config.db.connection - Container for DB connection.
   * @param {string} config.db.connection.uri - DB connection [URI](https://docs.mongodb.com/manual/reference/connection-string/).
   * @param {Object} [config.db.connection.options] - DB connection [options](https://docs.mongodb.com/manual/reference/connection-string/#connection-options). You don't have to define it.
   * @param {Object} [config.interceptors] - Where you can manage interceptors. You don't have to define it, if you don't want to use interceptors. However, if you want to build a complex application, they are where you build the application logic.
   * @param {Object} [config.interceptors.init] - Container for init interceptor which works after setting the errors to the error safe and before opening the DB connection. You don't have to define it.
   * @param {string} config.interceptors.init.path - Represent the path of init interceptor.
   * @param {Object} [config.interceptors.dbConnection] - Container for DB connection interceptor which works after opening the DB connection and before running the Express. You don't have to define it.
   * @param {string} config.interceptors.dbConnection.path - Represent the path of DB connection interceptor.
   * @param {Object} [config.interceptors.app] - Container for app interceptor which works after running the Express and before creating the server. You don't have to define it.
   * @param {string} config.interceptors.app.path - Represent the path of app interceptor.
   * @param {Object} [config.interceptors.final] - Container for final interceptor which works after creating the server. You don't have to define it.
   * @param {string} config.interceptors.final.path - Represent the path of final interceptor.
   * @param {Object} [config.errors] - Where you can add a new error or override errors. You don't have to define it, if you don't want to add a new error or override errors.
   *                                   In overridden errors, since Cell uses [the module `DATA` of the package `@thedolphinos/error4js`](https://github.com/thedolphinos/error4js/blob/master/lib/DATA.json) and overrides it with [Cell module `ERROR_DATA`](https://github.com/thedolphinos/cell/blob/master/lib/helpers/ERROR_DATA.json), structure of error data must be identical of the form of `DATA` and `ERROR_DATA`. The first level keys (e.g. BASE, DEV_0, DOCUMENT_INVALID_VERSION, etc.) and the second level keys (code, message) must not be updated. To override, you should update the value of `code` which must be a string, and the value of `message` which must be an object where the keys must be the languages and the values must be a string.
   *                                   In newly added errors, you are free to choose any structure. However, if you are going to use [@thedolphinos/error4js](https://github.com/thedolphinos/error4js)'s error structure which you can observe in [`BaseError`](https://github.com/thedolphinos/error4js/blob/master/lib/core/BaseError.js), again structure of error data must be identical of the form of `DATA` and `ERROR_DATA`.
   * @return {Promise<void>}
   * @public
   */
  static async createLife (config = undefined)
  {
    Logger.info("All living things are composed of one or more cells; that the cell is the basic unit of life; and that new cells arise from existing cells.");

    Cell._catch();

    if (utility.isExist(config))
    {
      Validator.validateParameterConfig(config);
    }

    let ERROR_DATA_FINAL = {...ERROR_DATA_OF_ERROR4JS, ...ERROR_DATA_OF_CELL};

    if (utility.isExist(config.errors))
    {
      ERROR_DATA_FINAL = {...ERROR_DATA_FINAL, ...config.errors};
    }

    ErrorSafe.set(ERROR_DATA_FINAL);

    /* INTERCEPT */
    const initInterceptorPath = config?.interceptors?.init?.path;

    if (utility.isExist(initInterceptorPath))
    {
      const initInterceptor = new Interceptor(initInterceptorPath);
      await initInterceptor.intercept();
    }
    /* CONTINUE */

    // database connection must be established before the application starts. because the application may be using it.
    if (utility.isExist(config.db))
    {
      const dbConnection = new DbConnection(config.db.connection.uri, config?.db?.connection?.options);
      DbConnectionSafe.set(dbConnection);
      await dbConnection.open();

      /* INTERCEPT */
      const dbConnectionInterceptorPath = config?.interceptors?.dbConnection?.path;

      if (utility.isExist(dbConnectionInterceptorPath))
      {
        const dbConnectionInterceptor = new Interceptor(dbConnectionInterceptorPath);
        await dbConnectionInterceptor.intercept(dbConnection);
      }
      /* CONTINUE */
    }

    if (config?.server?.isEnabled)
    {
      const app = express();

      /* INTERCEPT */
      const appInterceptorPath = utility.isExist(config) && utility.isExist(config.interceptors) && utility.isExist(config.interceptors.app) ? config.interceptors.app.path : null;

      if (utility.isExist(appInterceptorPath))
      {
        const appInterceptor = new Interceptor(appInterceptorPath);
        await appInterceptor.intercept(app);
      }
      /* CONTINUE */

      const server = new Server(app, config.server.options);
      await server.create();
    }

    /* INTERCEPT */
    const finalInterceptorPath = config?.interceptors?.final?.path;

    if (utility.isExist(finalInterceptorPath))
    {
      const finalInterceptor = new Interceptor(finalInterceptorPath);
      await finalInterceptor.intercept();
    }
    /* CONTINUE */

    Logger.info("Life has begun!");
  }

  /**
   * Catches and logs uncaught exceptions and unhandled rejections.
   *
   * @private
   */
  static _catch ()
  {
    process.on("uncaughtException", (error, origin) =>
    {
      Logger.error(`Unhandled exception occurred!`, error);
    });

    process.on("unhandledRejection", (reason, promise) =>
    {
      Logger.error(`Unhandled rejection occurred!`, reason);
    });
  }
}

module.exports = Cell;
