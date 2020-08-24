"use strict";

const {
  InvalidArgumentsError,
  DocumentNotFoundError,
  MoreThan1DocumentFoundError,
  HTTPError,
  BadRequestError,
  InternalServerError
} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");
const {MongoError, Int32, Double, ObjectId} = require("mongodb");

const Logger = require("../core/Logger");
const DbConnectionSafe = require("../safes/DbConnectionSafe");
const Schema = require("../db/Schema");
const DbService = require("../db/DbService");

/**
 * Contains the service logic of the framework in application level.
 * Should be used as a super class.
 *
 * @since 0.14.0
 */
class Service
{
  /**
   * Creates a service instance for the specified schema or database service.
   *
   * @since 0.14.0
   * @param {Schema | DbService} schema_dbService
   */
  constructor (schema_dbService)
  {
    if (schema_dbService instanceof Schema)
    {
      this._dbService = new DbService(schema_dbService);
    }
    else if (schema_dbService instanceof DbService)
    {
      this._dbService = schema_dbService;
    }
    else
    {
      throw new InvalidArgumentsError();
    }
  }

  /**
   * Fetches the matching documents with the specified query and options.
   *
   * @since 0.14.0
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

    query = {
      ...query,
      isSoftDeleted: false
    };

    try
    {
      return await this._dbService.read(query, options);
    }
    catch (error)
    {
      this._handleError(error);
    }
  }

  /**
   * Fetches the first matching document with the specified query and options.
   *
   * @since 0.14.0
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

    query = {
      ...query,
      isSoftDeleted: false
    };

    try
    {
      return await this._dbService.readOne(query, options);
    }
    catch (error)
    {
      this._handleError(error);
    }
  }

  /**
   * Fetches the matching document with the specified ID and options.
   *
   * @since 0.15.0
   * @param {string | ObjectId} _id
   * @param {Object} [options]
   * @returns {Promise<Object>} - The fetched document.
   */
  async readOneById (_id, options = {})
  {
    if (!_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    _id = this._validateAndProcessObjectIdCandidate(_id);

    try
    {
      return await this.readOne({_id}, options);
    }
    catch (error)
    {
      this._handleError(error);
    }
  }

  /**
   * Fetches the matching document with the specified ID, version, and options.
   *
   * @since 0.19.0
   * @param {string | ObjectId} _id
   * @param {string | number} version
   * @param {Object} [options]
   * @returns {Promise<Object>} - The fetched document.
   */
  async readOneByIdAndVersion (_id, version, options = {})
  {
    if (!_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    _id = this._validateAndProcessObjectIdCandidate(_id);
    version = this._validateAndProcessVersion(version);

    const document = await this.readOneById(_id, options);

    if (document.version < version)
    {
      throw new BadRequestError(`The requested document's latest version is ${document.version}. You have the version ${version}.`);
    }
    else if (document.version > version)
    {
      throw new BadRequestError(`The requested document has been modified. The latest version is ${document.version}. You have the version ${version}.`);
    }

    return document;
  }

  /**
   * Creates a document with the specified options by using the specified document candidate.
   *
   * @since 0.14.0
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

    documentCandidate = this._validateAndProcessDocumentCandidate(documentCandidate);
    documentCandidate = await this._hookDocumentCandidateForCreateOne(documentCandidate);
    documentCandidate = {
      ...documentCandidate,
      version: 0,
      isSoftDeleted: false
    };

    try
    {
      return await this._dbService.createOne(documentCandidate, options);
    }
    catch (error)
    {
      this._handleError(error);
    }
  }

  /**
   * Updates the matching document (if there is only 1) with the specified query and options by using the specified document candidate.
   * Uses transactions. If a session is not provided externally, creates one internally.
   *
   * @since 0.8.0
   * @param {Object} query
   * @param {Object} documentCandidate
   * @param {Object} [options]
   * @returns {Promise<Object>} - The updated document.
   */
  async updateOne (query, documentCandidate, options = {})
  {
    if (!_.isPlainObject(query) ||
        !_.isPlainObject(documentCandidate) ||
        !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    query = {
      ...query,
      isSoftDeleted: false
    };
    documentCandidate = this._validateAndProcessDocumentCandidate(documentCandidate);
    documentCandidate = await this._hookDocumentCandidateForUpdateOne(documentCandidate);

    try
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

                                          const document = documents[0];

                                          result = await this._dbService.getNativeOps().findOneAndUpdate({_id: document._id}, {$set: {...documentCandidate, version: document.version + 1}}, {
                                            ...options,
                                            session,
                                            returnOriginal: false
                                          });
                                        }, this._dbService.transactionOptions);

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

        const document = documents[0];

        const result = await this._dbService.getNativeOps().findOneAndUpdate({_id: document._id}, {$set: {...documentCandidate, version: document.version + 1}}, {
          ...options,
          returnOriginal: false
        });

        return result.value;
      }
    }
    catch (error)
    {
      this._handleError(error);
    }
  }

  /**
   * Updates the matching document with the specified ID, version, and options by using the specified document candidate.
   * Uses transactions. If a session is not provided externally, creates one internally.
   *
   * @since 0.16.0
   * @param {string | ObjectId} _id
   * @param {string | number} version
   * @param {Object} documentCandidate
   * @param {Object} [options]
   * @returns {Promise<Object>} - The updated document.
   */
  async updateOneByIdAndVersion (_id, version, documentCandidate, options = {})
  {
    if (!_.isPlainObject(documentCandidate) ||
        !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    documentCandidate = this._validateAndProcessDocumentCandidate(documentCandidate);
    documentCandidate = await this._hookDocumentCandidateForUpdateOneByIdAndVersion(documentCandidate);

    try
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
                                          const document = await this.readOneByIdAndVersion(_id, version, options);

                                          result = await this._dbService.getNativeOps().findOneAndUpdate({_id: document._id}, {$set: {...documentCandidate, version: document.version + 1}}, {
                                            ...options,
                                            session,
                                            returnOriginal: false
                                          });
                                        }, this._dbService.transactionOptions);

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
        const document = await this.readOneByIdAndVersion(_id, version, options);

        const result = await this._dbService.getNativeOps().findOneAndUpdate({_id: document._id}, {$set: {...documentCandidate, version: document.version + 1}}, {
          ...options,
          returnOriginal: false
        });

        return result.value;
      }
    }
    catch (error)
    {
      this._handleError(error);
    }
  }

  /**
   * Soft deletes the matching document (if there is only 1) with the specified query and options.
   * Uses transactions. If a session is not provided externally, creates one internally.
   *
   * @since 0.17.0
   * @param {Object} query
   * @param {Object} [options]
   * @returns {Promise<Object>} - The soft deleted document.
   */
  async softDeleteOne (query, options = {})
  {
    return await this.updateOne(query, {isSoftDeleted: true}, options);
  }

  /**
   * Soft deletes the matching document with the specified ID, version, and options.
   * Uses transactions. If a session is not provided externally, creates one internally.
   *
   * @since 0.17.0
   * @param {string | ObjectId} _id
   * @param {string | number} version
   * @param {Object} [options]
   * @returns {Promise<Object>} - The soft deleted document.
   */
  async softDeleteOneByIdAndVersion (_id, version, options = {})
  {
    return await this.updateOneByIdAndVersion(_id, version, {isSoftDeleted: true}, options);
  }

  /**
   * Deletes the matching document (if there is only 1) with the specified query and options.
   * Uses transactions. If a session is not provided externally, creates one internally.
   *
   * @since 0.8.0
   * @param {Object} query
   * @param {Object} [options]
   * @returns {Promise<Object>} - The deleted document.
   */
  async deleteOne (query, options = {})
  {
    if (!_.isPlainObject(query) ||
        !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    query = {
      ...query,
      isSoftDeleted: false
    };

    try
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

                                          const document = documents[0];

                                          result = await this._dbService.getNativeOps().findOneAndDelete({_id: document._id}, {
                                            ...options,
                                            session
                                          });
                                        }, this._dbService.transactionOptions);

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

        const document = documents[0];

        const result = await this._dbService.getNativeOps().findOneAndDelete({_id: document._id}, options);

        return result.value;
      }
    }
    catch (error)
    {
      this._handleError(error);
    }
  }

  /**
   * Deletes the matching document with the specified ID, version, and options.
   * Uses transactions. If a session is not provided externally, creates one internally.
   *
   * @since 0.18.0
   * @param {string | ObjectId} _id
   * @param {string | number} version
   * @param {Object} [options]
   * @returns {Promise<Object>} - The deleted document.
   */
  async deleteOneByIdAndVersion (_id, version, options = {})
  {
    if (!_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    try
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
                                          const document = await this.readOneByIdAndVersion(_id, version, options);

                                          result = await this._dbService.getNativeOps().findOneAndDelete({_id: document._id}, {
                                            ...options,
                                            session
                                          });
                                        }, this._dbService.transactionOptions);

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
        const document = await this.readOneByIdAndVersion(_id, version, options);

        const result = await this._dbService.getNativeOps().findOneAndDelete({_id: document._id}, {
          ...options
        });

        return result.value;
      }
    }
    catch (error)
    {
      this._handleError(error);
    }
  }

  /**
   * Generates the appropriate error by analyzing the specified error.
   *
   * @param {any} error
   * @private
   */
  _handleError (error)
  {
    if (error instanceof MongoError)
    {
      Logger.error(`DB level error occurred: (CODE ${error.code}) ${error.message}`);

      if (error.code === 121)
      {
        error = new BadRequestError("Invalid body.");
      }
      else
      {
        error = new InternalServerError();
      }
    }
    else if (error instanceof HTTPError)
    {
      Logger.error(`Client level error occurred: ${JSON.stringify(error)}`);
    }
    else
    {
      Logger.error(`Application level error occurred: ${JSON.stringify(error)}`);

      error = new InternalServerError();
    }

    throw error;
  }

  /**
   * Validates the specified candidate and converts it to the matching data type if possible.
   *
   * @since 0.14.0
   * @param {any} candidate - Either the whole document candidate or in recursive calls a sub part of it.
   * @param {Object} schemaDefinition - The specified candidate's schema definition.
   * @param {Object | Array} generatedCandidate - The generated document candidate. In recursive calls, the related part of it is passed by reference.
   * @return {Object | Array} - Processed candidate in the appropriate data type for database.
   * @private
   */
  _validateAndProcessDocumentCandidate (candidate, schemaDefinition = this._dbService.schema.definition, generatedCandidate = null)
  {
    if (!_.isPlainObject(schemaDefinition) ||
        (utility.isExist(generatedCandidate) && !_.isPlainObject(generatedCandidate) && !_.isArray(generatedCandidate)))
    {
      throw new InvalidArgumentsError();
    }

    // the property can have more than 1 data type. processing is not possible.
    if (_.isArray(schemaDefinition.bsonType))
    {
      return candidate;
    }

    switch (schemaDefinition.bsonType)
    {
      case Schema.DataType.Boolean:
        return this._validateAndProcessBooleanCandidate(candidate);
      case Schema.DataType.Int:
        return this._validateAndProcessIntCandidate(candidate);
      case Schema.DataType.Double:
        return this._validateAndProcessDoubleCandidate(candidate);
      case Schema.DataType.String:
        return this._validateAndProcessStringCandidate(candidate);
      case Schema.DataType.ObjectId:
        return this._validateAndProcessObjectIdCandidate(candidate);
      case Schema.DataType.Date:
        return this._validateAndProcessDateCandidate(candidate);
      case Schema.DataType.Object:
        return this._validateAndProcessObjectCandidate(candidate, schemaDefinition, generatedCandidate);
      case Schema.DataType.Array:
        return this._validateAndProcessArrayCandidate(candidate, schemaDefinition, generatedCandidate);
      default:
        throw new InvalidArgumentsError();
    }
  }

  /**
   * Validates the specified candidate and converts it to boolean if possible.
   *
   * @since 0.14.0
   * @param {string | boolean} candidate
   * @return {boolean}
   * @private
   */
  _validateAndProcessBooleanCandidate (candidate)
  {
    if (!_.isString(candidate) && !_.isBoolean(candidate))
    {
      throw new BadRequestError();
    }

    if (_.isString(candidate))
    {
      if (candidate === "true")
      {
        candidate = true;
      }
      else if (candidate === "false")
      {
        candidate = false;
      }
    }

    if (!_.isBoolean(candidate))
    {
      throw new BadRequestError();
    }

    return candidate;
  }

  /**
   * Validates the specified candidate and converts it to 32-bit integer number if possible.
   *
   * @since 0.14.0
   * @param {string | number} candidate
   * @return {Int32}
   * @private
   */
  _validateAndProcessIntCandidate (candidate)
  {
    if (!_.isString(candidate) && !utility.isValidNumber(candidate))
    {
      throw new BadRequestError();
    }

    candidate = new Int32(candidate);

    if (!utility.isValidNumber(candidate.value) || candidate.value % 1 !== 0)
    {
      throw new BadRequestError();
    }

    return candidate;
  }

  /**
   * Validates the specified candidate and converts it to 64-bit floating point number if possible.
   *
   * @since 0.14.0
   * @param {string | number} candidate
   * @return {Double}
   * @private
   */
  _validateAndProcessDoubleCandidate (candidate)
  {
    if (!_.isString(candidate) && !utility.isValidNumber(candidate))
    {
      throw new BadRequestError();
    }

    candidate = new Double(candidate);

    if (!utility.isValidNumber(candidate.value))
    {
      throw new BadRequestError();
    }

    return candidate;
  }

  /**
   * Validates the specified candidate.
   *
   * @since 0.14.0
   * @param {string} candidate
   * @return {string}
   * @private
   */
  _validateAndProcessStringCandidate (candidate)
  {
    if (!_.isString(candidate))
    {
      throw new BadRequestError();
    }

    return candidate;
  }

  /**
   * Validates the specified candidate and converts it to object ID if possible.
   *
   * @since 0.14.0
   * @param {string | ObjectId} candidate
   * @return {ObjectId}
   * @private
   */
  _validateAndProcessObjectIdCandidate (candidate)
  {
    if (!_.isString(candidate) && !(candidate instanceof ObjectId))
    {
      throw new BadRequestError();
    }

    if (_.isString(candidate))
    {
      const newValue = new ObjectId(candidate);

      if (newValue.toString() !== candidate)
      {
        throw new BadRequestError();
      }

      candidate = newValue;
    }

    return candidate;
  }

  /**
   * Validates the specified candidate and converts it to date object if possible.
   *
   * @since 0.14.0
   * @param {string | Date} candidate
   * @return {Date}
   * @private
   */
  _validateAndProcessDateCandidate (candidate)
  {
    if (!_.isString(candidate) && !utility.isValidDate(candidate))
    {
      throw new BadRequestError();
    }

    if (_.isString(candidate))
    {
      candidate = new Date(candidate);
    }

    return candidate;
  }

  /**
   * Validates the specified candidate deeply.
   *
   * @since 0.14.0
   * @param {Object} candidate
   * @param {Object} schemaDefinition
   * @param {Object} [generatedCandidate]
   * @return {Object}
   * @private
   */
  _validateAndProcessObjectCandidate (candidate, schemaDefinition, generatedCandidate = null)
  {
    if (!_.isPlainObject(candidate) ||
        !_.isPlainObject(schemaDefinition) ||
        (utility.isExist(generatedCandidate) && !_.isPlainObject(generatedCandidate)))
    {
      throw new InvalidArgumentsError();
    }

    if (!utility.isExist(generatedCandidate))
    {
      generatedCandidate = {};
    }

    const keys = Object.keys(candidate);

    for (let i = 0; i < keys.length; i++)
    {
      const key = keys[i];
      const value = candidate[key];

      if (!utility.isExist(schemaDefinition.properties[key]))
      {
        throw new BadRequestError();
      }

      switch (schemaDefinition.properties[key].bsonType)
      {
        case Schema.DataType.Boolean:
          generatedCandidate[key] = this._validateAndProcessBooleanCandidate(value);
          break;
        case Schema.DataType.Int:
          generatedCandidate[key] = this._validateAndProcessIntCandidate(value);
          break;
        case Schema.DataType.Double:
          generatedCandidate[key] = this._validateAndProcessDoubleCandidate(value);
          break;
        case Schema.DataType.String:
          generatedCandidate[key] = this._validateAndProcessStringCandidate(value);
          break;
        case Schema.DataType.ObjectId:
          generatedCandidate[key] = this._validateAndProcessObjectIdCandidate(value);
          break;
        case Schema.DataType.Date:
          generatedCandidate[key] = this._validateAndProcessDateCandidate(value);
          break;
        case Schema.DataType.Object:
          generatedCandidate[key] = this._validateAndProcessDocumentCandidate(value, schemaDefinition.properties[key], generatedCandidate[key]);
          break;
        case Schema.DataType.Array:
          generatedCandidate[key] = this._validateAndProcessArrayCandidate(value, schemaDefinition.properties[key], generatedCandidate[key]);
          break;
      }
    }

    return generatedCandidate;
  }

  /**
   * Validates the specified candidate deeply.
   *
   * @since 0.14.0
   * @param {Array} candidate
   * @param {Object} schemaDefinition
   * @param {Array} [generatedCandidate]
   * @return {Array}
   * @private
   */
  _validateAndProcessArrayCandidate (candidate, schemaDefinition, generatedCandidate = null)
  {
    if (!_.isArray(candidate) ||
        !_.isPlainObject(schemaDefinition) ||
        (utility.isExist(generatedCandidate) && !_.isArray(generatedCandidate)))
    {
      throw new InvalidArgumentsError();
    }

    if (!utility.isExist(generatedCandidate))
    {
      generatedCandidate = [];
    }

    for (let i = 0; i < candidate.length; i++)
    {
      const value = candidate[i];

      switch (schemaDefinition.items.bsonType)
      {
        case Schema.DataType.Boolean:
          generatedCandidate.push(this._validateAndProcessBooleanCandidate(value));
          break;
        case Schema.DataType.Int:
          generatedCandidate.push(this._validateAndProcessIntCandidate(value));
          break;
        case Schema.DataType.Double:
          generatedCandidate.push(this._validateAndProcessDoubleCandidate(value));
          break;
        case Schema.DataType.String:
          generatedCandidate.push(this._validateAndProcessStringCandidate(value));
          break;
        case Schema.DataType.ObjectId:
          generatedCandidate.push(this._validateAndProcessObjectIdCandidate(value));
          break;
        case Schema.DataType.Date:
          generatedCandidate.push(this._validateAndProcessDateCandidate(value));
          break;
        case Schema.DataType.Object:
          generatedCandidate.push({}); // an empty object should be pushed in order to pass by reference.
          this._validateAndProcessDocumentCandidate(value, schemaDefinition.items, generatedCandidate[generatedCandidate.length - 1]);
          break;
        case Schema.DataType.Array:
          generatedCandidate.push([]); // an empty array should be pushed in order to pass by reference.
          this._validateAndProcessDocumentCandidate(value, schemaDefinition.items, generatedCandidate[generatedCandidate.length - 1]);
          break;
      }
    }

    return generatedCandidate;
  }

  /**
   * Validates the specified version and converts it to integer number if possible.
   *
   * @since 0.14.0
   * @param {string | number} version
   * @return {number}
   * @private
   */
  _validateAndProcessVersion (version)
  {
    if (!_.isString(version) && !utility.isValidNumber(version))
    {
      throw new BadRequestError();
    }

    version = _.toNumber(version);

    if (!utility.isValidNumber(version) || version % 1 !== 0)
    {
      throw new BadRequestError();
    }

    return version;
  }

  /**
   * Hooks document candidate for the method `createOne`.
   * Runs afters the method `_validateAndProcessDocumentCandidate`.
   * Should be overridden.
   *
   * @since 0.20.0
   * @param {Object} documentCandidate
   * @return {Promise<Object>}
   * @protected
   */
  async _hookDocumentCandidateForCreateOne (documentCandidate)
  {
    if (!_.isPlainObject(documentCandidate))
    {
      throw new InvalidArgumentsError();
    }

    return documentCandidate;
  }

  /**
   * Hooks document candidate for the method `updateOne`.
   * Runs afters the method `_validateAndProcessDocumentCandidate`.
   * Should be overridden.
   *
   * @since 0.20.0
   * @param {Object} documentCandidate
   * @return {Promise<Object>}
   * @protected
   */
  async _hookDocumentCandidateForUpdateOne (documentCandidate)
  {
    if (!_.isPlainObject(documentCandidate))
    {
      throw new InvalidArgumentsError();
    }

    return documentCandidate;
  }

  /**
   * Hooks document candidate for the method `updateOneByIdAndVersion`.
   * Runs afters the method `_validateAndProcessDocumentCandidate`.
   * Should be overridden.
   *
   * @since 0.20.0
   * @param {Object} documentCandidate
   * @return {Promise<Object>}
   * @protected
   */
  async _hookDocumentCandidateForUpdateOneByIdAndVersion (documentCandidate)
  {
    if (!_.isPlainObject(documentCandidate))
    {
      throw new InvalidArgumentsError();
    }

    return documentCandidate;
  }
}

module.exports = Service;
