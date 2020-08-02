"use strict";

const {InvalidArgumentsError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");
const MongoClient = require("mongodb").MongoClient;

const LOGGER = require("../core/Logger");

class DbConnection
{
  /**
   * Creates a new MongoDB client instance.
   *
   * @since 0.2.0
   * @param {string} uri - See: https://docs.mongodb.com/manual/reference/connection-string/
   * @param {Object} [options] - See: https://docs.mongodb.com/manual/reference/connection-string/#connection-options
   */
  constructor (uri, options = null)
  {
    DbConnection._validateConstructorParameters(uri, options);

    this._mongoClient = new MongoClient(uri, options);
  }

  /**
   * Connects to the MongoDB server or cluster.
   *
   * @since 0.2.0
   * @returns {Promise<void>}
   */
  async open ()
  {
    await this._mongoClient.connect();
    LOGGER.info(`Connected to the DB.`);
  }

  /**
   * Disconnects from the MongoDB server or cluster.
   *
   * @since 0.2.0
   * @returns {Promise<void>}
   */
  async close ()
  {
    await this._mongoClient.close();
    LOGGER.info(`Disconnected from the DB.`);
  }

  /**
   * @since 0.2.0
   * @param {string} uri
   * @param {Object} [options]
   * @private
   */
  static _validateConstructorParameters (uri, options)
  {
    if (!_.isString(uri) ||
        (utility.isExist(options) && !_.isPlainObject(options)))
    {
      throw new InvalidArgumentsError();
    }
  }
}

module.exports = DbConnection;
