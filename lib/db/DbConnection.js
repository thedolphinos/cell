"use strict";

const {InvalidArgumentsError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");
const MongoClient = require("mongodb").MongoClient;

const LOGGER = require("../core/Logger");
const DbSafe = require("../safes/DbSafe");
const Db = require("./Db");

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
   * Creates the instance of the Db and stores it in the Db safe.
   *
   * @since 0.4.0
   * @param {string} name
   */
  registerDb (name)
  {
    if (!_.isString(name))
    {
      throw new InvalidArgumentsError();
    }

    const db = new Db(this._mongoClient.db(name));
    DbSafe.set(name, db);
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
