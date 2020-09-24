"use strict";

const {InvalidArgumentsError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");
const {MongoClient} = require("mongodb");

const Logger = require("../core/Logger");
const DbSafe = require("../safes/DbSafe");

/**
 * Contains the database connection logic of the framework.
 */
class DbConnection
{
  /**
   * Creates a database connection instance with a new MongoDB client instance.
   *
   * @param {string} uri - See: https://docs.mongodb.com/manual/reference/connection-string/
   * @param {Object} [options] - See: https://docs.mongodb.com/manual/reference/connection-string/#connection-options
   */
  constructor (uri, options = null)
  {
    this._validateConstructorParams(uri, options);

    this._mongoClient = new MongoClient(uri, options);
  }

  /**
   * @returns {MongoClient}
   */
  get mongoClient ()
  {
    return this._mongoClient;
  }

  /**
   * Connects to the MongoDB server or cluster.
   *
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
   * @param {string} name
   */
  registerDb (name)
  {
    if (!_.isString(name))
    {
      throw new InvalidArgumentsError();
    }

    DbSafe.set(name, this._mongoClient.db(name));
  }

  /**
   * Validates the parameters for the constructor method.
   *
   * @param {string} uri
   * @param {Object} [options]
   * @private
   */
  _validateConstructorParams (uri, options)
  {
    if (!_.isString(uri) ||
        (utility.isExist(options) && !_.isPlainObject(options)))
    {
      throw new InvalidArgumentsError();
    }
  }
}

module.exports = DbConnection;
