const {InvalidArgumentsError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");
const {Collection} = require("mongodb");
const ErrorSafe = require("../safes/ErrorSafe");
const Schema = require("./Schema");

/**
 * Contains the database operation logic of the framework.
 * It is kind of a wrapper to native MongoDB operations.
 * May be used as a super Class.
 */
class DbOperation
{
  /**
   * Creates a database operation instance for the specified schema.
   *
   * @param {Schema} schema
   */
  constructor (schema)
  {
    if (!(schema instanceof Schema))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    this._schema = schema;
  }

  /**
   * @return {Schema}
   */
  get schema ()
  {
    return this._schema;
  }

  /**
   * Fetches the native MongoDB operations of the related collection.
   *
   * @return {Collection}
   */
  getNativeOps ()
  {
    return this._schema.getCollection();
  }

  /**
   * Counts the matching documents with the specified query and options.
   * See: https://docs.mongodb.com/manual/reference/method/db.collection.countDocuments/
   * See: https://mongodb.github.io/node-mongodb-native/4.0/classes/collection.html#countdocuments
   *
   * @param {Object} query
   * @param {Object} [options]
   * @returns {Promise<Number>} - The fetched documents.
   */
  async count (query, options = {})
  {
    if (!_.isPlainObject(query) ||
        !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    return this.getNativeOps().countDocuments(query, options);
  }

  /**
   * Executes the specified pipeline.
   * See: https://docs.mongodb.com/manual/reference/method/db.collection.aggregate/
   * See: https://mongodb.github.io/node-mongodb-native/4.0/classes/collection.html#aggregate
   *
   * @param {Array} pipeline
   * @param {Object} options
   * @return {Promise<Array>}
   */
  async aggregate (pipeline = undefined, options = undefined)
  {
    if (utility.isExist(pipeline) && !_.isArray(pipeline) ||
        utility.isExist(options) && !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    pipeline = utility.init(pipeline, []);
    options = utility.init(options, {});

    const result = await this.getNativeOps().aggregate(pipeline, options);
    return await result.toArray();
  }

  /**
   * Fetches the matching documents with the specified query and options.
   * See: https://docs.mongodb.com/manual/reference/method/db.collection.find/
   * See: https://mongodb.github.io/node-mongodb-native/4.0/classes/collection.html#find
   *
   * @param {Object} query
   * @param {Object} [options]
   * @returns {Promise<Array>} - The fetched documents.
   */
  async read (query, options = {})
  {
    if (!_.isPlainObject(query) ||
        !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    const result = await this.getNativeOps().find(query, options);
    return result.toArray();
  }

  /**
   * Fetches the first matching document with the specified query and options.
   * See: https://docs.mongodb.com/manual/reference/method/db.collection.findOne/
   * See: https://mongodb.github.io/node-mongodb-native/4.0/classes/collection.html#findone
   *
   * @param {Object} query
   * @param {Object} [options]
   * @returns {Promise<Object>} - The fetched document.
   */
  async readOne (query, options = {})
  {
    if (!_.isPlainObject(query) ||
        !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    return this.getNativeOps().findOne(query, options);
  }

  /**
   * Fetches the matching document with the specified ID and options.
   * This method is a specialized version of the method `readOne`.
   * See: https://docs.mongodb.com/manual/reference/method/db.collection.findOne/
   * See: https://mongodb.github.io/node-mongodb-native/4.0/classes/collection.html#findone
   *
   * @param {ObjectId} _id
   * @param {Object} [options]
   * @returns {Promise<Object>} - The fetched document.
   */
  async readOneById (_id, options = {})
  {
    if (!utility.isObjectId(_id) ||
        !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    return this.readOne({_id}, options);
  }

  /**
   * Creates the specified document candidate with the specified options.
   * See: https://docs.mongodb.com/manual/reference/method/db.collection.insertOne/
   * See: https://mongodb.github.io/node-mongodb-native/4.0/classes/collection.html#insertone
   *
   * @param {Object} documentCandidate
   * @param {Object} [options]
   * @returns {Promise<Object>} - The created document.
   */
  async createOne (documentCandidate, options = {})
  {
    if (!_.isPlainObject(documentCandidate) ||
        !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    const result = await this.getNativeOps().insertOne(documentCandidate, options);

    return this.readOneById(result.insertedId);
  }

  /**
   * Updates the first matching document with the specified query and options by using the specified document candidate.
   * See: https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndUpdate/
   * See: https://mongodb.github.io/node-mongodb-native/4.0/classes/collection.html#findoneandupdate
   *
   * @param {Object} query
   * @param {Object} newDocumentPropertyCandidates
   * @param {Object} [options]
   * @returns {Promise<Object>} - The updated document.
   */
  async updateOne (query, newDocumentPropertyCandidates, options = {})
  {
    if (!_.isPlainObject(query) ||
        !_.isPlainObject(newDocumentPropertyCandidates) ||
        !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    options = {
      ...options,
      returnDocument: "after" // to return the updated document
    };

    const result = await this.getNativeOps().findOneAndUpdate(query, newDocumentPropertyCandidates, options);
    return result.value;
  }

  /**
   * Updates the matching document with the specified ID and options by using the specified document candidate.
   * This method is a specialized version of the method `updateOne`.
   * See: https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndUpdate/
   * See: https://mongodb.github.io/node-mongodb-native/4.0/classes/collection.html#findoneandupdate
   *
   * @param {ObjectId} _id
   * @param {Object} newDocumentPropertyCandidates
   * @param {Object} [options]
   * @returns {Promise<Object>} - The updated document.
   */
  async updateOneById (_id, newDocumentPropertyCandidates, options = {})
  {
    if (!utility.isObjectId(_id) ||
        !_.isPlainObject(newDocumentPropertyCandidates) ||
        !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    return this.updateOne({_id}, newDocumentPropertyCandidates, options);
  }

  /**
   * Replaces the first matching document with the specified query and options by using the specified document candidate.
   * See: https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndReplace/
   * See: https://mongodb.github.io/node-mongodb-native/4.0/classes/collection.html#findoneandreplace
   *
   * @param {Object} query
   * @param {Object} newDocumentCandidate
   * @param {Object} [options]
   * @returns {Promise<Object>} - The replaced document.
   */
  async replaceOne (query, newDocumentCandidate, options = {})
  {
    if (!_.isPlainObject(query) ||
        !_.isPlainObject(newDocumentCandidate) ||
        !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    options = {
      ...options,
      returnDocument: "after" // to return the updated document
    };

    const result = await this.getNativeOps().findOneAndReplace(query, newDocumentCandidate, options);
    return result.value;
  }

  /**
   * Replaces the matching document with the specified ID and options by using the specified document candidate.
   * This method is a specialized version of the method `replaceOneById`.
   * See: https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndReplace/
   * See: https://mongodb.github.io/node-mongodb-native/4.0/classes/collection.html#findoneandreplace
   *
   * @param {ObjectId} _id
   * @param {Object} newDocumentCandidate
   * @param {Object} [options]
   * @returns {Promise<Object>} - The replaced document.
   */
  async replaceOneById (_id, newDocumentCandidate, options = {})
  {
    if (!utility.isObjectId(_id) ||
        !_.isPlainObject(newDocumentCandidate) ||
        !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    return this.replaceOne({_id}, newDocumentCandidate, options);
  }

  /**
   * Deletes the first matching document with the specified query and options by using the specified document candidate.
   * See: https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndDelete/
   * See: https://mongodb.github.io/node-mongodb-native/4.0/classes/collection.html#findoneanddelete
   *
   * @param {Object} query
   * @param {Object} [options]
   * @returns {Promise<Object>} - The deleted document.
   */
  async deleteOne (query, options = {})
  {
    if (!_.isPlainObject(query) ||
        !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    const result = await this.getNativeOps().findOneAndDelete(query, options);
    return result.value;
  }

  /**
   * Deletes the matching document with the specified ID and options by using the specified document candidate.
   * This method is a specialized version of the method `deleteOneById`.
   * See: https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndDelete/
   * See: https://mongodb.github.io/node-mongodb-native/4.0/classes/collection.html#findoneanddelete
   *
   * @param {ObjectId} _id
   * @param {Object} [options]
   * @returns {Promise<Object>} - The deleted document.
   */
  async deleteOneById (_id, options = {})
  {
    if (!utility.isObjectId(_id) ||
        !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    return this.deleteOne({_id}, options);
  }
}

module.exports = DbOperation;
