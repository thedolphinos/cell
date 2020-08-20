"use strict";

const {InvalidArgumentsError, DocumentNotFoundError, MoreThan1DocumentFoundError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const mongodb = require("mongodb");

const DbConnectionSafe = require("../safes/DbConnectionSafe");
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
   * Sets the transaction options.
   *
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
   * @return {mongodb.Collection}
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
   * @param {Object} options
   * @returns {Promise<Array>} - The fetched documents.
   */
  async read (query, options = {})
  {
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
   * @param {Object} options
   * @returns {Promise<Object>} - The fetched document.
   */
  async readOne (query, options = {})
  {
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
   * @param {Object} options
   * @returns {Promise<Object>} - The created document.
   */
  async createOne (document, options = {})
  {
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
   * @param {Object} options
   * @returns {Promise<boolean>} - The result of the operation.
   */
  async updateOne (query, document, options = {})
  {
    const result = await this.getNativeOps().updateOne(query, {$set: document}, options);
    return result.modifiedCount === 1;
  }

  /**
   * Updates the 1 and only 1 matching document with the specified query and options by using the specified document.
   * Uses transactions.
   * See: https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndUpdate/
   * See: https://mongodb.github.io/node-mongodb-native/3.6/api/Collection.html#findOneAndUpdate
   *
   * @since 0.8.0
   * @param {Object} query
   * @param {Object} document
   * @param {Object} options
   * @returns {Promise<Object>} - The updated document.
   */
  async updateOneSafe (query, document, options = {})
  {
    let session; // if the session would not be created here, it must end where it begun

    if (!utility.isExist(options.session))
    {
      session = DbConnectionSafe.get().mongoClient.startSession();
    }

    if (utility.isExist(session))
    {
      let result;

      try
      {
        await session.withTransaction(async () =>
                                      {
                                        const documents = await this.read(query, options);

                                        switch (documents.length)
                                        {
                                          case 0:
                                            throw new DocumentNotFoundError();
                                          case 1:
                                            break;
                                          default:
                                            throw new MoreThan1DocumentFoundError();
                                        }

                                        result = await this.getNativeOps().findOneAndUpdate({_id: documents[0]._id}, {$set: document}, {
                                          ...options,
                                          session,
                                          returnOriginal: false
                                        });
                                      }, this._transactionOptions);

        return result.value;
      }
      catch (error)
      {
        throw error;
      }
      finally
      {
        await session.endSession();
      }
    }
    else
    {
      const documents = await this.read(query, options);

      switch (documents.length)
      {
        case 0:
          throw new DocumentNotFoundError();
        case 1:
          break;
        default:
          throw new MoreThan1DocumentFoundError();
      }

      const result = await this.getNativeOps().findOneAndUpdate({_id: documents[0]._id}, {$set: document}, {
        ...options,
        returnOriginal: false
      });

      return result.value;
    }
  }

  /**
   * Deletes the first matching document with the specified query and options.
   * See: https://docs.mongodb.com/manual/reference/method/db.collection.deleteOne/
   * See: https://mongodb.github.io/node-mongodb-native/3.6/api/Collection.html#deleteOne
   *
   * @since 0.8.0
   * @param {Object} query
   * @param {Object} options
   * @returns {Promise<boolean>} - The result of the operation.
   */
  async deleteOne (query, options = {})
  {
    const result = await this.getNativeOps().deleteOne(query, options);
    return result.deletedCount === 1;
  }

  /**
   * Deletes the 1 and only 1 matching document with the specified query and options.
   * Uses transactions.
   * See: https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndDelete/
   * See: https://mongodb.github.io/node-mongodb-native/3.6/api/Collection.html#findOneAndDelete
   *
   * @since 0.8.0
   * @param {Object} query
   * @param {Object} options
   * @returns {Promise<Object>} - The deleted document.
   */
  async deleteOneSafe (query, options = {})
  {
    let session; // if the session would not be created here, it must end where it begun

    if (!utility.isExist(options.session))
    {
      session = DbConnectionSafe.get().mongoClient.startSession();
    }

    if (utility.isExist(session))
    {
      let result;

      try
      {
        await session.withTransaction(async () =>
                                      {
                                        const documents = await this.read(query, options);

                                        switch (documents.length)
                                        {
                                          case 0:
                                            throw new DocumentNotFoundError();
                                          case 1:
                                            break;
                                          default:
                                            throw new MoreThan1DocumentFoundError();
                                        }

                                        result = await this.getNativeOps().findOneAndDelete({_id: documents[0]._id}, {
                                          ...options,
                                          session
                                        });
                                      }, this._transactionOptions);

        return result.value;
      }
      catch (error)
      {
        throw error;
      }
      finally
      {
        await session.endSession();
      }
    }
    else
    {
      const documents = await this.read(query, options);

      switch (documents.length)
      {
        case 0:
          throw new DocumentNotFoundError();
        case 1:
          break;
        default:
          throw new MoreThan1DocumentFoundError();
      }

      const result = await this.getNativeOps().findOneAndDelete({_id: documents[0]._id}, options);

      return result.value;
    }
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
    if (!utility.isExist(schema) || !(schema instanceof Schema))
    {
      throw new InvalidArgumentsError();
    }
  }
}

module.exports = DbService;
