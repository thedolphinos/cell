const {
  InvalidArgumentsError,
  DATA: ERROR_DATA_OF_ERROR4JS
} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");

const _ = require("lodash");
const express = require("express");

const Logger = require("./Logger");
const ErrorSafe = require("../safes/ErrorSafe");
const DbConnectionSafe = require("../safes/DbConnectionSafe");
const Interceptor = require("./Interceptor");
const Server = require("./Server");
const DbConnection = require("../db/DbConnection");
const ERROR_DATA_OF_CELL = require("../helpers/ERROR_DATA.json");

/**
 * Initial point of the framework.
 */
class Cell
{
  /**
   * Starts the framework.
   *
   * @param {Object} config - Contains Cell configurations.
   * @param {Object} [config.server]
   * @param {boolean} [config.server.isEnabled] - Allows to disable the HTTP server without updating `config.server.options`.
   * @param {Object} config.server.options
   * @param {Object} config.server.options.http
   * @param {boolean} config.server.options.http.isEnabled - Allows to disable the HTTP server without updating `config.server.options.http.config`.
   * @param {Object} [config.server.options.http.config]
   * @param {number} config.server.options.http.config.port - Represents port number of the HTTP server.
   * @param {Object} config.server.options.https
   * @param {boolean} config.server.options.https.isEnabled - Allows to disable the HTTPS server without updating `config.server.options.https.config`.
   * @param {Object} [config.server.options.https.config]
   * @param {number} config.server.options.https.config.port - Represents port number of the HTTPS server.
   * @param {Object} config.server.options.https.config.sslTlsCertificate
   * @param {string} config.server.options.https.config.sslTlsCertificate.key - Represent the path of the private key of the SSL/TLS certificate.
   * @param {string} config.server.options.https.config.sslTlsCertificate.cert - Represent the path of the public key of the SSL/TLS certificate.
   * @param {string} config.server.options.https.config.sslTlsCertificate.ca - Represent the path of the certificate authority of the SSL/TLS certificate.
   * @param {Object} [config.db]
   * @param {Object} config.db.connection
   * @param {string} config.db.connection.uri - See: https://docs.mongodb.com/manual/reference/connection-string/
   * @param {Object} [config.db.connection.options] - See: https://docs.mongodb.com/manual/reference/connection-string/#connection-options
   * @param {Object} [config.interceptors]
   * @param {Object} [config.interceptors.init] - Init interceptor works after setting the errors to the error safe and before opening the DB connection.
   * @param {string} config.interceptors.init.path
   * @param {Object} [config.interceptors.dbConnection] - DB connection works after opening the DB connection and before running the Express.
   * @param {string} config.interceptors.dbConnection.path
   * @param {Object} [config.interceptors.app] - App interceptor works after running the Express and before creating the server.
   * @param {string} config.interceptors.app.path
   * @param {Object} [config.interceptors.final] - Final interceptor works after creating the server.
   * @param {string} config.interceptors.final.path
   * @param {Object} [config.error] - Represents overridden errors. Since, Cell uses the module `DATA` of the package `@thedolphinos/error4js` and `ERROR_DATA` module of itself, it must be identical of the merged form of `DATA` (https://github.com/thedolphinos/error4js/blob/master/lib/DATA.json) and ERROR_DATA. The first level keys (e.g. BASE, DEV_0, DOCUMENT_INVALID_VERSION, etc.) and the second level keys (code, message) must not be updated. To override the errors, you should update the value of `code` which must be a string, and the value of `message` which must be an object where the keys must be the languages and the values must be a string.
   * @return {Promise<void>}
   */
  static async createLife (config)
  {
    Logger.info("All living things are composed of one or more cells; that the cell is the basic unit of life; and that new cells arise from existing cells.");

    Cell._catch();

    Cell._validateCreateLifeParameters(config);

    let ERROR_DATA_FINAL = {...ERROR_DATA_OF_ERROR4JS, ...ERROR_DATA_OF_CELL};

    if (utility.isExist(config.error))
    {
      ERROR_DATA_FINAL = {...ERROR_DATA_FINAL, ...config.error};
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

    const isServerEnabled = utility.isExist(config?.server?.isEnabled)
                            ? config.server.isEnabled
                            : utility.isExist(config.server);

    if (isServerEnabled)
    {
      const app = express();

      /* INTERCEPT */
      const appInterceptorPath = utility.isExist(config) && utility.isExist(config.interceptors) && utility.isExist(config.interceptors.app) ? config.interceptors.app.path : null;

      if (utility.isExist(appInterceptorPath))
      {
        const appInterceptor = new Interceptor(appInterceptorPath);
        await appInterceptor.intercept(app, express);
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

  /**
   * Validates the parameters of the method `createLife`.
   *
   * @param {Object} config
   * @private
   */
  static _validateCreateLifeParameters (config)
  {
    if (!_.isPlainObject(config))
    {
      throw new InvalidArgumentsError();
    }

    if (utility.isExist(config.error) &&
        !_.isPlainObject(config.error))
    {
      throw new InvalidArgumentsError();
    }

    if (utility.isExist(config.server) &&
        (
          (utility.isExist(config.server.isEnabled) && !_.isBoolean(config.server.isEnabled)) ||
          (utility.isExist(config.server.options) && !_.isPlainObject(config.server.options))
        )
    )
    {
      // validations for `config.server.options` will be done in `Server`.
      throw new InvalidArgumentsError();
    }

    if (utility.isExist(config.db) &&
        (
          !_.isPlainObject(config.db.connection) ||
          !_.isString(config.db.connection.uri) ||
          (utility.isExist(config.db.connection.options) && !_.isPlainObject(config.db.connection.options))
        )
    )
    {
      // validations for `config.db.connection.options` will not be done.
      throw new InvalidArgumentsError();
    }

    if (utility.isExist(config.interceptors) &&
        (
          (!utility.isExist(config.interceptors.app) && !utility.isExist(config.interceptors.dbConnection)) || // if the framework is present, one of them must be present.
          (utility.isExist(config.interceptors.init) && !_.isString(config.interceptors.init.path)) ||
          (utility.isExist(config.interceptors.app) && !_.isString(config.interceptors.app.path)) ||
          (utility.isExist(config.interceptors.dbConnection) && !_.isString(config.interceptors.dbConnection.path)) ||
          (utility.isExist(config.interceptors.final) && !_.isString(config.interceptors.final.path))
        )
    )
    {
      throw new InvalidArgumentsError();
    }
  }
}

module.exports = Cell;
