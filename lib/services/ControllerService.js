const {
  InvalidArgumentsError,
  BadRequestError
} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");
const {
  ObjectId,
  ClientSession
} = require("mongodb");
const ErrorSafe = require("../safes/ErrorSafe");
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
   * @param {Object} options
   * @param {Schema} [options.schema]
   * @param {DbOperation} [options.dbOperation]
   * @param {DbService} [options.dbService]
   * @param {ApplicationService} [options.applicationService]
   * @param {string} [options.persona]
   */
  constructor (options)
  {
    if (!_.isPlainObject(options))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    super();

    let isApplicationServiceCreated = false;

    if (utility.isExist(options.schema))
    {
      if (!(options.schema instanceof Schema))
      {
        throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
      }

      this._applicationService = new ApplicationService({schema: options.schema, persona: options.persona});
      isApplicationServiceCreated = true;
    }

    if (utility.isExist(options.dbOperation))
    {
      if (!(options.dbOperation instanceof DbOperation) ||
          isApplicationServiceCreated)
      {
        throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
      }

      this._applicationService = new ApplicationService({dbOperation: options.dbOperation, persona: options.persona});
      isApplicationServiceCreated = true;
    }

    if (utility.isExist(options.dbService))
    {
      if (!(options.dbService instanceof DbService) ||
          isApplicationServiceCreated)
      {
        throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
      }

      this._applicationService = new ApplicationService({dbService: options.dbService, persona: options.persona});
      isApplicationServiceCreated = true;
    }

    if (utility.isExist(options.applicationService))
    {
      if (!(options.applicationService instanceof ApplicationService) ||
          isApplicationServiceCreated ||
          (utility.isExist(options.persona) && options.persona !== options.applicationService.persona)
      )
      {
        throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
      }

      this._applicationService = options.applicationService;
      isApplicationServiceCreated = true;
    }

    if (!isApplicationServiceCreated)
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    this._persona = options.persona;
    this._layer = Service.LAYER.CONTROLLER;
  }

  /**
   * Fetches the matching documents with the specified query.
   *
   * @param {Object} query
   * @param {ClientSession} [externalSession]
   * @param {Object} [hooks]
   * @returns {Promise<Array>} - The fetched documents.
   */
  async read (query, externalSession = undefined, hooks = undefined)
  {
    hooks = utility.init(hooks, {});
    hooks.bearer = utility.init(hooks.bearer, {});

    this._validateParameterQuery(query);
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);

    const skip = [];
    utility.isExist(hooks.skip) ? await hooks.skip(skip) : undefined;
    this._authorizeCandidate(query, this.schema.definition, Schema.CONTROLLER_OPERATION.read, skip);
    query = Service.validateAndConvertCandidate(query, this.schema.definition, undefined, this._layer);

    let documents;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.query) ? await hooks.query(query) : undefined;

                                utility.isExist(hooks.before) ? await hooks.before(query, session) : undefined;
                                documents = await this._applicationService.read(query, session, {bearer: hooks.bearer});
                                utility.isExist(hooks.after) ? await hooks.after(documents, session) : undefined;
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
  async readOneById (_id, externalSession = undefined, hooks = undefined)
  {
    hooks = utility.init(hooks, {});
    hooks.bearer = utility.init(hooks.bearer, {});

    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);

    _id = Service.validateAndConvertObjectIdCandidate(_id);

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.before) ? await hooks.before(_id, session) : undefined;
                                document = await this._applicationService.readOneById(_id, session, {bearer: hooks.bearer});
                                utility.isExist(hooks.after) ? await hooks.after(document, session) : undefined;
                              }, externalSession, internalSession);

    return document;
  }

  /**
   * Fetches the matching document with the specified identifier.
   *
   * @param {string} identifier
   * @param {string} identifierKey
   * @param {ClientSession} [externalSession]
   * @param {Object} [hooks]
   * @returns {Promise<Object>} - The fetched document.
   */
  async readOneByIdentifier (identifier, identifierKey, externalSession = undefined, hooks = undefined)
  {
    hooks = utility.init(hooks, {});
    hooks.bearer = utility.init(hooks.bearer, {});

    if (!_.isString(identifierKey))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);

    identifier = ControllerService.validateAndConvertStringCandidate(identifier);

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks);
    await SessionManager.exec(async () =>
                              {
                                const query = {};
                                query[identifierKey] = identifier;

                                utility.isExist(hooks.before) ? await hooks.before(identifier, session) : undefined;
                                document = await this._applicationService.readOne(query, session);
                                utility.isExist(hooks.after) ? await hooks.after(document, session) : undefined;
                              }, externalSession, internalSession);

    return document;
  }

  /**
   * Creates a document with the specified document candidate.
   *
   * @param {Object} fields
   * @param {ClientSession} [externalSession]
   * @param {Object} [hooks]
   * @returns {Promise<Object>} - The created document.
   */
  async createOne (fields, externalSession = undefined, hooks = undefined)
  {
    hooks = utility.init(hooks, {});
    hooks.bearer = utility.init(hooks.bearer, {});

    this._validateParameterDocumentCandidate(fields);
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);

    const skip = [];
    utility.isExist(hooks.skip) ? await hooks.skip(skip) : undefined;
    this._authorizeCandidate(fields, this.schema.definition, Schema.CONTROLLER_OPERATION.createOne, skip);
    fields = Service.validateAndConvertCandidate(fields, this.schema.definition, undefined, this._layer);

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.fields) ? await hooks.fields(fields) : undefined;

                                utility.isExist(hooks.before) ? await hooks.before(fields, session) : undefined;
                                document = await this._applicationService.createOne(fields, session, {bearer: hooks.bearer});
                                utility.isExist(hooks.after) ? await hooks.after(document, session) : undefined;
                              }, externalSession, internalSession);

    return document;
  }

  /**
   * Updates the matching document with the specified ID, version, and document candidate,.
   *
   * @param {string | ObjectId} _id
   * @param {string | number} version
   * @param {Object} fields
   * @param {ClientSession} [externalSession]
   * @param {Object} [hooks]
   * @return {Promise<Object>}
   */
  async updateOneByIdAndVersion (_id, version, fields, externalSession = undefined, hooks = undefined)
  {
    hooks = utility.init(hooks, {});
    hooks.bearer = utility.init(hooks.bearer, {});

    this._validateParameterDocumentCandidate(fields);
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);

    _id = Service.validateAndConvertObjectIdCandidate(_id);
    version = Service.validateAndConvertVersion(version);
    const skip = [];
    utility.isExist(hooks.skip) ? await hooks.skip(skip) : undefined;
    this._authorizeCandidate(fields, this.schema.definition, Schema.CONTROLLER_OPERATION.updateOneByIdAndVersion, skip);
    fields = Service.validateAndConvertCandidate(fields, this.schema.definition, undefined, this._layer);

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.fields) ? await hooks.fields(fields) : undefined;

                                utility.isExist(hooks.before) ? await hooks.before(fields, session) : undefined;
                                document = await this._applicationService.updateOneByIdAndVersion(_id, version, fields, session, {bearer: hooks.bearer});
                                utility.isExist(hooks.after) ? await hooks.after(document, session) : undefined;
                              }, externalSession, internalSession);

    return document;
  }

  /**
   * Replaces the matching document with the specified ID, version, document candidate,.
   *
   * @param {string | ObjectId} _id
   * @param {string | number} version
   * @param {Object} fields
   * @param {ClientSession} [externalSession]
   * @param {Object} [hooks]
   * @return {Promise<Object>}
   */
  async replaceOneByIdAndVersion (_id, version, fields, externalSession = undefined, hooks = undefined)
  {
    hooks = utility.init(hooks, {});
    hooks.bearer = utility.init(hooks.bearer, {});

    this._validateParameterDocumentCandidate(fields);
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);

    _id = Service.validateAndConvertObjectIdCandidate(_id);
    version = Service.validateAndConvertVersion(version);
    const skip = [];
    utility.isExist(hooks.skip) ? await hooks.skip(skip) : undefined;
    this._authorizeCandidate(fields, this.schema.definition, Schema.CONTROLLER_OPERATION.replaceOneByIdAndVersion, skip);
    fields = Service.validateAndConvertCandidate(fields, this.schema.definition, undefined, this._layer);

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.fields) ? await hooks.fields(fields) : undefined;

                                utility.isExist(hooks.before) ? await hooks.before(fields, session) : undefined;
                                document = await this._applicationService.replaceOneByIdAndVersion(_id, version, fields, session, {bearer: hooks.bearer});
                                utility.isExist(hooks.after) ? await hooks.after(document, session) : undefined;
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
  async softDeleteOneByIdAndVersion (_id, version, externalSession = undefined, hooks = undefined)
  {
    hooks = utility.init(hooks, {});
    hooks.bearer = utility.init(hooks.bearer, {});

    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);

    _id = Service.validateAndConvertObjectIdCandidate(_id);
    version = Service.validateAndConvertVersion(version);

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.before) ? await hooks.before(_id, version, session) : undefined;
                                document = await this._applicationService.softDeleteOneByIdAndVersion(_id, version, session, {bearer: hooks.bearer});
                                utility.isExist(hooks.after) ? await hooks.after(document, session) : undefined;
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
  async deleteOneByIdAndVersion (_id, version, externalSession = undefined, hooks = undefined)
  {
    hooks = utility.init(hooks, {});
    hooks.bearer = utility.init(hooks.bearer, {});

    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);

    _id = Service.validateAndConvertObjectIdCandidate(_id);
    version = Service.validateAndConvertVersion(version);

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.before) ? await hooks.before(_id, version, session) : undefined;
                                document = await this._applicationService.deleteOneByIdAndVersion(_id, version, session, {bearer: hooks.bearer});
                                utility.isExist(hooks.after) ? await hooks.after(document, session) : undefined;
                              }, externalSession, internalSession);

    return document;
  }

  /* AUTHORIZE */
  /**
   * Authorizes candidate for the specified operation according to the specified schema definition.
   *
   * @param {*} candidate - Either the whole candidate or in recursive calls a sub part of it.
   * @param {Object} schemaDefinition - The specified candidate's schema definition.
   * @param {string} operation - The caller method name.
   * @param {Array<string>} [skip] - The properties to be skipped.
   * @private
   */
  _authorizeCandidate (candidate, schemaDefinition, operation, skip = [])
  {
    if (!_.isPlainObject(schemaDefinition) ||
        !_.isString(operation))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    if (!utility.isInitialized(schemaDefinition))
    {
      throw new BadRequestError(ErrorSafe.get().HTTP_21); // while the schema definition is not initialized, the client sent the candidate.
    }

    /* if the function is run, this means even if the candidate is null the key of the candidate is exist. so authorization must be applied using the specified schema definition. */
    let isCandidateAllowed = utility.isExist(schemaDefinition.controller) && _.isBoolean(schemaDefinition.controller[operation]) ? schemaDefinition.controller[operation] : true; // if nothing is specified in the schema definition, the property is allowed by default.

    if (!isCandidateAllowed)
    {
      throw new BadRequestError(ErrorSafe.get().HTTP_21); // while the candidate was marked as not allowed in the schema definition, the client sent the candidate.
    }

    switch (Schema.identifyBsonType(schemaDefinition))
    {
      case Schema.DataType.Object:
        if (!_.isPlainObject(candidate))
        {
          throw new BadRequestError(ErrorSafe.get().HTTP_21); // while the candidate is defined as an object in the schema definition, the client sent something else.
        }

        if (schemaDefinition.isMultilingual)
        {
          for (const language in candidate)
          {
            if (!Service.isLanguageAvailable(language))
            {
              throw new BadRequestError(ErrorSafe.get().LANGUAGE);
            }

            const subCandidate = candidate[language];

            for (const key in subCandidate)
            {
              if (!skip.includes(key) && !utility.isExist(schemaDefinition.properties[key]))
              {
                throw new BadRequestError(ErrorSafe.get().HTTP_21); // the client sent a candidate which is not defined in the schema.
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
              throw new BadRequestError(ErrorSafe.get().HTTP_21); // the client sent a candidate which is not defined in the schema.
            }

            this._authorizeCandidate(candidate[key], schemaDefinition.properties[key], operation);
          }
        }

        break;
      case Schema.DataType.Array:
        if (!_.isArray(candidate))
        {
          throw new BadRequestError(ErrorSafe.get().HTTP_21); // while the candidate is defined as an array in the schema definition, the client sent something else.
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
            if (!Service.isLanguageAvailable(language))
            {
              throw new BadRequestError(ErrorSafe.get().LANGUAGE);
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
