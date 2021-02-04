const {InvalidArgumentsError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");
const {Collection} = require("mongodb");

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
      throw new InvalidArgumentsError();
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
   * See: https://mongodb.github.io/node-mongodb-native/3.6/api/Collection.html#countDocuments
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
      throw new InvalidArgumentsError();
    }

    return this.getNativeOps().countDocuments(query, options);
  }

  /**
   * Executes the specified pipeline.
   * See: https://docs.mongodb.com/manual/reference/method/db.collection.aggregate/
   * See: https://mongodb.github.io/node-mongodb-native/3.6/api/Collection.html#aggregate
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
      throw new InvalidArgumentsError();
    }

    pipeline = utility.init(pipeline, []);
    options = utility.init(options, {});

    const result = await this.getNativeOps().aggregate(pipeline, options);
    return await result.toArray();
  }

  /**
   * Fetches the matching documents with the specified query and options.
   * See: https://docs.mongodb.com/manual/reference/method/db.collection.find/
   * See: https://mongodb.github.io/node-mongodb-native/3.6/api/Collection.html#find
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
      throw new InvalidArgumentsError();
    }

    const result = await this.getNativeOps().find(query, options);
    return result.toArray();
  }

  /**
   * Fetches the first matching document with the specified query and options.
   * See: https://docs.mongodb.com/manual/reference/method/db.collection.findOne/
   * See: https://mongodb.github.io/node-mongodb-native/3.6/api/Collection.html#findOne
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
      throw new InvalidArgumentsError();
    }

    const result = await this.getNativeOps().findOne(query, options);
    return result;
  }

  /**
   * Creates the specified document candidate with the specified options.
   * See: https://docs.mongodb.com/manual/reference/method/db.collection.insertOne/
   * See: https://mongodb.github.io/node-mongodb-native/3.6/api/Collection.html#insertOne
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
      throw new InvalidArgumentsError();
    }

    const result = await this.getNativeOps().insertOne(documentCandidate, options);
    return result.ops[0];
  }

  /**
   * Updates the first matching document with the specified query and options by using the specified document candidate.
   * See: https://docs.mongodb.com/manual/reference/method/db.collection.updateOne/
   * See: https://mongodb.github.io/node-mongodb-native/3.6/api/Collection.html#updateOne
   *
   * @param {Object} query
   * @param {Object} newDocumentPropertyCandidates
   * @param {Object} [options]
   * @returns {Promise<boolean>} - The result of the operation.
   */
  async updateOne (query, newDocumentPropertyCandidates, options = {})
  {
    if (!_.isPlainObject(query) ||
        !_.isPlainObject(newDocumentPropertyCandidates) ||
        !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    for (const key in newDocumentPropertyCandidates)
    {
      const value = newDocumentPropertyCandidates[key];

      if (!_.isPlainObject(value))
      {
        throw new InvalidArgumentsError();
      }
    }

    const result = await this.getNativeOps().updateOne(query, {$set: newDocumentPropertyCandidates}, options);
    return result.modifiedCount === 1;
  }

  /**
   * Updates the first matching document with the specified query and options by using the specified document candidate.
   * See: https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndUpdate/
   * See: https://mongodb.github.io/node-mongodb-native/3.6/api/Collection.html#findOneAndUpdate
   *
   * @param {Object} query
   * @param {Object} newDocumentPropertyCandidates
   * @param {Object} [options]
   * @returns {Promise<Object>} - The updated document.
   */
  async findOneAndUpdate (query, newDocumentPropertyCandidates, options = {})
  {
    if (!_.isPlainObject(query) ||
        !_.isPlainObject(newDocumentPropertyCandidates) ||
        !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    const result = await this.getNativeOps().findOneAndUpdate(query, newDocumentPropertyCandidates, options);
    return result.value;
  }

  /**
   * Replaces the first matching document with the specified query and options by using the specified document candidate.
   * See: https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndReplace/
   * See: https://mongodb.github.io/node-mongodb-native/3.6/api/Collection.html#findOneAndReplace
   *
   * @param {Object} query
   * @param {Object} newDocumentCandidates
   * @param {Object} [options]
   * @returns {Promise<Object>} - The replaced document.
   */
  async findOneAndReplace (query, newDocumentCandidates, options = {})
  {
    if (!_.isPlainObject(query) ||
        !_.isPlainObject(newDocumentCandidates) ||
        !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    const result = await this.getNativeOps().findOneAndReplace(query, newDocumentCandidates, options);
    return result.value;
  }

  /**
   * Deletes the first matching document with the specified query and options.
   * See: https://docs.mongodb.com/manual/reference/method/db.collection.deleteOne/
   * See: https://mongodb.github.io/node-mongodb-native/3.6/api/Collection.html#deleteOne
   *
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
   * Deletes the first matching document with the specified query and options by using the specified document candidate.
   * See: https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndDelete/
   * See: https://mongodb.github.io/node-mongodb-native/3.6/api/Collection.html#findOneAndDelete
   *
   * @param {Object} query
   * @param {Object} [options]
   * @returns {Promise<Object>} - The deleted document.
   */
  async findOneAndDelete (query, options = {})
  {
    if (!_.isPlainObject(query) ||
        !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    const result = await this.getNativeOps().findOneAndDelete(query, options);
    return result.value;
  }
}

module.exports = DbOperation;
