"use strict";

const {InvalidArgumentsError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");
const express = require("express");

const LOGGER = require("./Logger");
const Server = require("./Server");
const DbConnection = require("../db/DbConnection");

class Cell
{
  /**
   * Starts the framework.
   *
   * @since 0.2.0
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
   * @return {Promise<void>}
   */
  static async createLife (config)
  {
    Cell._validateConstructorParameters(config);

    LOGGER.info("Cells are coming together...");

    const app = express();

    const server = new Server(app, config?.server?.options);
    await server.create();

    if (utility.isExist(config.db))
    {
      const dbConnection = new DbConnection(config.db.connection.uri, config.db.connection?.options);
      await dbConnection.open();
    }

    LOGGER.info("Life has begun!");
  }

  /**
   * @since 0.2.0
   * @param {Object} config
   * @private
   */
  static _validateConstructorParameters (config)
  {
    if (utility.isExist(config) && !Cell._isValidConfig(config))
    {
      throw new InvalidArgumentsError();
    }
  }

  /**
   * @since 0.2.0
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

    if (utility.isExist(config.server))
    {
      if (!_.isPlainObject(config.server) ||
          !_.isPlainObject(config.server.options))
      {
        return false;
      }

      // validations for sub parameters will be done in `Server`.
    }

    if (utility.isExist(config.db))
    {
      if (!_.isPlainObject(config.db) ||
          !_.isPlainObject(config.db.connection) ||
          !_.isString(config.db.connection.uri) ||
          (utility.isExist(config.db.connection.options) && !_.isPlainObject(config.db.connection.options)))
      {
        return false;
      }
    }

    return true;
  }
}

module.exports = Cell;
