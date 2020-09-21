"use strict";

const {InvalidArgumentsError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");
const express = require("express");

const Logger = require("./Logger");
const Interceptor = require("./Interceptor");
const Server = require("./Server");
const DbConnection = require("../db/DbConnection");
const DbConnectionSafe = require("../safes/DbConnectionSafe");

/**
 * Initial point of the framework.
 */
class Cell
{
  /**
   * Starts the framework.
   *
   * @param {Object} [config]
   * @param {Object} [config.server]
   * @param {Object} config.server.options
   * @param {Object} config.server.options.http
   * @param {boolean} config.server.options.http.isEnabled
   * @param {Object} [config.server.options.http.config]
   * @param {number} config.server.options.http.config.port
   * @param {Object} config.server.options.https
   * @param {boolean} config.server.options.https.isEnabled
   * @param {Object} [config.server.options.https.config]
   * @param {number} config.server.options.https.config.port
   * @param {Object} config.server.options.https.config.sslTlsCertificate
   * @param {string} config.server.options.https.config.sslTlsCertificate.key
   * @param {string} config.server.options.https.config.sslTlsCertificate.cert
   * @param {string} config.server.options.https.config.sslTlsCertificate.ca
   * @param {Object} [config.db]
   * @param {Object} config.db.connection
   * @param {string} config.db.connection.uri - See: https://docs.mongodb.com/manual/reference/connection-string/
   * @param {Object} [config.db.connection.options] - See: https://docs.mongodb.com/manual/reference/connection-string/#connection-options
   * @param {Object} [config.interceptors]
   * @param {Object} [config.interceptors.init]
   * @param {string} config.interceptors.init.path
   * @param {Object} [config.interceptors.app]
   * @param {string} config.interceptors.app.path
   * @param {Object} [config.interceptors.dbConnection]
   * @param {string} config.interceptors.dbConnection.path
   * @return {Promise<void>}
   */
  static async createLife (config)
  {
    Cell._validateCreateLifeParameters(config);

    Logger.info("Cells are coming together...");

    /* INTERCEPT */
    const initInterceptorPath = utility.isExist(config) && utility.isExist(config.interceptors) && utility.isExist(config.interceptors.init) && utility.isExist(config.interceptors.init.path) ? config.interceptors.init.path : null;

    if (utility.isExist(initInterceptorPath))
    {
      const initInterceptor = new Interceptor(initInterceptorPath);
      await initInterceptor.intercept();
    }
    /* CONTINUE */

    // database connection must be established before the application starts. because the application may be using it.
    if (utility.isExist(config.db))
    {
      const options = utility.isExist(config) && utility.isExist(config.db) && utility.isExist(config.db.connection) && utility.isExist(config.db.connection.options) ? config.db.connection.options : null;

      const dbConnection = new DbConnection(config.db.connection.uri, options);
      DbConnectionSafe.set(dbConnection);
      await dbConnection.open();

      /* INTERCEPT */
      const dbConnectionInterceptorPath = utility.isExist(config) && utility.isExist(config.interceptors) && utility.isExist(config.interceptors.dbConnection) && utility.isExist(config.interceptors.dbConnection.path) ? config.interceptors.dbConnection.path : null;

      if (utility.isExist(dbConnectionInterceptorPath))
      {
        const dbConnectionInterceptor = new Interceptor(dbConnectionInterceptorPath);
        await dbConnectionInterceptor.intercept(dbConnection);
      }
      /* CONTINUE */
    }

    const app = express();

    /* INTERCEPT */
    const appInterceptorPath = utility.isExist(config) && utility.isExist(config.interceptors) && utility.isExist(config.interceptors.app) && utility.isExist(config.interceptors.app.path) ? config.interceptors.app.path : null;

    if (utility.isExist(appInterceptorPath))
    {
      const appInterceptor = new Interceptor(appInterceptorPath);
      await appInterceptor.intercept(app, express);
    }
    /* CONTINUE */
    const options = utility.isExist(config) && utility.isExist(config.server) && utility.isExist(config.server.options) ? config.server.options : null;

    const server = new Server(app, options);
    await server.create();

    Logger.info("Life has begun!");
  }

  /**
   * Validates the parameters for the method `createLife`.
   *
   * @param {Object} config
   * @private
   */
  static _validateCreateLifeParameters (config)
  {
    if (utility.isExist(config) && !Cell._isValidConfig(config))
    {
      throw new InvalidArgumentsError();
    }
  }

  /**
   * Checks if the specified configuration is valid.
   *
   * @param {Object} config
   * @return {boolean}
   * @private
   */
  static _isValidConfig (config)
  {
    if (!_.isPlainObject(config))
    {
      return false;
    }

    if (utility.isExist(config.server) && !_.isPlainObject(config.server.options))
    {
      return false;

      // validations for sub parameters will be done in `Server`.
    }

    if (utility.isExist(config.db) &&
        (
          !_.isPlainObject(config.db.connection) ||
          !_.isString(config.db.connection.uri) ||
          (utility.isExist(config.db.connection.options) && !_.isPlainObject(config.db.connection.options))
        )
    )
    {
      return false;
    }

    if (utility.isExist(config.interceptors) &&
        (
          (!utility.isExist(config.interceptors.app) && !utility.isExist(config.interceptors.dbConnection)) || // if the framework is present, one of them must be present.
          (utility.isExist(config.interceptors.init) && !_.isString(config.interceptors.init.path)) ||
          (utility.isExist(config.interceptors.app) && !_.isString(config.interceptors.app.path)) ||
          (utility.isExist(config.interceptors.dbConnection) && !_.isString(config.interceptors.dbConnection.path))
        )
    )
    {
      return false;
    }

    return true;
  }
}

module.exports = Cell;
