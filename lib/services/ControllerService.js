"use strict";

const {InvalidArgumentsError, BadRequestError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");
const {ObjectId} = require("mongodb");

const DbConnectionSafe = require("../safes/DbConnectionSafe");
const LanguageSafe = require("../safes/LanguageSafe");
const Schema = require("../db/Schema");
const DbOperation = require("../db/DbOperation");
const Service = require("../core/Service");
const ApplicationService = require("../services/ApplicationService");

/**
 * Contains the service CRUD logic of the framework in controller level.
 */
class ControllerService extends Service
{
  /**
   * Creates a controller service instance for the specified schema, database operation, or application service.
   * If a schema or database operation is provided, creates an application operation.
   *
   * @param {Schema | DbOperation | ApplicationService} schema_dbOperation_applicationService
   */
  constructor (schema_dbOperation_applicationService)
  {
    super();

    if (schema_dbOperation_applicationService instanceof Schema ||
        schema_dbOperation_applicationService instanceof DbOperation)
    {
      this._applicationService = new ApplicationService(schema_dbOperation_applicationService);
    }
    else if (schema_dbOperation_applicationService instanceof ApplicationService)
    {
      this._applicationService = schema_dbOperation_applicationService;
    }
    else
    {
      throw new InvalidArgumentsError();
    }
  }

  /**
   * @return {ApplicationService}
   */
  get applicationService ()
  {
    return this._applicationService;
  }

  /**
   * @return {DbOperation}
   */
  get dbOperation ()
  {
    return this._applicationService.dbOperation;
  }

  /**
   * @return {Schema}
   */
  get schema ()
  {
    return this.dbOperation.schema;
  }

  /**
   * Fetches the matching documents with the specified query and options.
   *
   * @param {Object} query
   * @param {Object} [session]
   * @param {{session: Function, query: Function, before: Function, after: Function}} [hooks]
   * @returns {Promise<Array>} - The fetched documents.
   */
  async read (query, session = null, hooks = {})
  {
    if (!_.isPlainObject(query) ||
        (utility.isExist(session) && !_.isObject(session)))
    {
      throw new InvalidArgumentsError();
    }

    let documents;

    // a session started in CRUD controller, it must end there
    if (utility.isExist(session))
    {
      utility.isExist(hooks.query) ? query = await hooks.query(query, session) : query;

      utility.isExist(hooks.before) ? await hooks.before(query, session) : null;
      documents = await this._applicationService.read(query, {session});
      utility.isExist(hooks.after) ? await hooks.after(documents, session) : null;
    }
    else
    {
      // a session started here, it must end here
      if (hooks.session)
      {
        const session = DbConnectionSafe.get().mongoClient.startSession();

        try
        {
          await session.withTransaction(async () =>
                                        {
                                          utility.isExist(hooks.query) ? query = await hooks.query(query, session) : query;

                                          utility.isExist(hooks.before) ? await hooks.before(query, session) : null;
                                          documents = await this._applicationService.read(query, {session});
                                          utility.isExist(hooks.after) ? await hooks.after(documents, session) : null;
                                        }, this.dbOperation.transactionOptions);
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
        documents = await this._applicationService.read(query);
        utility.isExist(hooks.after) ? await hooks.after(documents) : null;
      }
    }

    return documents;
  }

  /**
   * Fetches the matching document with the specified ID and options.
   *
   * @param {string | ObjectId} _id
   * @param {Object} [session]
   * @param {{session: Function, before: Function, after: Function}} [hooks]
   * @returns {Promise<Object>} - The fetched document.
   */
  async readOneById (_id, session = null, hooks = {})
  {
    if (utility.isExist(session) && !_.isObject(session))
    {
      throw new InvalidArgumentsError();
    }

    _id = this._validateAndConvertObjectIdCandidate(_id);

    let document;

    // a session started in CRUD controller, it must end there
    if (utility.isExist(session))
    {
      utility.isExist(hooks.before) ? await hooks.before(query, session) : null;
      document = await this._applicationService.readOneById(_id, {session});
      utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
    }
    else
    {
      // a session started here, it must end here
      if (hooks.session)
      {
        const session = DbConnectionSafe.get().mongoClient.startSession();

        try
        {
          await session.withTransaction(async () =>
                                        {
                                          utility.isExist(hooks.before) ? await hooks.before(query, session) : null;
                                          document = await this._applicationService.readOneById(_id, {session});
                                          utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                                        }, this.dbOperation.transactionOptions);
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
        utility.isExist(hooks.before) ? await hooks.before(query) : null;
        document = await this._applicationService.readOneById(_id);
        utility.isExist(hooks.after) ? await hooks.after(document) : null;
      }
    }

    return document;
  }

  /**
   * Creates a document with the specified document candidate and options.
   *
   * @param {Object} documentCandidate
   * @param {Object} [session]
   * @param {{session: Function, documentCandidate: Function, before: Function, after: Function}} [hooks]
   * @returns {Promise<Object>} - The created document.
   */
  async createOne (documentCandidate, session = null, hooks = {})
  {
    if (!_.isPlainObject(documentCandidate) ||
        (utility.isExist(session) && !_.isObject(session)))
    {
      throw new InvalidArgumentsError();
    }

    this._authorizeDocumentCandidate(documentCandidate, this.schema.definition, Schema.CONTROLLER_OPERATION.createOne);
    documentCandidate = this._validateAndConvertDocumentCandidate(documentCandidate, this.schema.definition);

    let document;

    // a session started in CRUD controller, it must end there
    if (utility.isExist(session))
    {
      utility.isExist(hooks.documentCandidate) ? await hooks.documentCandidate(documentCandidate, session) : documentCandidate;

      utility.isExist(hooks.before) ? await hooks.before(documentCandidate, session) : null;
      document = await this._applicationService.createOne(documentCandidate, {session});
      utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
    }
    else
    {
      // a session started here, it must end here
      if (hooks.session)
      {
        const session = DbConnectionSafe.get().mongoClient.startSession();

        try
        {
          await session.withTransaction(async () =>
                                        {
                                          utility.isExist(hooks.documentCandidate) ? await hooks.documentCandidate(documentCandidate, session) : documentCandidate;

                                          utility.isExist(hooks.before) ? await hooks.before(documentCandidate, session) : null;
                                          document = await this._applicationService.createOne(documentCandidate, {session});
                                          utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                                        }, this.dbOperation.transactionOptions);
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
        utility.isExist(hooks.documentCandidate) ? await hooks.documentCandidate(documentCandidate) : documentCandidate;

        utility.isExist(hooks.before) ? await hooks.before(documentCandidate) : null;
        document = await this._applicationService.createOne(documentCandidate);
        utility.isExist(hooks.after) ? await hooks.after(document) : null;
      }
    }

    return document;
  }

  /**
   * Updates the matching document with the specified ID, version, document candidate, and options.
   *
   * @param {string | ObjectId} _id
   * @param {string | number} version
   * @param {Object} documentCandidate
   * @param {Object} [session]
   * @param {{session: Function, documentCandidate: Function, before: Function, after: Function}} [hooks]
   * @return {Promise<Object>}
   */
  async updateOneByIdAndVersion (_id, version, documentCandidate, session = null, hooks = {})
  {
    if (utility.isExist(session) && !_.isObject(session))
    {
      throw new InvalidArgumentsError();
    }

    _id = this._validateAndConvertObjectIdCandidate(_id);
    version = this._validateAndConvertVersion(version);
    this._authorizeDocumentCandidate(documentCandidate, this.schema.definition, Schema.CONTROLLER_OPERATION.updateOneByIdAndVersion);
    documentCandidate = this._validateAndConvertDocumentCandidate(documentCandidate, this.schema.definition);

    let document;

    // a session started in CRUD controller, it must end there
    if (utility.isExist(session))
    {
      utility.isExist(hooks.documentCandidate) ? await hooks.documentCandidate(documentCandidate, session) : documentCandidate;

      utility.isExist(hooks.before) ? await hooks.before(documentCandidate, session) : null;
      document = await this._applicationService.updateOneByIdAndVersion(_id, version, documentCandidate, {session});
      utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
    }
    else
    {
      // a session started here, it must end here
      if (hooks.session)
      {
        const session = DbConnectionSafe.get().mongoClient.startSession();

        try
        {
          await session.withTransaction(async () =>
                                        {
                                          utility.isExist(hooks.documentCandidate) ? await hooks.documentCandidate(documentCandidate, session) : documentCandidate;

                                          utility.isExist(hooks.before) ? await hooks.before(_id, version, documentCandidate, session) : null;
                                          document = await this._applicationService.updateOneByIdAndVersion(_id, version, documentCandidate, {session});
                                          utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                                        }, this.dbOperation.transactionOptions);
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
        utility.isExist(hooks.documentCandidate) ? await hooks.documentCandidate(documentCandidate) : documentCandidate;

        utility.isExist(hooks.before) ? await hooks.before(documentCandidate) : null;
        document = await this._applicationService.updateOneByIdAndVersion(_id, version, documentCandidate);
        utility.isExist(hooks.after) ? await hooks.after(document) : null;
      }
    }

    return document;
  }

  /**
   * Replaces the matching document with the specified ID, version, document candidate, and options.
   *
   * @param {string | ObjectId} _id
   * @param {string | number} version
   * @param {Object} documentCandidate
   * @param {Object} [session]
   * @param {{session: Function, documentCandidate: Function, before: Function, after: Function}} [hooks]
   * @return {Promise<Object>}
   */
  async replaceOneByIdAndVersion (_id, version, documentCandidate, session = null, hooks = {})
  {
    if (utility.isExist(session) && !_.isObject(session))
    {
      throw new InvalidArgumentsError();
    }

    _id = this._validateAndConvertObjectIdCandidate(_id);
    version = this._validateAndConvertVersion(version);
    this._authorizeDocumentCandidate(documentCandidate, this.schema.definition, Schema.CONTROLLER_OPERATION.replaceOneByIdAndVersion);
    documentCandidate = this._validateAndConvertDocumentCandidate(documentCandidate, this.schema.definition);

    let document;

    // a session started in CRUD controller, it must end there
    if (utility.isExist(session))
    {
      utility.isExist(hooks.documentCandidate) ? await hooks.documentCandidate(documentCandidate, session) : documentCandidate;

      utility.isExist(hooks.before) ? await hooks.before(documentCandidate, session) : null;
      document = await this._applicationService.replaceOneByIdAndVersion(_id, version, documentCandidate, {session});
      utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
    }
    else
    {
      // a session started here, it must end here
      if (hooks.session)
      {
        const session = DbConnectionSafe.get().mongoClient.startSession();

        try
        {
          await session.withTransaction(async () =>
                                        {
                                          utility.isExist(hooks.documentCandidate) ? await hooks.documentCandidate(documentCandidate, session) : documentCandidate;

                                          utility.isExist(hooks.before) ? await hooks.before(_id, version, documentCandidate, session) : null;
                                          document = await this._applicationService.replaceOneByIdAndVersion(_id, version, documentCandidate, {session});
                                          utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                                        }, this.dbOperation.transactionOptions);
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
        utility.isExist(hooks.documentCandidate) ? await hooks.documentCandidate(documentCandidate) : documentCandidate;

        utility.isExist(hooks.before) ? await hooks.before(documentCandidate) : null;
        document = await this._applicationService.replaceOneByIdAndVersion(_id, version, documentCandidate);
        utility.isExist(hooks.after) ? await hooks.after(document) : null;
      }
    }

    return document;
  }

  /**
   * Soft deletes the matching document with the specified ID, version, and options.
   * Uses transactions. If a session is not provided externally, creates one internally.
   *
   * @param {string | ObjectId} _id
   * @param {string | number} version
   * @param {Object} [session]
   * @param {{session: Function, before: Function, after: Function}} [hooks]
   * @returns {Promise<Object>} - The soft deleted document.
   */
  async softDeleteOneByIdAndVersion (_id, version, session = null, hooks = {})
  {
    if (utility.isExist(session) && !_.isObject(session))
    {
      throw new InvalidArgumentsError();
    }

    _id = this._validateAndConvertObjectIdCandidate(_id);
    version = this._validateAndConvertVersion(version);

    let document;

    // a session started in CRUD controller, it must end there
    if (utility.isExist(session))
    {
      utility.isExist(hooks.before) ? await hooks.before(_id, version, session) : null;
      document = await this._applicationService.softDeleteOneByIdAndVersion(_id, version, {session});
      utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
    }
    else
    {
      // a session started here, it must end here
      if (hooks.session)
      {
        const session = DbConnectionSafe.get().mongoClient.startSession();

        try
        {
          await session.withTransaction(async () =>
                                        {
                                          utility.isExist(hooks.before) ? await hooks.before(_id, version, session) : null;
                                          document = await this._applicationService.softDeleteOneByIdAndVersion(_id, version, {session});
                                          utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                                        }, this.dbOperation.transactionOptions);
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
        utility.isExist(hooks.before) ? await hooks.before(_id, version) : null;
        document = await this._applicationService.softDeleteOneByIdAndVersion(_id, version);
        utility.isExist(hooks.after) ? await hooks.after(document) : null;
      }
    }

    return document;
  }

  /**
   * Deletes the matching document with the specified ID, version, and options.
   *
   * @param {string | ObjectId} _id
   * @param {string | number} version
   * @param {Object} [session]
   * @param {{session: Function, before: Function, after: Function}} [hooks]
   * @returns {Promise<Object>} - The deleted document.
   */
  async deleteOneByIdAndVersion (_id, version, session = null, hooks = {})
  {
    if (utility.isExist(session) && !_.isObject(session))
    {
      throw new InvalidArgumentsError();
    }

    _id = this._validateAndConvertObjectIdCandidate(_id);
    version = this._validateAndConvertVersion(version);

    let document;

    // a session started in CRUD controller, it must end there
    if (utility.isExist(session))
    {
      utility.isExist(hooks.before) ? await hooks.before(_id, version, session) : null;
      document = await this._applicationService.deleteOneByIdAndVersion(_id, version, {session});
      utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
    }
    else
    {
      // a session started here, it must end here
      if (hooks.session)
      {
        const session = DbConnectionSafe.get().mongoClient.startSession();

        try
        {
          await session.withTransaction(async () =>
                                        {
                                          utility.isExist(hooks.before) ? await hooks.before(_id, version, session) : null;
                                          document = await this._applicationService.deleteOneByIdAndVersion(_id, version, {session});
                                          utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                                        }, this.dbOperation.transactionOptions);
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
        utility.isExist(hooks.before) ? await hooks.before(_id, version) : null;
        document = await this._applicationService.deleteOneByIdAndVersion(_id, version);
        utility.isExist(hooks.after) ? await hooks.after(document) : null;
      }
    }

    return document;
  }

  /**
   * Authorizes document candidate for the specified operation according to the specified schema definition.
   *
   * @param {*} candidate - Either the whole document candidate or in recursive calls a sub part of it.
   * @param {Object} schemaDefinition - The specified candidate's schema definition.
   * @param operation - The caller method name.
   * @private
   */
  _authorizeDocumentCandidate (candidate, schemaDefinition, operation)
  {
    if (!_.isPlainObject(schemaDefinition) ||
        !_.isString(operation))
    {
      throw new InvalidArgumentsError();
    }

    if (!utility.isInitialized(schemaDefinition))
    {
      throw new BadRequestError(); // while the schema definition is not initialized, the client sent the candidate.
    }

    /* if the function is run, this means even if the candidate is null the key of the candidate is exist. so authorization must be applied using the specified schema definition. */
    let isCandidateAllowed = utility.isExist(schemaDefinition.controller) && _.isBoolean(schemaDefinition.controller[operation]) ? schemaDefinition.controller[operation] : true; // if nothing is specified in the schema definition, the property is allowed by default.

    if (!isCandidateAllowed)
    {
      throw new BadRequestError(); // while the candidate was marked as not allowed in the schema definition, the client sent the candidate.
    }

    switch (Schema.identifyBsonType(schemaDefinition))
    {
      case Schema.DataType.Object:
        if (!_.isPlainObject(candidate))
        {
          throw new BadRequestError(); // while the candidate is defined as an object in the schema definition, the client sent something else.
        }

        if (schemaDefinition.isMultilingual)
        {
          for (const language in candidate)
          {
            if (!LanguageSafe.get().includes(language))
            {
              throw new BadRequestError(`Either you did not send a language identifier to a multilingual field or you have sent an identifier which is not available.`);
            }

            const subCandidate = candidate[language];

            for (const key in subCandidate)
            {
              if (!utility.isExist(schemaDefinition.properties[key]))
              {
                throw new BadRequestError(); // the client sent a candidate which is not defined in the schema.
              }

              this._authorizeDocumentCandidate(subCandidate[key], schemaDefinition.properties[key], operation);
            }
          }
        }
        else
        {
          for (const key in candidate)
          {
            if (!utility.isExist(schemaDefinition.properties[key]))
            {
              throw new BadRequestError(); // the client sent a candidate which is not defined in the schema.
            }

            this._authorizeDocumentCandidate(candidate[key], schemaDefinition.properties[key], operation);
          }
        }

        break;
      case Schema.DataType.Array:
        if (!_.isArray(candidate))
        {
          throw new BadRequestError(); // while the candidate is defined as an array in the schema definition, the client sent something else.
        }

        for (let i = 0; i < candidate.length; i++)
        {
          const item = candidate[i];

          this._authorizeDocumentCandidate(item, schemaDefinition.items, operation);
        }

        break;
      default:
        if (_.isPlainObject(candidate) && schemaDefinition.isMultilingual)
        {
          for (const language in candidate)
          {
            if (!LanguageSafe.get().includes(language))
            {
              throw new BadRequestError(`Either you did not send a language identifier to a multilingual field or you have sent an identifier which is not available.`);
            }

            const value = candidate[language];

            this._authorizeDocumentCandidate(value, schemaDefinition, operation);
          }
        }
    }
  }

  /* HOOKS */
  /**
   * session
   *   read                          : () -> session
   *   readOneById                   : "
   *   createOne                     : "
   *   updateOneByIdAndVersion: "
   *   softDeleteOneByIdAndVersion   : "
   *   deleteOneByIdAndVersion       : "
   *
   * query
   *   read                          : (query, [session]) -> query
   *
   * documentCandidate
   *   createOne                     : (documentCandidate, [session]) -> documentCandidate
   *   updateOneByIdAndVersion: "
   *
   * before
   *   read                          : (query, [session]) -> void
   *   readOneById                   : (id, [session]) -> void
   *   createOne                     : (documentCandidate, [session]) -> void
   *   updateOneByIdAndVersion: (id, version, documentCandidate, [session]) -> void
   *   softDeleteOneByIdAndVersion   : (id, version, [session]) -> void
   *   deleteOneByIdAndVersion       : (id, version, [session]) -> void
   *
   * after
   *   read                          : (documents, [session]) -> void
   *   readOneById                   : (document, [session]) -> void
   *   createOne                     : "
   *   updateOneByIdAndVersion: "
   *   softDeleteOneByIdAndVersion   : "
   *   deleteOneByIdAndVersion       : "
   */
}

module.exports = ControllerService;
