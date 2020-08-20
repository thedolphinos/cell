"use strict";

const {InvalidArgumentsError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");
const mongodb = require("mongodb");

const Logger = require("../core/Logger");
const Db = require("./Db");
const DbSafe = require("../safes/DbSafe");

/**
 * Contains the database connection logic of the framework.
 *
 * @since 0.2.0
 */
class DbConnection
{
  /**
   * Creates a database connection instance with a new MongoDB client instance.
   *
   * @since 0.2.0
   * @param {string} uri - See: https://docs.mongodb.com/manual/reference/connection-string/
   * @param {Object} [options] - See: https://docs.mongodb.com/manual/reference/connection-string/#connection-options
   */
  constructor (uri, options = null)
  {
    DbConnection._validateConstructorParameters(uri, options);

    this._mongoClient = new mongodb.MongoClient(uri, options);
  }

  /**
   * Gets the MongoDB client instance.
   *
   * @since 0.8.0
   * @returns {mongodb.MongoClient}
   */
  get mongoClient ()
  {
    return this._mongoClient;
  }

  /**
   * Connects to the MongoDB server or cluster.
   *
   * @since 0.2.0
   * @returns {Promise<void>}
   */
  async open ()
  {
    Logger.info("Trying to connect to the DB...");
    await this._mongoClient.connect();
    Logger.info("Connected to the DB.");
  }

  /**
   * Disconnects from the MongoDB server or cluster.
   *
   * @since 0.2.0
   * @returns {Promise<void>}
   */
  async close ()
  {
    Logger.info("Trying to disconnect from the DB...");
    await this._mongoClient.close();
    Logger.info("Disconnected from the DB.");
  }

  /**
   * Creates the instance of the database and stores it in the database safe.
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
   * Validates the parameters for the constructor method.
   *
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
