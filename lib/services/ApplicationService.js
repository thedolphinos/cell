"use strict";

const {InvalidArgumentsError, BadRequestError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");
const {ObjectId} = require("mongodb");
const mongoDotNotation = require("mongo-dot-notation");

const Schema = require("../db/Schema");
const DbOperation = require("../db/DbOperation");
const Service = require("../core/Service");

/**
 * Contains the service logic of the framework in application level.
 *
 * @since 0.14.0
 */
class ApplicationService extends Service
{
  /**
   * Creates an application service instance for the specified schema or database operation.
   * If a schema is provided, creates a database operation.
   *
   * @since 0.14.0
   * @param {Schema | DbOperation} schema_dbOperation
   */
  constructor (schema_dbOperation)
  {
    super();

    if (schema_dbOperation instanceof Schema)
    {
      this._dbOperation = new DbOperation(schema_dbOperation);
    }
    else if (schema_dbOperation instanceof DbOperation)
    {
      this._dbOperation = schema_dbOperation;
    }
    else
    {
      throw new InvalidArgumentsError();
    }
  }

  /**
   * Gets the related database operation.
   *
   * @since 0.21.0
   * @return {DbOperation}
   */
  get dbOperation ()
  {
    return this._dbOperation;
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

    query = this._adaptQuery(query);

    let documents = await this._dbOperation.read(query, options);
    documents = await this._hookResultOfRead(documents);

    return documents;
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

    query = this._adaptQuery(query);

    let document = await this._dbOperation.readOne(query, options);
    document = await this._hookResultOfReadOne(document);

    return document;
  }

  /**
   * Fetches the matching document with the specified ID and options.
   * This method is a specialized version of the method `readOne`. All hooks of it also is applied to this.
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

    _id = this._validateAndConvertObjectIdCandidate(_id);

    return await this.readOne({_id}, options);
  }

  /**
   * Fetches the matching document with the specified ID, version, and options.
   * This method is a specialized version of the method `readOne`. All hooks of it also is applied to this.
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

    _id = this._validateAndConvertObjectIdCandidate(_id);
    version = this._validateAndConvertVersion(version);

    const document = await this.readOne({_id}, options);

    this._verifyVersion(document.version, version);

    return document;
  }

  /**
   * Creates a document with the specified document candidate and options.
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

    documentCandidate = this._validateAndConvertDocumentCandidate(documentCandidate, this.dbOperation.schema.definition);
    documentCandidate = this._adaptDocumentCandidateForCreate(documentCandidate);

    let document = await this._dbOperation.createOne(documentCandidate, options);
    document = await this._hookResultOfCreateOne(document);

    return document;
  }

  /**
   * Updates the matching document (if there is only 1) with the specified query, document candidate, and options.
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

    query = this._adaptQuery(query);
    documentCandidate = this._validateAndConvertDocumentCandidate(documentCandidate, this.dbOperation.schema.definition);

    if (utility.isExist(options.session))
    {
      let documents = await this.read(query, options);
      documents = await this._hookReadResultOfUpdateOne(documents);
      const document = documents[0];

      documentCandidate = this._adaptDocumentCandidateForUpdate(documentCandidate, document);
      documentCandidate = this._convertDocumentCandidateFromObjectNotationToDotNotation(documentCandidate);

      let result = await this._dbOperation.getNativeOps().findOneAndUpdate({_id: document._id}, {$set: documentCandidate}, {
        ...options,
        returnOriginal: false
      });
      result = result.value;
      result = await this._hookResultOfUpdateOne(result);

      return result;
    }

    let result;
    let internalSession = this._startSession(); // if the session would not be created here, it must end where it begun

    try
    {
      await internalSession.withTransaction(async () =>
                                            {
                                              let documents = await this.read(query, options);
                                              documents = await this._hookReadResultOfUpdateOne(documents);
                                              const document = documents[0];

                                              documentCandidate = this._adaptDocumentCandidateForUpdate(documentCandidate, document);
                                              documentCandidate = this._convertDocumentCandidateFromObjectNotationToDotNotation(documentCandidate);

                                              let result = await this._dbOperation.getNativeOps().findOneAndUpdate({_id: document._id}, {$set: documentCandidate}, {
                                                ...options,
                                                session: internalSession,
                                                returnOriginal: false
                                              });
                                              result = result.value;
                                              result = await this._hookResultOfUpdateOne(result);
                                            }, this._dbOperation.transactionOptions);

      return result;
    }
    catch (error)
    {
      throw error;
    }
    finally
    {
      await internalSession.endSession();
    }
  }

  /**
   * Updates the matching document with the specified ID, version, document candidate, and options.
   * Uses transactions. If a session is not provided externally, creates one internally.
   * This method is a specialized version of the method `updateOne`. All hooks of it also is applied to this.
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

    _id = this._validateAndConvertObjectIdCandidate(_id);
    version = this._validateAndConvertVersion(version);
    documentCandidate = this._validateAndConvertDocumentCandidate(documentCandidate, this.dbOperation.schema.definition);

    if (utility.isExist(options.session))
    {
      const document = await this.updateOne({_id}, documentCandidate, options);

      this._verifyVersion(document.version - 1, version);

      return document;
    }

    let document;
    let internalSession = this._startSession(); // if the session would not be created here, it must end where it begun

    try
    {
      await internalSession.withTransaction(async () =>
                                            {
                                              document = await this.updateOne({_id}, documentCandidate, {
                                                ...options,
                                                session: internalSession
                                              });

                                              this._verifyVersion(document.version - 1, version);
                                            }, this._dbOperation.transactionOptions);

      return document;
    }
    catch (error)
    {
      throw error;
    }
    finally
    {
      await internalSession.endSession();
    }
  }

  /**
   * Soft deletes the matching document (if there is only 1) with the specified query and options.
   * Uses transactions. If a session is not provided externally, creates one internally.
   * This method is a specialized version of the method `updateOne`. All hooks of it also is applied to this.
   *
   * @since 0.17.0
   * @param {Object} query
   * @param {Object} [options]
   * @returns {Promise<Object>} - The soft deleted document.
   */
  async softDeleteOne (query, options = {})
  {
    if (!_.isPlainObject(query) ||
        !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    return await this.updateOne(query, this._generateDocumentPropertyCandidatesForSoftDelete(), options);
  }

  /**
   * Soft deletes the matching document with the specified ID, version, and options.
   * Uses transactions. If a session is not provided externally, creates one internally.
   * This method is a specialized version of the method `updateOneByIdAndVersion` and naturally `updateOne`. All hooks of it also is applied to this.
   *
   * @since 0.17.0
   * @param {string | ObjectId} _id
   * @param {string | number} version
   * @param {Object} [options]
   * @returns {Promise<Object>} - The soft deleted document.
   */
  async softDeleteOneByIdAndVersion (_id, version, options = {})
  {
    if (!_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    return await this.updateOneByIdAndVersion(_id, version, this._generateDocumentPropertyCandidatesForSoftDelete(), options);
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

    query = this._adaptQuery(query);

    if (utility.isExist(options.session))
    {
      let documents = await this.read(query, options);
      documents = await this._hookReadResultOfDeleteOne(documents);
      const document = documents[0];

      let result = await this._dbOperation.getNativeOps().findOneAndDelete({_id: document._id}, options);
      result = result.value;
      result = await this._hookResultOfDeleteOne(result);
      return document;
    }

    let result;
    let internalSession = this._startSession(); // if the session would not be created here, it must end where it begun

    try
    {
      await internalSession.withTransaction(async () =>
                                            {
                                              let documents = await this.read(query, options);
                                              documents = await this._hookReadResultOfUpdateOne(documents);
                                              const document = documents[0];

                                              result = await this._dbOperation.getNativeOps().findOneAndDelete({_id: document._id}, {
                                                ...options,
                                                session: internalSession
                                              });
                                              result = result.value;
                                              result = await this._hookResultOfDeleteOne(result);
                                            }, this._dbOperation.transactionOptions);

      return result;
    }
    catch (error)
    {
      throw error;
    }
    finally
    {
      await internalSession.endSession();
    }
  }

  /**
   * Deletes the matching document with the specified ID, version, and options.
   * Uses transactions. If a session is not provided externally, creates one internally.
   * This method is a specialized version of the method `deleteOne`. All hooks of it also is applied to this.
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

    if (utility.isExist(options.session))
    {
      const document = await this.readOneByIdAndVersion(_id, version, options);

      const result = await this._dbOperation.getNativeOps().findOneAndDelete({_id: document._id}, {
        ...options
      });

      return result.value;
    }

    let document;
    let internalSession = this._startSession(); // if the session would not be created here, it must end where it begun

    try
    {
      await internalSession.withTransaction(async () =>
                                            {
                                              document = await this.deleteOne({_id}, {
                                                ...options,
                                                session: internalSession
                                              });

                                              this._verifyVersion(document.version - 1, version);
                                            }, this._dbOperation.transactionOptions);

      return document;
    }
    catch (error)
    {
      throw error;
    }
    finally
    {
      await internalSession.endSession();
    }
  }

  /* ADAPT TO DATABASE OPERATION */
  /**
   * Converts the specified document candidate from object notation to dot notation.
   *
   * @since 0.21.0
   * @param {Object} documentCandidate
   * @return {Object}
   * @protected
   */
  _convertDocumentCandidateFromObjectNotationToDotNotation (documentCandidate)
  {
    if (!_.isPlainObject(documentCandidate))
    {
      throw new InvalidArgumentsError();
    }

    const convertedDocumentCandidate = mongoDotNotation.flatten(documentCandidate);

    return convertedDocumentCandidate.$set;
  }

  /* ADAPT */
  /**
   * Adapts query to application logic.
   *
   * @since 0.22.0
   * @param {Object} query
   * @return {Object}
   * @protected
   */
  _adaptQuery (query)
  {
    if (!_.isPlainObject(query))
    {
      throw new InvalidArgumentsError();
    }

    return {
      ...query,
      isSoftDeleted: false
    };
  }

  /**
   * Adapts document candidate to application logic for create operations.
   *
   * @since 0.22.0
   * @param {Object} documentCandidate
   * @return {Object}
   * @protected
   */
  _adaptDocumentCandidateForCreate (documentCandidate)
  {
    if (!_.isPlainObject(documentCandidate))
    {
      throw new InvalidArgumentsError();
    }

    return {
      ...documentCandidate,
      version: 0,
      isSoftDeleted: false
    };
  }

  /**
   * Adapts document candidate to application logic for update operations.
   *
   * @since 0.22.0
   * @param {Object} documentCandidate
   * @param {Object} document
   * @return {Object}
   * @protected
   */
  _adaptDocumentCandidateForUpdate (documentCandidate, document)
  {
    if (!_.isPlainObject(documentCandidate))
    {
      throw new InvalidArgumentsError();
    }

    return {
      ...documentCandidate,
      version: document.version + 1
    };
  }

  /**
   * Generates document property candidates which are adapted to application logic for soft delete operations.
   *
   * @since 0.22.0
   * @return {Object}
   * @protected
   */
  _generateDocumentPropertyCandidatesForSoftDelete ()
  {
    return {
      isSoftDeleted: true
    };
  }

  /* VERIFY */
  /**
   * Verifies the specified version.
   *
   * @since 0.22.0
   * @param {number} documentVersion
   * @param {number} version
   * @protected
   */
  _verifyVersion (documentVersion, version)
  {
    if (!utility.isValidNumber(documentVersion) ||
        !utility.isValidNumber(version))
    {
      throw new InvalidArgumentsError();
    }

    if (documentVersion < version)
    {
      throw new BadRequestError(`The requested document's latest version is ${documentVersion}. You have the version ${version}.`);
    }
    else if (documentVersion > version)
    {
      throw new BadRequestError(`The requested document has been modified. The latest version is ${documentVersion}. You have the version ${version}.`);
    }
  }

  /* HOOKS */
  /**
   * Hooks to result for the method `read`.
   *
   * @since 0.22.0
   * @param {Array<Object>} documents
   * @protected
   */
  async _hookResultOfRead (documents)
  {
    if (!_.isArray(documents))
    {
      throw new InvalidArgumentsError();
    }

    return documents;
  }

  /**
   * Hooks to result for the method `readOne`.
   *
   * @since 0.22.0
   * @param {Object} document
   * @protected
   */
  async _hookResultOfReadOne (document)
  {
    // since result may be null, it must be checked if exists.
    if (utility.isExist(document) && !_.isObject(document))
    {
      throw new InvalidArgumentsError();
    }

    return document;
  }

  /**
   * Hooks to result for the method `createOne`.
   *
   * @since 0.22.0
   * @param {Object} document
   * @protected
   */
  async _hookResultOfCreateOne (document)
  {
    if (!_.isObject(document))
    {
      throw new InvalidArgumentsError();
    }

    return document;
  }

  /**
   * Hooks to read result for the method `updateOne`.
   *
   * @since 0.22.0
   * @param {Array<Object>} documents
   * @protected
   */
  async _hookReadResultOfUpdateOne (documents)
  {
    if (!_.isArray(documents))
    {
      throw new InvalidArgumentsError();
    }

    return documents;
  }

  /**
   * Hooks to result for the method `updateOne`.
   *
   * @since 0.22.0
   * @param {Object} document
   * @protected
   */
  async _hookResultOfUpdateOne (document)
  {
    // since result may be null, it must be checked if exists.
    if (utility.isExist(document) && !_.isObject(document))
    {
      throw new InvalidArgumentsError();
    }

    return document;
  }

  /**
   * Hooks to read result for the method `deleteOne`.
   *
   * @since 0.22.0
   * @param {Array<Object>} documents
   * @protected
   */
  async _hookReadResultOfDeleteOne (documents)
  {
    if (!_.isArray(documents))
    {
      throw new InvalidArgumentsError();
    }

    return documents;
  }

  /**
   * Hooks to result for the method `deleteOne`.
   *
   * @since 0.22.0
   * @param {Object} document
   * @protected
   */
  async _hookResultOfDeleteOne (document)
  {
    // since result may be null, it must be checked if exists.
    if (utility.isExist(document) && !_.isObject(document))
    {
      throw new InvalidArgumentsError();
    }

    return document;
  }
}

module.exports = ApplicationService;
