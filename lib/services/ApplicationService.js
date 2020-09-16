"use strict";

const {
  DeveloperError,
  InvalidArgumentsError,
  DocumentNotFoundError,
  MoreThan1DocumentFoundError,
  BadRequestError
} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");
const {ObjectId} = require("mongodb");
const mongoDotNotation = require("mongo-dot-notation");

const DbConnectionSafe = require("../safes/DbConnectionSafe");
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
   * @param {boolean} [isCrudControllerApplicationService]
   */
  constructor (schema_dbOperation, isCrudControllerApplicationService = false)
  {
    super();

    if (!_.isBoolean(isCrudControllerApplicationService))
    {
      throw new InvalidArgumentsError();
    }

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

    this._isCrudControllerApplicationService = isCrudControllerApplicationService;
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
   * @param {Object} [hooks]
   *        session: () -> session
   *        query  : (query, [session]) -> query
   *        before : (query, [session]) -> void
   *        after  : (documents, [session]) -> void
   * @returns {Promise<Array>} - The fetched documents.
   */
  async read (query, options = {}, hooks = {})
  {
    if (!_.isPlainObject(query) ||
        !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    if (utility.isExist(options.session) && utility.isExist(hooks.session))
    {
      throw new DeveloperError("A hook for session is already attached in CRUD controller service. You are trying to attach another one in application service. You must not do this!");
    }

    let documents;

    query = this._adaptQuery(query);

    // a session started in CRUD controller service, it must end there
    if (utility.isExist(options.session))
    {
      const session = options.session;

      utility.isExist(hooks.query) ? query = await hooks.query(query, session) : query;

      utility.isExist(hooks.before) ? await hooks.before(query, session) : null;
      documents = await this._dbOperation.read(query, {
        ...options,
        session
      });
      utility.isExist(hooks.after) ? await hooks.after(documents, session) : null;
    }
    else
    {
      // a session started here, it must end here
      if (utility.isExist(hooks.session))
      {
        const session = hooks.session;

        try
        {
          await session.withTransaction(async () =>
                                        {
                                          utility.isExist(hooks.query) ? query = await hooks.query(query, session) : query;

                                          utility.isExist(hooks.before) ? await hooks.before(query, session) : null;
                                          documents = await this._dbOperation.read(query, {
                                            ...options,
                                            session
                                          });
                                          utility.isExist(hooks.after) ? await hooks.after(documents, session) : null;
                                        }, this._dbOperation.transactionOptions);
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
      // no session
      else
      {
        utility.isExist(hooks.query) ? query = await hooks.query(query) : query;

        utility.isExist(hooks.before) ? await hooks.before(query) : null;
        documents = await this._dbOperation.read(query, options);
        utility.isExist(hooks.after) ? await hooks.after(documents) : null;
      }
    }

    return documents;
  }

  /**
   * Fetches the first matching document with the specified query and options.
   *
   * @since 0.14.0
   * @param {Object} query
   * @param {Object} [options]
   * @param {Object} [hooks]
   *        session: () -> session
   *        query  : (query, [session]) -> query
   *        before : (query, [session]) -> void
   *        after  : (documents, [session]) -> void
   * @returns {Promise<Object>} - The fetched document.
   */
  async readOne (query, options = {}, hooks = {})
  {
    if (!_.isPlainObject(query) ||
        !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    if (utility.isExist(options.session) && utility.isExist(hooks.session))
    {
      throw new DeveloperError("A hook for session is already attached in CRUD controller service. You are trying to attach another one in application service. You must not do this!");
    }

    let document;

    query = this._adaptQuery(query);

    // a session started in CRUD controller service, it must end there
    if (utility.isExist(options.session))
    {
      const session = options.session;

      utility.isExist(hooks.query) ? query = await hooks.query(query, session) : query;

      utility.isExist(hooks.before) ? await hooks.before(query, session) : null;
      document = await this._dbOperation.readOne(query, {
        ...options,
        session
      });
      utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
    }
    else
    {
      // a session started here, it must end here
      if (utility.isExist(hooks.session))
      {
        const session = hooks.session;

        try
        {
          await session.withTransaction(async () =>
                                        {
                                          utility.isExist(hooks.query) ? query = await hooks.query(query, session) : query;

                                          utility.isExist(hooks.before) ? await hooks.before(query, session) : null;
                                          document = await this._dbOperation.readOne(query, {
                                            ...options,
                                            session
                                          });
                                          utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                                        }, this._dbOperation.transactionOptions);
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
      // no session
      else
      {
        utility.isExist(hooks.query) ? query = await hooks.query(query) : query;

        utility.isExist(hooks.before) ? await hooks.before(query) : null;
        document = await this._dbOperation.readOne(query, options);
        utility.isExist(hooks.after) ? await hooks.after(document) : null;
      }
    }

    if (this._isCrudControllerApplicationService &&
        !utility.isExist(document))
    {
      throw new DocumentNotFoundError();
    }

    return document;
  }

  /**
   * Fetches the matching document with the specified ID and options.
   * This method is a specialized version of the method `readOne`. All hooks of it also is applied to this.
   *
   * @since 0.15.0
   * @param {string | ObjectId} _id
   * @param {Object} [options]
   * @param {Object} [hooks]
   *        session: () -> session
   *        query  : (query, [session]) -> query
   *        before : (query, [session]) -> void
   *        after  : (document, [session]) -> void
   * @returns {Promise<Object>} - The fetched document.
   */
  async readOneById (_id, options = {}, hooks = {})
  {
    if (!_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    _id = this._validateAndConvertObjectIdCandidate(_id);

    return await this.readOne({_id}, options, hooks);
  }

  /**
   * Fetches the matching document with the specified ID, version, and options.
   * This method is a specialized version of the method `readOne`. All hooks of it also is applied to this.
   *
   * @since 0.19.0
   * @param {string | ObjectId} _id
   * @param {string | number} version
   * @param {Object} [options]
   * @param {Object} [hooks]
   *        session: () -> session
   *        query  : (query, [session]) -> query
   *        before : (query, [session]) -> void
   *        after  : (document, [session]) -> void
   * @returns {Promise<Object>} - The fetched document.
   */
  async readOneByIdAndVersion (_id, version, options = {}, hooks = {})
  {
    if (!_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    _id = this._validateAndConvertObjectIdCandidate(_id);
    version = this._validateAndConvertVersion(version);

    const document = await this.readOne({_id}, options, hooks);

    this._checkVersion(document.version, version);

    return document;
  }

  /**
   * Creates a document with the specified document candidate and options.
   *
   * @since 0.14.0
   * @param {Object} documentCandidate
   * @param {Object} [options]
   * @param {Object} [hooks]
   *        session          : () -> session
   *        documentCandidate: (documentCandidate, [session]) -> documentCandidate
   *        before           : (query, [session]) -> void
   *        after            : (document, [session]) -> void
   * @returns {Promise<Object>} - The created document.
   */
  async createOne (documentCandidate, options = {}, hooks = {})
  {
    if (!_.isPlainObject(documentCandidate) ||
        !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    if (utility.isExist(options.session) && utility.isExist(hooks.session))
    {
      throw new DeveloperError("A hook for session is already attached in CRUD controller service. You are trying to attach another one in application service. You must not do this!");
    }

    documentCandidate = this._validateAndConvertDocumentCandidate(documentCandidate, this.dbOperation.schema.definition);
    documentCandidate = this._adaptDocumentCandidateForCreate(documentCandidate);

    let document;

    // a session started in CRUD controller service, it must end there
    if (utility.isExist(options.session))
    {
      const session = options.session;

      utility.isExist(hooks.documentCandidate) ? documentCandidate = await hooks.documentCandidate(documentCandidate, session) : documentCandidate;

      utility.isExist(hooks.before) ? await hooks.before(documentCandidate, session) : null;
      document = await this._dbOperation.createOne(documentCandidate, {
        ...options,
        session
      });
      utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
    }
    else
    {
      // a session started here, it must end here
      if (utility.isExist(hooks.session))
      {
        const session = hooks.session;

        try
        {
          await session.withTransaction(async () =>
                                        {
                                          utility.isExist(hooks.documentCandidate) ? documentCandidate = await hooks.documentCandidate(documentCandidate, session) : documentCandidate;

                                          utility.isExist(hooks.before) ? await hooks.before(documentCandidate, session) : null;
                                          document = await this._dbOperation.createOne(documentCandidate, {
                                            ...options,
                                            session
                                          });
                                          utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                                        }, this._dbOperation.transactionOptions);
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
      // no session
      else
      {
        utility.isExist(hooks.before) ? await hooks.before(documentCandidate) : null;
        document = await this._dbOperation.createOne(documentCandidate, options);
        utility.isExist(hooks.after) ? await hooks.after(document) : null;
      }
    }

    return document;
  }

  /**
   * Partially updates the matching document (if there is only 1) with the specified query, document candidate, and options.
   * Uses transactions. If a session is not provided externally, creates one internally.
   *
   * @since 0.8.0
   * @param {Object} query
   * @param {Object} documentCandidate
   * @param {Object} [options]
   * @param {Object} [hooks]
   *        query            : (query, [session]) -> query
   *        documentCandidate: (documentCandidate, [session]) -> documentCandidate
   *        before           : (query, document, documentCandidate, [session]) -> void
   *        after            : (document, [session]) -> void
   * @returns {Promise<Object>} - The updated document.
   */
  async partialUpdateOne (query, documentCandidate, options = {}, hooks = {})
  {
    if (!_.isPlainObject(query) ||
        !_.isPlainObject(documentCandidate) ||
        !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    if (utility.isExist(options.session) && utility.isExist(hooks.session))
    {
      throw new DeveloperError("A hook for session is already attached in CRUD controller service. You are trying to attach another one in application service. You must not do this!");
    }

    let document;

    query = this._adaptQuery(query);
    documentCandidate = this._validateAndConvertDocumentCandidate(documentCandidate, this.dbOperation.schema.definition);

    // a session started in CRUD controller service, it must end there
    if (utility.isExist(options.session))
    {
      const session = options.session;

      utility.isExist(hooks.query) ? query = await hooks.query(query) : query;

      const documents = await this.read(query, {
        ...options,
        session
      });
      document = this._checkDocumentSingularity(documents);

      if (!utility.isExist(document))
      {
        return;
      }

      utility.isExist(hooks.documentCandidate) ? documentCandidate = await hooks.documentCandidate(documentCandidate, session) : documentCandidate;
      documentCandidate = this._adaptDocumentCandidateForUpdate(documentCandidate, document);

      utility.isExist(hooks.before) ? await hooks.before(query, document, documentCandidate, session) : null;
      document = (await this._dbOperation.getNativeOps().findOneAndUpdate({_id: document._id}, this._prepareUpdateOperation(documentCandidate), {
        ...options,
        session,
        returnOriginal: false
      })).value;
      utility.isExist(hooks.after) ? await hooks.after(documents, session) : null;
    }
    else
    {
      // an internal session must be created here
      const session = DbConnectionSafe.get().mongoClient.startSession();

      try
      {
        await session.withTransaction(async () =>
                                      {
                                        utility.isExist(hooks.query) ? query = await hooks.query(query, session) : query;

                                        const documents = await this.read(query, {
                                          ...options,
                                          session
                                        });
                                        document = this._checkDocumentSingularity(documents);

                                        if (!utility.isExist(document))
                                        {
                                          return;
                                        }

                                        utility.isExist(hooks.documentCandidate) ? documentCandidate = await hooks.documentCandidate(documentCandidate, session) : documentCandidate;
                                        documentCandidate = this._adaptDocumentCandidateForUpdate(documentCandidate, document);

                                        utility.isExist(hooks.before) ? await hooks.before(query, documentCandidate, session) : null;
                                        document = (await this._dbOperation.getNativeOps().findOneAndUpdate({_id: document._id}, this._prepareUpdateOperation(documentCandidate), {
                                          ...options,
                                          session,
                                          returnOriginal: false
                                        })).value;
                                        utility.isExist(hooks.after) ? await hooks.after(documents, session) : null;
                                      }, this._dbOperation.transactionOptions);
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

    return document;
  }

  /**
   * Partially updates the matching document with the specified ID, version, document candidate, and options.
   * This method is a specialized version of the method `partialUpdateOne`. All hooks of it also is applied to this.
   *
   * @since 0.16.0
   * @param {string | ObjectId} _id
   * @param {string | number} version
   * @param {Object} documentCandidate
   * @param {Object} [options]
   * @param {Object} [hooks]
   *        query            : (query, [session]) -> query
   *        documentCandidate: (documentCandidate, [session]) -> documentCandidate
   *        before           : (query, document, documentCandidate, [session]) -> void
   *        after            : (document, [session]) -> void
   * @returns {Promise<Object>} - The updated document.
   */
  async partialUpdateOneByIdAndVersion (_id, version, documentCandidate, options = {}, hooks = {})
  {
    if (!_.isPlainObject(documentCandidate) ||
        !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    _id = this._validateAndConvertObjectIdCandidate(_id);
    version = this._validateAndConvertVersion(version);
    documentCandidate = this._validateAndConvertDocumentCandidate(documentCandidate, this.dbOperation.schema.definition);

    const document = await this.partialUpdateOne({_id}, documentCandidate, options, hooks);

    this._checkVersion(document.version - 1, version);

    return document;
  }

  /**
   * Soft deletes the matching document (if there is only 1) with the specified query and options.
   * This method is a specialized version of the method `partialUpdateOne`. All hooks of it also is applied to this.
   *
   * @since 0.17.0
   * @param {Object} query
   * @param {Object} [options]
   * @param {Object} [hooks]
   *        query            : (query, [session]) -> query
   *        documentCandidate: (documentCandidate, [session]) -> documentCandidate
   *        before           : (query, documentCandidate, [session]) -> void
   *        after            : (document, [session]) -> void
   * @returns {Promise<Object>} - The soft deleted document.
   */
  async softDeleteOne (query, options = {}, hooks = {})
  {
    if (!_.isPlainObject(query) ||
        !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    return await this.partialUpdateOne(query, this._generateDocumentPropertyCandidatesForSoftDelete(), options, hooks);
  }

  /**
   * Soft deletes the matching document with the specified ID, version, and options.
   * This method is a specialized version of the method `partialUpdateOneByIdAndVersion` and naturally `partialUpdateOne`. All hooks of it also is applied to this.
   *
   * @since 0.17.0
   * @param {string | ObjectId} _id
   * @param {string | number} version
   * @param {Object} [options]
   * @param {Object} [hooks]
   *        query            : (query, [session]) -> query
   *        documentCandidate: (documentCandidate, [session]) -> documentCandidate
   *        before           : (query, documentCandidate, [session]) -> void
   *        after            : (document, [session]) -> void
   * @returns {Promise<Object>} - The soft deleted document.
   */
  async softDeleteOneByIdAndVersion (_id, version, options = {}, hooks = {})
  {
    if (!_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    return await this.partialUpdateOneByIdAndVersion(_id, version, this._generateDocumentPropertyCandidatesForSoftDelete(), options, hooks);
  }

  /**
   * Deletes the matching document (if there is only 1) with the specified query and options.
   * Uses transactions. If a session is not provided externally, creates one internally.
   *
   * @since 0.8.0
   * @param {Object} query
   * @param {Object} [options]
   * @param {Object} [hooks]
   *        session          : () -> session
   *        query            : (query, [session]) -> query
   *        before           : (query, [session]) -> void
   *        after            : (document, [session]) -> void
   * @returns {Promise<Object>} - The deleted document.
   */
  async deleteOne (query, options = {}, hooks = {})
  {
    if (!_.isPlainObject(query) ||
        !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    if (utility.isExist(options.session) && utility.isExist(hooks.session))
    {
      throw new DeveloperError("A hook for session is already attached in CRUD controller service. You are trying to attach another one in application service. You must not do this!");
    }

    let document;

    query = this._adaptQuery(query);

    // a session started in CRUD controller service, it must end there
    if (utility.isExist(options.session))
    {
      const session = options.session;

      utility.isExist(hooks.query) ? query = await hooks.query(query, session) : query;

      const documents = await this.read(query, {
        ...options,
        session
      });
      document = this._checkDocumentSingularity(documents);

      if (!utility.isExist(document))
      {
        return;
      }

      utility.isExist(hooks.before) ? await hooks.before(query, session) : null;
      document = (await this._dbOperation.getNativeOps().findOneAndDelete({_id: document._id}, {
        ...options,
        session
      })).value;
      utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
    }
    else
    {
      // an internal session must be created here
      const session = DbConnectionSafe.get().mongoClient.startSession();

      try
      {
        await session.withTransaction(async () =>
                                      {
                                        utility.isExist(hooks.query) ? query = await hooks.query(query, session) : query;

                                        const documents = await this.read(query, {
                                          ...options,
                                          session
                                        });
                                        document = this._checkDocumentSingularity(documents);

                                        if (!utility.isExist(document))
                                        {
                                          return;
                                        }

                                        utility.isExist(hooks.before) ? await hooks.before(query, session) : null;
                                        document = (await this._dbOperation.getNativeOps().findOneAndDelete({_id: document._id}, {
                                          ...options,
                                          session
                                        })).value;
                                        utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                                      }, this._dbOperation.transactionOptions);
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

    return document;
  }

  /**
   * Deletes the matching document with the specified ID, version, and options.
   * This method is a specialized version of the method `deleteOne`. All hooks of it also is applied to this.
   *
   * @since 0.18.0
   * @param {string | ObjectId} _id
   * @param {string | number} version
   * @param {Object} [options]
   * @param {Object} [hooks]
   *        session          : () -> session
   *        query            : (query, [session]) -> query
   *        before           : (query, [session]) -> void
   *        after            : (document, [session]) -> void
   * @returns {Promise<Object>} - The deleted document.
   */
  async deleteOneByIdAndVersion (_id, version, options = {}, hooks = {})
  {
    if (!_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    _id = this._validateAndConvertObjectIdCandidate(_id);
    version = this._validateAndConvertVersion(version);

    const document = await this.deleteOne({_id}, options, hooks);

    this._checkVersion(document.version - 1, version);

    return document;
  }

  /* ADAPT TO DATABASE OPERATION */
  /**
   * Prepares the necessary update operation according to the specified document candidate.
   * Converts the specified document candidate from object notation to dot notation.
   * If a value is not specified, place key to the unset operation.
   *
   * @since 0.21.0
   * @param {Object} documentCandidate
   * @return {Object}
   * @protected
   */
  _prepareUpdateOperation (documentCandidate)
  {
    if (!_.isPlainObject(documentCandidate))
    {
      throw new InvalidArgumentsError();
    }

    let convertedDocumentCandidate = mongoDotNotation.flatten(documentCandidate);
    convertedDocumentCandidate = convertedDocumentCandidate.$set;

    for (const key in convertedDocumentCandidate)
    {
      if (!utility.isExist(convertedDocumentCandidate[key]))
      {
        convertedDocumentCandidate[key] = mongoDotNotation.$unset();
      }
    }

    return mongoDotNotation.flatten(convertedDocumentCandidate);
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

    if (utility.isExist(query.$query))
    {
      if (!utility.isInitialized(query.$query))
      {
        query.$query = {};
      }

      query.$query.isSoftDeleted = false;
    }
    else
    {
      query.isSoftDeleted = false;
    }

    return query;
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
    if (!_.isPlainObject(documentCandidate) ||
        !_.isPlainObject(document))
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
  _checkVersion (documentVersion, version)
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

  /**
   * Checks document singularity in multi step operations.
   *
   * @since 0.49.0
   * @param {Array<Object>} documents
   * @returns {Object}
   * @private
   */
  _checkDocumentSingularity (documents)
  {
    if (!_.isArray(documents))
    {
      throw new InvalidArgumentsError();
    }

    if (this._isCrudControllerApplicationService)
    {
      switch (documents.length)
      {
        case 0:
          throw new DocumentNotFoundError();
        case 1:
          break;
        default:
          throw new MoreThan1DocumentFoundError();
      }
    }

    return documents[0];
  }
}

module.exports = ApplicationService;
