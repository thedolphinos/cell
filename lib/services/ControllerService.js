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
const BsonType = require("../db/BsonType");
const Schema = require("../db/Schema");
const DbOperation = require("../db/DbOperation");
const SessionManager = require("../db/SessionManager");
const Service = require("../core/Service");
const DbService = require("../services/DbService");
const ApplicationService = require("../services/ApplicationService");
const mongoDotNotation = require("mongo-dot-notation");

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
          (utility.isExist(options.persona) && utility.isExist(options.applicationService.persona) && options.persona !== options.applicationService.persona) // if `persona` is specified and `applicationService` has a persona, they must be the same.
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
   * Fetches the documents that match the specified search value on each specified fields and query.
   *
   * @param {Object} query
   * @param {string} searchValue
   * @param {Array<string>} searchFields
   * @param {Object} [options]
   * @param {Object} [options.sort]
   * @param {ClientSession} [externalSession]
   * @param {Object} [hooks]
   * @returns {Promise<Array>} - The fetched documents.
   */
  async search (query, searchValue, searchFields, options = undefined, externalSession = undefined, hooks = undefined)
  {
    query = utility.init(query, {});
    options = utility.init(options, {});
    options.sort = utility.init(options.sort, {});
    hooks = utility.init(hooks, {});
    hooks.bearer = utility.init(hooks.bearer, {});

    this._validateParameterQuery(query);

    if (!_.isString(searchValue) ||
        !utility.isInitialized(searchValue))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    if (!_.isArray(searchFields))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    for (const searchField of searchFields)
    {
      if (!_.isString(searchField))
      {
        throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
      }
    }

    this._validateParameterOptions(options);
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);

    const skip = [];
    utility.isExist(hooks.skip) ? await hooks.skip(skip) : undefined;
    this._authorizeCandidate(query, this.schema.definition, skip);
    query = Service.validateAndConvertCandidate(query, this.schema.definition, undefined, this._layer);

    query = {
      ...query,
      $or: [],
      isSoftDeleted: false
    };

    for (const searchField of searchFields)
    {
      const searchElement = {};
      searchElement[searchField] = {$regex: searchValue, $options: "i"};

      query.$or.push(searchElement);
    }

    utility.isExist(hooks.query) ? await hooks.query(query) : undefined;
    utility.isExist(hooks.sort) ? await hooks.sort(options.sort) : undefined;

    let documents;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.before) ? await hooks.before(query, session) : undefined;
                                let convertedQuery = mongoDotNotation.flatten(query);
                                convertedQuery = utility.isExist(convertedQuery.$set) ? convertedQuery.$set : {};
                                documents = await this.dbOperation.read(convertedQuery, {...options, session});
                                utility.isExist(hooks.after) ? await hooks.after(documents, session) : undefined;
                              }, externalSession, internalSession);

    return documents;
  }

  /**
   * Fetches the matching documents with the specified query.
   *
   * @param {Object} query
   * @param {Object} [options]
   * @param {number} [options.skip]
   * @param {number} [options.limit]
   * @param {Object} [options.sort]
   * @param {ClientSession} [externalSession]
   * @param {Object} [hooks]
   * @returns {Promise<{documents: Array, count: number}>} - The fetched documents.
   */
  async read (query, options = undefined, externalSession = undefined, hooks = undefined)
  {
    options = utility.init(options, {});
    hooks = utility.init(hooks, {});
    hooks.bearer = utility.init(hooks.bearer, {});

    this._validateParameterQuery(query);
    this._validateParameterOptions(options);
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);

    const skip = [];
    utility.isExist(hooks.skip) ? await hooks.skip(skip) : undefined;
    this._authorizeCandidate(query, this.schema.definition, skip);
    query = Service.validateAndConvertCandidate(query, this.schema.definition, undefined, this._layer);

    utility.isExist(hooks.query) ? await hooks.query(query) : undefined;
    utility.isExist(hooks.options) ? await hooks.options(options) : undefined;

    let documents, count;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.before) ? await hooks.before(query, options, session) : undefined;
                                documents = await this._applicationService.read(query, options, session, {bearer: hooks.bearer});
                                count = await this._applicationService.count(query, {bearer: hooks.bearer});
                                utility.isExist(hooks.after) ? await hooks.after(documents, count, session) : undefined;
                              }, externalSession, internalSession);

    return {
      documents,
      count
    };
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

                                utility.isExist(hooks.before) ? await hooks.before(identifier, query, session) : undefined;
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
    this._authorizeCandidate(fields, this.schema.definition, skip);
    fields = Service.validateAndConvertCandidate(fields, this.schema.definition, undefined, this._layer);

    utility.isExist(hooks.fields) ? await hooks.fields(fields) : undefined;

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks);
    await SessionManager.exec(async () =>
                              {
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
    this._authorizeCandidate(fields, this.schema.definition, skip);
    fields = Service.validateAndConvertCandidate(fields, this.schema.definition, undefined, this._layer);

    utility.isExist(hooks.fields) ? await hooks.fields(fields) : undefined;

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.before) ? await hooks.before(_id, version, fields, session) : undefined;
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
    this._authorizeCandidate(fields, this.schema.definition, skip);
    fields = Service.validateAndConvertCandidate(fields, this.schema.definition, undefined, this._layer);

    utility.isExist(hooks.fields) ? await hooks.fields(fields) : undefined;

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.before) ? await hooks.before(_id, version, fields, session) : undefined;
                                document = await this._applicationService.replaceOneByIdAndVersion(_id, version, fields, session, {bearer: hooks.bearer});
                                utility.isExist(hooks.after) ? await hooks.after(document, session) : undefined;
                              }, externalSession, internalSession);

    return document;
  }

  /**
   * Soft deletes the matching document with the specified ID, version.
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
   * Deletes the matching document with the specified ID, version.
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

  /**
   * Soft deletes the matching documents with the specified ID, version.
   * Uses transactions. If a session is not provided externally, creates one internally, if the hooks is not disabling session.
   *
   * @param {Array<{_id: string | ObjectId, version: string | number}>} documents
   * @param {ClientSession} [externalSession]
   * @param {Object} [hooks]
   * @returns {Promise<Object>} - The soft deleted document.
   */
  async softDeleteManyByIdAndVersion (documents, externalSession = undefined, hooks = undefined)
  {
    hooks = utility.init(hooks, {});
    hooks.bearer = utility.init(hooks.bearer, {});

    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);

    for (const document of documents)
    {
      document._id = Service.validateAndConvertObjectIdCandidate(document._id);
      document.version = Service.validateAndConvertVersion(document.version);
    }

    const successfulDocuments = [];

    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks);
    await SessionManager.exec(async () =>
                              {
                                for (const {_id, version} of documents)
                                {
                                  utility.isExist(hooks.before) ? await hooks.before(_id, version, session) : undefined;
                                  const document = await this._applicationService.softDeleteOneByIdAndVersion(_id, version, session, {bearer: hooks.bearer});
                                  utility.isExist(hooks.after) ? await hooks.after(document, session) : undefined;

                                  successfulDocuments.push(document);
                                }
                              }, externalSession, internalSession);

    return successfulDocuments;
  }

  /* AUTHORIZE */
  /**
   * Authorizes candidate for the specified operation according to the specified schema definition.
   *
   * @param {*} candidate - Either the whole candidate or in recursive calls a sub part of it.
   * @param {Object} schemaDefinition - The specified candidate's schema definition.
   * @param {Array<string>} [skip] - The properties to be skipped.
   * @private
   */
  _authorizeCandidate (candidate, schemaDefinition, skip = [])
  {
    if (!_.isPlainObject(schemaDefinition))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    if (!utility.isInitialized(schemaDefinition))
    {
      throw new BadRequestError(ErrorSafe.get().HTTP_21); // while the schema definition is not initialized, the client sent the candidate.
    }

    if (utility.isExist(candidate))
    {
      switch (Schema.identifyBsonType(schemaDefinition))
      {
        case BsonType.Object:
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

                this._authorizeCandidate(subCandidate[key], schemaDefinition.properties[key]);
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

              this._authorizeCandidate(candidate[key], schemaDefinition.properties[key]);
            }
          }

          break;
        case BsonType.Array:
          if (_.isArray(candidate))
          {
            for (let i = 0; i < candidate.length; i++)
            {
              const item = candidate[i];

              this._authorizeCandidate(item, schemaDefinition.items);
            }
          }
          else if (_.isPlainObject(candidate)) // it can be an object in regex based reads
          {
            this._authorizeCandidate(candidate, schemaDefinition.items);
          }
          else
          {
            throw new BadRequestError(ErrorSafe.get().HTTP_21); // while the candidate is defined as an array in the schema definition, the client sent something else.
          }

          break;
        default:
          if (_.isPlainObject(candidate))
          {
            if (utility.isExist(candidate.$regex))
            {
              candidate = candidate.$regex;
            }

            if (schemaDefinition.isMultilingual)
            {
              for (const language in candidate)
              {
                if (!Service.isLanguageAvailable(language))
                {
                  throw new BadRequestError(ErrorSafe.get().LANGUAGE);
                }

                const value = candidate[language];

                this._authorizeCandidate(value, schemaDefinition);
              }
            }
            else
            {
              this._authorizeCandidate(candidate, schemaDefinition);
            }
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

  /**
   * @return {Object}
   */
  get ENUM ()
  {
    return this.applicationService.ENUM || this.dbService.ENUM;
  }
}

module.exports = ControllerService;
