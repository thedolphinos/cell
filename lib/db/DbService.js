"use strict";

const {InvalidArgumentsError} = require("@thedolphinos/error4js");
const _ = require("lodash");
const {Collection} = require("mongodb");

const Schema = require("./Schema");

/**
 * Contains the service logic of the framework in database level.
 * Should be used as a super class.
 *
 * @since 0.5.0
 */
class DbService
{
  /**
   * Creates a database service instance for the specified schema.
   * Should be used as a super class.
   *
   * @since 0.5.0
   * @param {Schema} schema
   */
  constructor (schema)
  {
    DbService._validateConstructorParameters(schema);

    this._schema = schema;
    this._transactionOptions = {
      readPreference: "primary",
      readConcern: {level: "majority"},
      writeConcern: {w: "majority"}
    };
  }

  /**
   * Gets the schema.
   *
   * @since 0.14.0
   * @return {Schema}
   */
  get schema ()
  {
    return this._schema;
  }

  /**
   * Gets the transaction options.
   *
   * @since 0.14.0
   * @return {Object} transactionOptions
   */
  get transactionOptions ()
  {
    return this._transactionOptions;
  }

  /**
   * Sets the transaction options.
   *
   * @since 0.9.1
   * @param {Object} transactionOptions
   */
  set transactionOptions (transactionOptions)
  {
    if (!_.isPlainObject(transactionOptions))
    {
      throw new InvalidArgumentsError();
    }

    this._transactionOptions = transactionOptions;
  }

  /**
   * Fetches the native MongoDB operations of the collection.
   *
   * @since 0.5.0
   * @return {Collection}
   */
  getNativeOps ()
  {
    return this._schema.getCollection();
  }

  /**
   * Fetches the matching documents with the specified query and options.
   * See: https://docs.mongodb.com/manual/reference/method/db.collection.find/
   * See: https://mongodb.github.io/node-mongodb-native/3.6/api/Collection.html#find
   *
   * @since 0.8.0
   * @param {Object} query
   * @param {Object} [options]
   * @returns {Promise<Array>} - The fetched documents.
   */
  async read (query, options = {})
  {
    if (!_.isPlainObject(query) ||
        !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    const result = (await this.getNativeOps().find(query, options));
    return result.toArray();
  }

  /**
   * Fetches the first matching document with the specified query and options.
   * See: https://docs.mongodb.com/manual/reference/method/db.collection.findOne/
   * See: https://mongodb.github.io/node-mongodb-native/3.6/api/Collection.html#findOne
   *
   * @since 0.8.0
   * @param {Object} query
   * @param {Object} [options]
   * @returns {Promise<Object>} - The fetched document.
   */
  async readOne (query, options = {})
  {
    if (!_.isPlainObject(query) ||
        !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    const result = await this.getNativeOps().findOne(query, options);
    return result;
  }

  /**
   * Creates the specified document with the specified options.
   * See: https://docs.mongodb.com/manual/reference/method/db.collection.insertOne/
   * See: https://mongodb.github.io/node-mongodb-native/3.6/api/Collection.html#insertOne
   *
   * @since 0.8.0
   * @param {Object} document
   * @param {Object} [options]
   * @returns {Promise<Object>} - The created document.
   */
  async createOne (document, options = {})
  {
    if (!_.isPlainObject(document) ||
        !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    const result = await this.getNativeOps().insertOne(document, options);
    return result.ops[0];
  }

  /**
   * Updates the first matching document with the specified query and options by using the specified document.
   * See: https://docs.mongodb.com/manual/reference/method/db.collection.updateOne/
   * See: https://mongodb.github.io/node-mongodb-native/3.6/api/Collection.html#updateOne
   *
   * @since 0.8.0
   * @param {Object} query
   * @param {Object} document
   * @param {Object} [options]
   * @returns {Promise<boolean>} - The result of the operation.
   */
  async updateOne (query, document, options = {})
  {
    if (!_.isPlainObject(document) ||
        !_.isPlainObject(query) ||
        !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    const result = await this.getNativeOps().updateOne(query, {$set: document}, options);
    return result.modifiedCount === 1;
  }

  /**
   * Deletes the first matching document with the specified query and options.
   * See: https://docs.mongodb.com/manual/reference/method/db.collection.deleteOne/
   * See: https://mongodb.github.io/node-mongodb-native/3.6/api/Collection.html#deleteOne
   *
   * @since 0.8.0
   * @param {Object} query
   * @param {Object} [options]
   * @returns {Promise<boolean>} - The result of the operation.
   */
  async deleteOne (query, options = {})
  {
    if (!_.isPlainObject(query) ||
        !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    const result = await this.getNativeOps().deleteOne(query, options);
    return result.deletedCount === 1;
  }

  /**
   * Validates the parameters for the constructor method.
   *
   * @since 0.5.0
   * @param {Schema} schema
   * @protected
   */
  static _validateConstructorParameters (schema)
  {
    if (!(schema instanceof Schema))
    {
      throw new InvalidArgumentsError();
    }
  }
}

module.exports = DbService;
