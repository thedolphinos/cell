"use strict";

const {InvalidArgumentsError, BadRequestError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");
const {ObjectId} = require("mongodb");

const Schema = require("../db/Schema");
const DbOperation = require("../db/DbOperation");
const SessionManager = require("../db/SessionManager");
const Service = require("../core/Service");
const DbService = require("../services/DbService");
const ApplicationService = require("../services/ApplicationService");

/**
 * Contains the service logic of the framework in controller level.
 */
class ControllerService extends Service
{
  /**
   * Creates a controller service instance for the specified schema, database operation, database service, or application service.
   * If a schema, database operation, or database service is provided, creates an application service.
   *
   * @param {Schema | DbOperation | DbService | ApplicationService} schema_dbOperation_dbService_applicationService
   */
  constructor (schema_dbOperation_dbService_applicationService)
  {
    super(Service._LAYER.CONTROLLER);

    if (schema_dbOperation_dbService_applicationService instanceof Schema ||
        schema_dbOperation_dbService_applicationService instanceof DbOperation ||
        schema_dbOperation_dbService_applicationService instanceof DbService)
    {
      this._applicationService = new ApplicationService(schema_dbOperation_dbService_applicationService);
    }
    else if (schema_dbOperation_dbService_applicationService instanceof ApplicationService)
    {
      this._applicationService = schema_dbOperation_dbService_applicationService;
    }
    else
    {
      throw new InvalidArgumentsError();
    }
  }

  /**
   * Fetches the matching documents with the specified query.
   *
   * @param {Object} queryString
   * @param {ClientSession} [externalSession]
   * @param {Object} [hooks]
   * @returns {Promise<Array>} - The fetched documents.
   */
  async read (queryString, externalSession = null, hooks = {})
  {
    this._validateParameterQuery(queryString);
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);

    let documents;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.query) ? queryString = await hooks.query(queryString, session) : queryString;

                                utility.isExist(hooks.before) ? await hooks.before(queryString, session) : null;
                                documents = await this._applicationService.read(queryString, session);
                                utility.isExist(hooks.after) ? await hooks.after(documents, session) : null;
                              }, externalSession, internalSession);

    return documents;
  }

  /**
   * Fetches the matching document with the specified ID.
   *
   * @param {string | ObjectId} _id
   * @param {ClientSession} [externalSession]
   * @param {Object} [hooks]
   * @returns {Promise<Object>} - The fetched document.
   */
  async readOneById (_id, externalSession = null, hooks = {})
  {
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);

    _id = this._validateAndConvertObjectIdCandidate(_id);

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.before) ? await hooks.before(_id, session) : null;
                                document = await this._applicationService.readOneById(_id, session);
                                utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                              }, externalSession, internalSession);

    return document;
  }

  /**
   * Creates a document with the specified document candidate.
   *
   * @param {Object} body
   * @param {ClientSession} [externalSession]
   * @param {Object} [hooks]
   * @returns {Promise<Object>} - The created document.
   */
  async createOne (body, externalSession = null, hooks = {})
  {
    this._validateParameterDocumentCandidate(body);
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);

    this._authorizeDocumentCandidate(body, this.schema.definition, Schema.CONTROLLER_OPERATION.createOne);
    body = this._validateAndConvertDocumentCandidate(body, this.schema.definition);

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.documentCandidate) ? await hooks.documentCandidate(body, session) : null;

                                utility.isExist(hooks.before) ? await hooks.before(body, session) : null;
                                document = await this._applicationService.createOne(body, session);
                                utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                              }, externalSession, internalSession);

    return document;
  }

  /**
   * Updates the matching document with the specified ID, version, and document candidate,.
   *
   * @param {string | ObjectId} _id
   * @param {string | number} version
   * @param {Object} documentCandidate
   * @param {ClientSession} [externalSession]
   * @param {Object} [hooks]
   * @return {Promise<Object>}
   */
  async updateOneByIdAndVersion (_id, version, documentCandidate, externalSession = null, hooks = {})
  {
    this._validateParameterDocumentCandidate(documentCandidate);
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);

    _id = this._validateAndConvertObjectIdCandidate(_id);
    version = this._validateAndConvertVersion(version);
    this._authorizeDocumentCandidate(documentCandidate, this.schema.definition, Schema.CONTROLLER_OPERATION.updateOneByIdAndVersion);
    documentCandidate = this._validateAndConvertDocumentCandidate(documentCandidate, this.schema.definition);

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.documentCandidate) ? await hooks.documentCandidate(documentCandidate, session) : null;

                                utility.isExist(hooks.before) ? await hooks.before(documentCandidate, session) : null;
                                document = await this._applicationService.updateOneByIdAndVersion(_id, version, documentCandidate, session);
                                utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                              }, externalSession, internalSession);

    return document;
  }

  /**
   * Replaces the matching document with the specified ID, version, document candidate,.
   *
   * @param {string | ObjectId} _id
   * @param {string | number} version
   * @param {Object} documentCandidate
   * @param {ClientSession} [externalSession]
   * @param {Object} [hooks]
   * @return {Promise<Object>}
   */
  async replaceOneByIdAndVersion (_id, version, documentCandidate, externalSession = null, hooks = {})
  {
    this._validateParameterDocumentCandidate(documentCandidate);
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);

    _id = this._validateAndConvertObjectIdCandidate(_id);
    version = this._validateAndConvertVersion(version);
    this._authorizeDocumentCandidate(documentCandidate, this.schema.definition, Schema.CONTROLLER_OPERATION.replaceOneByIdAndVersion);
    documentCandidate = this._validateAndConvertDocumentCandidate(documentCandidate, this.schema.definition);

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.documentCandidate) ? await hooks.documentCandidate(documentCandidate, session) : null;

                                utility.isExist(hooks.before) ? await hooks.before(documentCandidate, session) : null;
                                document = await this._applicationService.replaceOneByIdAndVersion(_id, version, documentCandidate, session);
                                utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                              }, externalSession, internalSession);

    return document;
  }

  /**
   * Soft deletes the matching document with the specified ID, version,.
   * Uses transactions. If a session is not provided externally, creates one internally, if the hooks is not disabling session.
   *
   * @param {string | ObjectId} _id
   * @param {string | number} version
   * @param {ClientSession} [externalSession]
   * @param {Object} [hooks]
   * @returns {Promise<Object>} - The soft deleted document.
   */
  async softDeleteOneByIdAndVersion (_id, version, externalSession = null, hooks = {})
  {
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);

    _id = this._validateAndConvertObjectIdCandidate(_id);
    version = this._validateAndConvertVersion(version);

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.before) ? await hooks.before(_id, version, session) : null;
                                document = await this._applicationService.softDeleteOneByIdAndVersion(_id, version, session);
                                utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                              }, externalSession, internalSession);

    return document;
  }

  /**
   * Deletes the matching document with the specified ID, version,.
   *
   * @param {string | ObjectId} _id
   * @param {string | number} version
   * @param {ClientSession} [externalSession]
   * @param {Object} [hooks]
   * @returns {Promise<Object>} - The deleted document.
   */
  async deleteOneByIdAndVersion (_id, version, externalSession = null, hooks = {})
  {
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);

    _id = this._validateAndConvertObjectIdCandidate(_id);
    version = this._validateAndConvertVersion(version);

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.before) ? await hooks.before(_id, version, session) : null;
                                document = await this._applicationService.deleteOneByIdAndVersion(_id, version, session);
                                utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                              }, externalSession, internalSession);

    return document;
  }

  /* AUTHORIZE */
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
            if (!this._isLanguageAvailable(language))
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
            if (!this._isLanguageAvailable(language))
            {
              throw new BadRequestError(`Either you did not send a language identifier to a multilingual field or you have sent an identifier which is not available.`);
            }

            const value = candidate[language];

            this._authorizeDocumentCandidate(value, schemaDefinition, operation);
          }
        }
    }
  }

  /* GET/SET */
  /**
   * @return {ApplicationService}
   */
  get applicationService ()
  {
    return this._applicationService;
  }

  /**
   * @return {DbService}
   */
  get dbService ()
  {
    return this._applicationService.dbService;
  }

  /**
   * @return {DbOperation}
   */
  get dbOperation ()
  {
    return this.dbService.dbOperation;
  }

  /**
   * @return {Schema}
   */
  get schema ()
  {
    return this.dbOperation.schema;
  }
}

module.exports = ControllerService;
