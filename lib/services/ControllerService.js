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
   * @param {Object} query
   * @param {ClientSession} [externalSession]
   * @param {Array} [parentRoutes]
   * @param {Object} [parentRouteValues]
   * @param {Object} [hooks]
   * @returns {Promise<Array>} - The fetched documents.
   */
  async read (query, externalSession = null, parentRoutes = [], parentRouteValues = {}, hooks = {})
  {
    this._validateParameterQuery(query);
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);

    const skip = [];
    utility.isExist(hooks.skip) ? await hooks.skip(skip) : null;
    this._authorizeCandidate(query, this.schema.definition, Schema.CONTROLLER_OPERATION.read, skip);
    query = this._validateAndConvertCandidate(query, this.schema.definition);

    let documents;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.query) ? await hooks.query(query, session) : null;

                                if (utility.isInitialized(parentRoutes))
                                {
                                  for (const parentRoute of parentRoutes)
                                  {
                                    const {pathParameter, localProperty, applicationService} = parentRoute;
                                    const value = parentRouteValues[pathParameter];

                                    const localQuery = {};
                                    localQuery[localProperty] = value;

                                    await applicationService.readOne(localQuery, session); // gives error if document is not preset.

                                    query[pathParameter] = value;
                                  }
                                }

                                utility.isExist(hooks.before) ? await hooks.before(query, session) : null;
                                documents = await this._applicationService.read(query, session);
                                utility.isExist(hooks.after) ? await hooks.after(documents, session) : null;
                              }, externalSession, internalSession);

    return documents;
  }

  /**
   * Fetches the matching document with the specified ID.
   *
   * @param {string | ObjectId} _id
   * @param {ClientSession} [externalSession]
   * @param {Array} [parentRoutes]
   * @param {Object} [parentRouteValues]
   * @param {Object} [hooks]
   * @returns {Promise<Object>} - The fetched document.
   */
  async readOneById (_id, externalSession = null, parentRoutes = [], parentRouteValues = {}, hooks = {})
  {
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);

    _id = this._validateAndConvertObjectIdCandidate(_id);

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks);
    await SessionManager.exec(async () =>
                              {
                                if (utility.isInitialized(parentRoutes))
                                {
                                  const query = {_id};

                                  for (const parentRoute of parentRoutes)
                                  {
                                    const {pathParameter, localProperty, applicationService} = parentRoute;
                                    const value = parentRouteValues[pathParameter];

                                    const localQuery = {};
                                    localQuery[localProperty] = value;

                                    await applicationService.readOne(localQuery, session); // gives error if document is not preset.

                                    query[pathParameter] = value;
                                  }

                                  await this.applicationService.readOne(query, session); // gives error if document is not preset.
                                }

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
   * @param {Array} [parentRoutes]
   * @param {Object} [parentRouteValues]
   * @param {Object} [hooks]
   * @returns {Promise<Object>} - The created document.
   */
  async createOne (body, externalSession = null, parentRoutes = [], parentRouteValues = {}, hooks = {})
  {
    this._validateParameterDocumentCandidate(body);
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);

    const skip = [];
    utility.isExist(hooks.skip) ? await hooks.skip(skip) : null;
    this._authorizeCandidate(body, this.schema.definition, Schema.CONTROLLER_OPERATION.createOne, skip);
    body = this._validateAndConvertCandidate(body, this.schema.definition);

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.documentCandidate) ? await hooks.documentCandidate(body, session) : null;

                                if (utility.isInitialized(parentRoutes))
                                {
                                  const query = {};

                                  for (const parentRoute of parentRoutes)
                                  {
                                    const {pathParameter, localProperty, applicationService} = parentRoute;
                                    const value = parentRouteValues[pathParameter];

                                    const localQuery = {};
                                    localQuery[localProperty] = value;

                                    await applicationService.readOne(localQuery, session); // gives error if document is not preset.

                                    query[pathParameter] = value;
                                  }
                                }

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
   * @param {Array} [parentRoutes]
   * @param {Object} [parentRouteValues]
   * @param {Object} [hooks]
   * @return {Promise<Object>}
   */
  async updateOneByIdAndVersion (_id, version, documentCandidate, externalSession = null, parentRoutes = [], parentRouteValues = {}, hooks = {})
  {
    this._validateParameterDocumentCandidate(documentCandidate);
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);

    _id = this._validateAndConvertObjectIdCandidate(_id);
    version = this._validateAndConvertVersion(version);
    const skip = [];
    utility.isExist(hooks.skip) ? await hooks.skip(skip) : null;
    this._authorizeCandidate(documentCandidate, this.schema.definition, Schema.CONTROLLER_OPERATION.updateOneByIdAndVersion, skip);
    documentCandidate = this._validateAndConvertCandidate(documentCandidate, this.schema.definition);

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.documentCandidate) ? await hooks.documentCandidate(documentCandidate, session) : null;

                                if (utility.isInitialized(parentRoutes))
                                {
                                  const query = {_id};

                                  for (const parentRoute of parentRoutes)
                                  {
                                    const {pathParameter, localProperty, applicationService} = parentRoute;
                                    const value = parentRouteValues[pathParameter];

                                    const localQuery = {};
                                    localQuery[localProperty] = value;

                                    await applicationService.readOne(localQuery, session); // gives error if document is not preset.

                                    query[pathParameter] = value;
                                  }

                                  await this.applicationService.readOne(query, session); // gives error if document is not preset.
                                }

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
   * @param {Array} [parentRoutes]
   * @param {Object} [parentRouteValues]
   * @param {Object} [hooks]
   * @return {Promise<Object>}
   */
  async replaceOneByIdAndVersion (_id, version, documentCandidate, externalSession = null, parentRoutes = [], parentRouteValues = {}, hooks = {})
  {
    this._validateParameterDocumentCandidate(documentCandidate);
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);

    _id = this._validateAndConvertObjectIdCandidate(_id);
    version = this._validateAndConvertVersion(version);
    const skip = [];
    utility.isExist(hooks.skip) ? await hooks.skip(skip) : null;
    this._authorizeCandidate(documentCandidate, this.schema.definition, Schema.CONTROLLER_OPERATION.replaceOneByIdAndVersion, skip);
    documentCandidate = this._validateAndConvertCandidate(documentCandidate, this.schema.definition);

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.documentCandidate) ? await hooks.documentCandidate(documentCandidate, session) : null;

                                if (utility.isInitialized(parentRoutes))
                                {
                                  const query = {_id};

                                  for (const parentRoute of parentRoutes)
                                  {
                                    const {pathParameter, localProperty, applicationService} = parentRoute;
                                    const value = parentRouteValues[pathParameter];

                                    const localQuery = {};
                                    localQuery[localProperty] = value;

                                    await applicationService.readOne(localQuery, session); // gives error if document is not preset.

                                    query[pathParameter] = value;
                                  }

                                  await this.applicationService.readOne(query, session); // gives error if document is not preset.
                                }

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
   * @param {Array} [parentRoutes]
   * @param {Object} [parentRouteValues]
   * @param {Object} [hooks]
   * @returns {Promise<Object>} - The soft deleted document.
   */
  async softDeleteOneByIdAndVersion (_id, version, externalSession = null, parentRoutes = [], parentRouteValues = {}, hooks = {})
  {
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);

    _id = this._validateAndConvertObjectIdCandidate(_id);
    version = this._validateAndConvertVersion(version);

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks);
    await SessionManager.exec(async () =>
                              {
                                if (utility.isInitialized(parentRoutes))
                                {
                                  const query = {_id};

                                  for (const parentRoute of parentRoutes)
                                  {
                                    const {pathParameter, localProperty, applicationService} = parentRoute;
                                    const value = parentRouteValues[pathParameter];

                                    const localQuery = {};
                                    localQuery[localProperty] = value;

                                    await applicationService.readOne(localQuery, session); // gives error if document is not preset.

                                    query[pathParameter] = value;
                                  }

                                  await this.applicationService.readOne(query, session); // gives error if document is not preset.
                                }

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
   * @param {Array} [parentRoutes]
   * @param {Object} [parentRouteValues]
   * @param {Object} [hooks]
   * @returns {Promise<Object>} - The deleted document.
   */
  async deleteOneByIdAndVersion (_id, version, externalSession = null, parentRoutes = [], parentRouteValues = {}, hooks = {})
  {
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);

    _id = this._validateAndConvertObjectIdCandidate(_id);
    version = this._validateAndConvertVersion(version);

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks);
    await SessionManager.exec(async () =>
                              {
                                if (utility.isInitialized(parentRoutes))
                                {
                                  const query = {_id};

                                  for (const parentRoute of parentRoutes)
                                  {
                                    const {pathParameter, localProperty, applicationService} = parentRoute;
                                    const value = parentRouteValues[pathParameter];

                                    const localQuery = {};
                                    localQuery[localProperty] = value;

                                    await applicationService.readOne(localQuery, session); // gives error if document is not preset.

                                    query[pathParameter] = value;
                                  }

                                  await this.applicationService.readOne(query, session); // gives error if document is not preset.
                                }

                                utility.isExist(hooks.before) ? await hooks.before(_id, version, session) : null;
                                document = await this._applicationService.deleteOneByIdAndVersion(_id, version, session);
                                utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                              }, externalSession, internalSession);

    return document;
  }

  /* AUTHORIZE */
  /**
   * Authorizes candidate for the specified operation according to the specified schema definition.
   *
   * @param {*} candidate - Either the whole candidate or in recursive calls a sub part of it.
   * @param {Object} schemaDefinition - The specified candidate's schema definition.
   * @param {String} operation - The caller method name.
   * @param {Array<string>} [skip] - The properties to be skipped.
   * @private
   */
  _authorizeCandidate (candidate, schemaDefinition, operation, skip = [])
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
              if (!skip.includes(key) && !utility.isExist(schemaDefinition.properties[key]))
              {
                throw new BadRequestError(); // the client sent a candidate which is not defined in the schema.
              }

              this._authorizeCandidate(subCandidate[key], schemaDefinition.properties[key], operation);
            }
          }
        }
        else
        {
          for (const key in candidate)
          {
            if (!skip.includes(key) && !utility.isExist(schemaDefinition.properties[key]))
            {
              throw new BadRequestError(); // the client sent a candidate which is not defined in the schema.
            }

            this._authorizeCandidate(candidate[key], schemaDefinition.properties[key], operation);
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

          this._authorizeCandidate(item, schemaDefinition.items, operation);
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

            this._authorizeCandidate(value, schemaDefinition, operation);
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
