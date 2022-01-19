const {
  InvalidArgumentsError,
  DocumentNotFoundError,
  MoreThan1DocumentFoundError,
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

/**
 * Contains the service logic of the framework in application level.
 */
class ApplicationService extends Service
{
  /**
   * Creates an application service instance for the specified schema, database operation, or database service.
   * If a schema or database operation is provided, creates a database service.
   *
   * @param {Object} options
   * @param {Schema} [options.schema]
   * @param {Object} [options.ENUM]
   * @param {DbOperation} [options.dbOperation]
   * @param {DbService} [options.dbService]
   * @param {string} [options.persona]
   * @param {boolean} [options.raiseDocumentExistenceErrors]
   */
  constructor (options)
  {
    if (!_.isPlainObject(options))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    super();

    let isDbServiceCreated = false;

    if (utility.isExist(options.schema))
    {
      if (!(options.schema instanceof Schema))
      {
        throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
      }

      this._dbService = new DbService({schema: options.schema, persona: options.persona});
      isDbServiceCreated = true;
    }

    if (utility.isExist(options.dbOperation))
    {
      if (!(options.dbOperation instanceof DbOperation) ||
          isDbServiceCreated)
      {
        throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
      }

      this._dbService = new DbService({dbOperation: options.dbOperation, persona: options.persona});
      isDbServiceCreated = true;
    }

    if (utility.isExist(options.dbService))
    {
      if (!(options.dbService instanceof DbService) ||
          isDbServiceCreated ||
          (utility.isExist(options.persona) && options.persona !== options.dbService.persona))
      {
        throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
      }

      this._dbService = options.dbService;
      isDbServiceCreated = true;
    }

    if (!isDbServiceCreated)
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    this._ENUM = options.ENUM;
    this._persona = options.persona;
    this._raiseDocumentExistenceErrors = utility.isExist(options.raiseDocumentExistenceErrors) ? options.raiseDocumentExistenceErrors : false;
    this._layer = Service.LAYER.APPLICATION;
  }

  /**
   * Counts the matching documents with the specified query.
   *
   * @param {Object} query
   * @param {Object} [hooks]
   * @returns {Promise<number>} - The matching document count.
   */
  async count (query, hooks = undefined)
  {
    hooks = utility.init(hooks, {});
    hooks.bearer = utility.init(hooks.bearer, {});

    this._validateParameterQuery(query);
    this._validateParameterHooks(hooks);

    query = Service.validateAndConvertCandidate(query, this.schema.definition, undefined, this._layer);
    query = this._adaptQuery(query);

    utility.isExist(hooks.query) ? await hooks.query(query) : undefined;

    utility.isExist(hooks.before) ? await hooks.before(query) : undefined;
    const count = await this.dbService.count(query, undefined, {bearer: hooks.bearer});
    utility.isExist(hooks.after) ? await hooks.after(count) : undefined;

    return count;
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

    query = Service.validateAndConvertCandidate(query, this.schema.definition, undefined, this._layer);
    query = this._adaptQuery(query);

    utility.isExist(hooks.query) ? await hooks.query(query) : undefined;

    let documents;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.before) ? await hooks.before(query, session) : undefined;
                                documents = await this._dbService.read(query, utility.isExist(session) ? {session} : undefined, {bearer: hooks.bearer});
                                utility.isExist(hooks.after) ? await hooks.after(documents, session) : undefined;
                              }, externalSession, internalSession);

    return documents;
  }

  /**
   * Fetches the first matching document with the specified query.
   *
   * @param {Object} query
   * @param {ClientSession} [externalSession]
   * @param {Object} [hooks]
   * @param {Object} [hooksOfSpecializedVersion] - The hooks that is used by the specialized versions. If initialized, main hooks is ignored. This is not for external use.
   * @returns {Promise<Object>} - The fetched document.
   */
  async readOne (query, externalSession = undefined, hooks = undefined, hooksOfSpecializedVersion = undefined)
  {
    hooks = utility.init(hooks, {});
    hooks.bearer = utility.init(hooks.bearer, {});
    hooksOfSpecializedVersion = utility.init(hooksOfSpecializedVersion, {});

    this._validateParameterQuery(query);
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);
    this._validateParameterHooks(hooksOfSpecializedVersion);
    hooks = utility.isInitialized(hooksOfSpecializedVersion) ? _.merge(hooks, hooksOfSpecializedVersion, {bearer: hooks.bearer}) : hooks;

    query = Service.validateAndConvertCandidate(query, this.schema.definition, undefined, this._layer);
    query = this._adaptQuery(query);

    utility.isExist(hooks.query) ? await hooks.query(query) : undefined;

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.before) ? await hooks.before(query, session) : undefined;
                                document = await this._dbService.readOne(query, utility.isExist(session) ? {session} : undefined, {bearer: hooks.bearer});
                                utility.isExist(hooks.after) ? await hooks.after(document, session) : undefined;
                              }, externalSession, internalSession);

    if (utility.isExist(hooks.raiseDocumentExistenceErrors))
    {
      if (hooks.raiseDocumentExistenceErrors && !utility.isExist(document))
      {
        throw new DocumentNotFoundError(ErrorSafe.get().DB_1);
      }
    }
    else
    {
      if (this._raiseDocumentExistenceErrors && !utility.isExist(document))
      {
        throw new DocumentNotFoundError(ErrorSafe.get().DB_1);
      }
    }

    return document;
  }

  /**
   * Fetches the matching document with the specified ID.
   * This method is a specialized version of the method `readOne`.
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

    return this.readOne({_id}, externalSession, undefined, hooks);
  }

  /**
   * Fetches the matching document with the specified ID, version.
   * This method is a specialized version of the method `readOne`.
   *
   * @param {string | ObjectId} _id
   * @param {string | number} version
   * @param {ClientSession} [externalSession]
   * @param {Object} [hooks]
   * @returns {Promise<Object>} - The fetched document.
   */
  async readOneByIdAndVersion (_id, version, externalSession = undefined, hooks = undefined)
  {
    hooks = utility.init(hooks, {});
    hooks.bearer = utility.init(hooks.bearer, {});

    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);

    _id = Service.validateAndConvertObjectIdCandidate(_id);
    version = Service.validateAndConvertVersion(version);

    const document = await this.readOne({_id}, externalSession, undefined, hooks);
    this._checkVersion(document.version, version);

    return document;
  }

  /**
   * Creates a document with the specified document candidate.
   *
   * @param {Object} documentCandidate
   * @param {ClientSession} [externalSession]
   * @param {Object} [hooks]
   * @returns {Promise<Object>} - The created document.
   */
  async createOne (documentCandidate, externalSession = undefined, hooks = undefined)
  {
    hooks = utility.init(hooks, {});
    hooks.bearer = utility.init(hooks.bearer, {});

    this._validateParameterDocumentCandidate(documentCandidate);
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);

    documentCandidate = Service.validateAndConvertCandidate(documentCandidate, this.schema.definition, undefined, this._layer);
    documentCandidate = this._adaptDocumentCandidateForCreate(documentCandidate);

    utility.isExist(hooks.documentCandidate) ? await hooks.documentCandidate(documentCandidate) : undefined;

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.before) ? await hooks.before(documentCandidate, session) : undefined;
                                document = await this._dbService.createOne(documentCandidate, utility.isExist(session) ? {session} : undefined, {bearer: hooks.bearer});
                                utility.isExist(hooks.after) ? await hooks.after(document, session) : undefined;
                              }, externalSession, internalSession);

    return document;
  }

  /**
   * Updates the matching document (if there is only 1) with the specified query and document candidate.
   * Uses transactions. If a session is not provided externally, creates one internally, if the hooks is not disabling session.
   *
   * @param {Object} query
   * @param {Object} documentCandidate
   * @param {ClientSession} [externalSession]
   * @param {Object} [hooks]
   * @param {Object} [hooksOfSpecializedVersion] - The hooks that is used by the specialized versions. If initialized, main hooks is ignored. This is not for external use.
   * @returns {Promise<Object>} - The updated document.
   */
  async updateOne (query, documentCandidate, externalSession = undefined, hooks = undefined, hooksOfSpecializedVersion = undefined)
  {
    hooks = utility.init(hooks, {});
    hooks.bearer = utility.init(hooks.bearer, {});
    hooksOfSpecializedVersion = utility.init(hooksOfSpecializedVersion, {});

    this._validateParameterQuery(query);
    this._validateParameterDocumentCandidate(documentCandidate);
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);
    this._validateParameterHooks(hooksOfSpecializedVersion);
    hooks = utility.isInitialized(hooksOfSpecializedVersion) ? _.merge(hooks, hooksOfSpecializedVersion, {bearer: hooks.bearer}) : hooks;

    query = Service.validateAndConvertCandidate(query, this.schema.definition, undefined, this._layer);
    query = this._adaptQuery(query);
    documentCandidate = Service.validateAndConvertCandidate(documentCandidate, this.schema.definition, undefined, this._layer);

    utility.isExist(hooks.query) ? await hooks.query(query) : undefined;
    utility.isExist(hooks.documentCandidate) ? await hooks.documentCandidate(documentCandidate) : undefined;

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks, true);
    await SessionManager.exec(async () =>
                              {
                                const documents = await this.read(query, session, {bearer: hooks.bearer});
                                this._checkDocumentSingularity(documents, hooks.raiseDocumentExistenceErrors);
                                document = documents[0];
                                if (!utility.isExist(document))
                                {
                                  return;
                                }

                                documentCandidate = this._adaptDocumentCandidateForUpdate(documentCandidate, document);

                                utility.isExist(hooks.before) ? await hooks.before(query, document, documentCandidate, session) : undefined;
                                document = await this._dbService.updateOne({_id: document._id}, documentCandidate, utility.isExist(session) ? {session} : undefined, {bearer: hooks.bearer});
                                utility.isExist(hooks.after) ? await hooks.after(document, session) : undefined;
                              }, externalSession, internalSession);

    return document;
  }

  /**
   * Updates the matching document with the specified ID, version, document candidate.
   * Uses transactions. If a session is not provided externally, creates one internally, if the hooks is not disabling session.
   * This method is a specialized version of the method `updateOne`.
   *
   * @param {string | ObjectId} _id
   * @param {string | number} version
   * @param {Object} documentCandidate
   * @param {ClientSession} [externalSession]
   * @param {Object} [hooks]
   * @returns {Promise<Object>} - The updated document.
   */
  async updateOneByIdAndVersion (_id, version, documentCandidate, externalSession = undefined, hooks = undefined)
  {
    hooks = utility.init(hooks, {});
    hooks.bearer = utility.init(hooks.bearer, {});

    this._validateParameterDocumentCandidate(documentCandidate);
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);

    _id = Service.validateAndConvertObjectIdCandidate(_id);
    version = Service.validateAndConvertVersion(version);
    documentCandidate = Service.validateAndConvertCandidate(documentCandidate, this.schema.definition, undefined, this._layer);

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks, true);
    await SessionManager.exec(async () =>
                              {
                                document = await this.updateOne({_id}, documentCandidate, session, undefined, hooks);
                                this._checkVersion(document.version - 1, version);
                              }, externalSession, internalSession);

    return document;
  }

  /**
   * Replaces the matching document (if there is only 1) with the specified query, document candidate.
   * Uses transactions. If a session is not provided externally, creates one internally, if the hooks is not disabling session.
   *
   * @param {Object} query
   * @param {Object} documentCandidate
   * @param {ClientSession} [externalSession]
   * @param {Object} [hooks]
   * @param {Object} [hooksOfSpecializedVersion] - The hooks that is used by the specialized versions. If initialized, main hooks is ignored. This is not for external use.
   * @returns {Promise<Object>} - The updated document.
   */
  async replaceOne (query, documentCandidate, externalSession = undefined, hooks = undefined, hooksOfSpecializedVersion = undefined)
  {
    hooks = utility.init(hooks, {});
    hooks.bearer = utility.init(hooks.bearer, {});
    hooksOfSpecializedVersion = utility.init(hooksOfSpecializedVersion, {});

    this._validateParameterQuery(query);
    this._validateParameterDocumentCandidate(documentCandidate);
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);
    this._validateParameterHooks(hooksOfSpecializedVersion);
    hooks = utility.isInitialized(hooksOfSpecializedVersion) ? _.merge(hooks, hooksOfSpecializedVersion, {bearer: hooks.bearer}) : hooks;

    query = Service.validateAndConvertCandidate(query, this.schema.definition, undefined, this._layer);
    query = this._adaptQuery(query);
    documentCandidate = Service.validateAndConvertCandidate(documentCandidate, this.schema.definition, undefined, this._layer);

    utility.isExist(hooks.query) ? await hooks.query(query) : undefined;
    utility.isExist(hooks.documentCandidate) ? await hooks.documentCandidate(documentCandidate) : undefined;

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks, true);
    await SessionManager.exec(async () =>
                              {
                                const documents = await this.read(query, session, {bearer: hooks.bearer});
                                this._checkDocumentSingularity(documents, hooks.raiseDocumentExistenceErrors);
                                document = documents[0];
                                if (!utility.isExist(document))
                                {
                                  return;
                                }

                                documentCandidate = this._adaptDocumentCandidateForReplace(documentCandidate, document);

                                utility.isExist(hooks.before) ? await hooks.before(query, document, documentCandidate, session) : undefined;
                                document = await this._dbService.replaceOne({_id: document._id}, documentCandidate, utility.isExist(session) ? {session} : undefined, {bearer: hooks.bearer});
                                utility.isExist(hooks.after) ? await hooks.after(document, session) : undefined;
                              }, externalSession, internalSession);

    return document;
  }

  /**
   * Replaces the matching document with the specified ID, version, document candidate.
   * Uses transactions. If a session is not provided externally, creates one internally, if the hooks is not disabling session.
   * This method is a specialized version of the method `replaceOne`.
   *
   * @param {string | ObjectId} _id
   * @param {string | number} version
   * @param {Object} documentCandidate
   * @param {ClientSession} [externalSession]
   * @param {Object} [hooks]
   * @returns {Promise<Object>} - The updated document.
   */
  async replaceOneByIdAndVersion (_id, version, documentCandidate, externalSession = undefined, hooks = undefined)
  {
    hooks = utility.init(hooks, {});
    hooks.bearer = utility.init(hooks.bearer, {});

    this._validateParameterDocumentCandidate(documentCandidate);
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);

    _id = Service.validateAndConvertObjectIdCandidate(_id);
    version = Service.validateAndConvertVersion(version);
    documentCandidate = Service.validateAndConvertCandidate(documentCandidate, this.schema.definition, undefined, this._layer);

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks, true);
    await SessionManager.exec(async () =>
                              {
                                document = await this.replaceOne({_id}, documentCandidate, session, undefined, hooks);
                                this._checkVersion(document.version - 1, version);
                              }, externalSession, internalSession);

    return document;
  }

  /**
   * Soft deletes the matching document (if there is only 1) with the specified query.
   * This method is a specialized version of the method `updateOne`.
   *
   * @param {Object} query
   * @param {ClientSession} [session]
   * @param {Object} [hooks]
   * @returns {Promise<Object>} - The soft deleted document.
   */
  async softDeleteOne (query, session = undefined, hooks = undefined)
  {
    hooks = utility.init(hooks, {});
    hooks.bearer = utility.init(hooks.bearer, {});

    this._validateParameterQuery(query);
    this._validateParameterSession(session);
    this._validateParameterHooks(hooks);

    return this.updateOne(query, this._generateDocumentPropertyCandidatesForSoftDelete(), session, undefined, hooks);
  }

  /**
   * Soft deletes the matching document with the specified ID, version.
   * Uses transactions. If a session is not provided externally, creates one internally, if the hooks is not disabling session.
   * This method is a specialized version of the method `softDeleteOne` and naturally `updateOne`.
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
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks, true);
    await SessionManager.exec(async () =>
                              {
                                document = await this.softDeleteOne({_id}, session, hooks);
                                this._checkVersion(document.version - 1, version);
                              }, externalSession, internalSession);

    return document;
  }

  /**
   * Deletes the matching document (if there is only 1) with the specified query.
   * Uses transactions. If a session is not provided externally, creates one internally, if the hooks is not disabling session.
   *
   * @param {Object} query
   * @param {ClientSession} [externalSession]
   * @param {Object} [hooks]
   * @param {Object} [hooksOfSpecializedVersion] - The hooks that is used by the specialized versions. If initialized, main hooks is ignored. This is not for external use.
   * @returns {Promise<Object>} - The deleted document.
   */
  async deleteOne (query, externalSession = undefined, hooks = undefined, hooksOfSpecializedVersion = undefined)
  {
    hooks = utility.init(hooks, {});
    hooks.bearer = utility.init(hooks.bearer, {});
    hooksOfSpecializedVersion = utility.init(hooksOfSpecializedVersion, {});

    this._validateParameterQuery(query);
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);
    this._validateParameterHooks(hooksOfSpecializedVersion);
    hooks = utility.isInitialized(hooksOfSpecializedVersion) ? _.merge(hooks, hooksOfSpecializedVersion, {bearer: hooks.bearer}) : hooks;

    query = Service.validateAndConvertCandidate(query, this.schema.definition, undefined, this._layer);
    query = this._adaptQuery(query);

    utility.isExist(hooks.query) ? await hooks.query(query) : undefined;

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks, true);
    await SessionManager.exec(async () =>
                              {
                                const documents = await this.read(query, session, {bearer: hooks.bearer});
                                this._checkDocumentSingularity(documents, hooks.raiseDocumentExistenceErrors);
                                document = documents[0];
                                if (!utility.isExist(document))
                                {
                                  return;
                                }

                                utility.isExist(hooks.before) ? await hooks.before(query, session) : undefined;
                                document = await this._dbService.deleteOne({_id: document._id}, utility.isExist(session) ? {session} : undefined, {bearer: hooks.bearer});
                                utility.isExist(hooks.after) ? await hooks.after(document, session) : undefined;
                              }, externalSession, internalSession);

    return document;
  }

  /**
   * Deletes the matching document with the specified ID, version.
   * Uses transactions. If a session is not provided externally, creates one internally, if the hooks is not disabling session.
   * This method is a specialized version of the method `deleteOne`.
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
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks, true);
    await SessionManager.exec(async () =>
                              {
                                document = await this.deleteOne({_id}, session, hooks);
                                this._checkVersion(document.version, version);
                              }, externalSession, internalSession);

    return document;
  }

  /* CHECK */
  /**
   * Verifies the specified version.
   *
   * @param {number} documentVersion
   * @param {number} version
   * @protected
   */
  _checkVersion (documentVersion, version)
  {
    if (!utility.isValidNumber(documentVersion) ||
        !utility.isValidNumber(version))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    if (documentVersion < version)
    {
      throw new BadRequestError(ErrorSafe.get().DOCUMENT_INVALID_VERSION, documentVersion, version);
    }
    else if (documentVersion > version)
    {
      throw new BadRequestError(ErrorSafe.get().DOCUMENT_MODIFIED, documentVersion, version);
    }
  }

  /**
   * Checks document singularity in multi step operations.
   *
   * @param {Array<Object>} documents
   * @private
   */
  _checkDocumentSingularity (documents, raiseDocumentExistenceErrorsFromHooks)
  {
    if (!_.isArray(documents))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    if (utility.isExist(raiseDocumentExistenceErrorsFromHooks))
    {
      if (raiseDocumentExistenceErrorsFromHooks)
      {
        switch (documents.length)
        {
          case 0:
            throw new DocumentNotFoundError(ErrorSafe.get().DB_1);
          case 1:
            break;
          default:
            throw new MoreThan1DocumentFoundError(ErrorSafe.get().DB_2);
        }
      }
    }
    else
    {
      if (this._raiseDocumentExistenceErrors)
      {
        switch (documents.length)
        {
          case 0:
            throw new DocumentNotFoundError(ErrorSafe.get().DB_1);
          case 1:
            break;
          default:
            throw new MoreThan1DocumentFoundError(ErrorSafe.get().DB_2);
        }
      }
    }
  }

  /* ADAPT */
  /**
   * Adapts query to application logic.
   *
   * @param {Object} query
   * @return {Object}
   * @protected
   */
  _adaptQuery (query)
  {
    if (!_.isPlainObject(query))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
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
   * @param {Object} documentCandidate
   * @return {Object}
   * @protected
   */
  _adaptDocumentCandidateForCreate (documentCandidate)
  {
    if (!_.isPlainObject(documentCandidate))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    return {
      ...documentCandidate,
      version: 0,
      isSoftDeleted: false,
      createdAt: new Date()
    };
  }

  /**
   * Adapts document candidate to application logic for update operations.
   *
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
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    return {
      ...documentCandidate,
      version: document.version + 1
    };
  }

  /**
   * Adapts document candidate to application logic for replace operations.
   *
   * @param {Object} documentCandidate
   * @param {Object} document
   * @return {Object}
   * @protected
   */
  _adaptDocumentCandidateForReplace (documentCandidate, document)
  {
    if (!_.isPlainObject(documentCandidate) ||
        !_.isPlainObject(document))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    return {
      ...documentCandidate,
      _id: document._id,
      version: document.version + 1,
      isSoftDeleted: false
    };
  }

  /**
   * Generates document property candidates which are adapted to application logic for soft delete operations.
   *
   * @return {Object}
   * @protected
   */
  _generateDocumentPropertyCandidatesForSoftDelete ()
  {
    return {
      isSoftDeleted: true
    };
  }

  /* GET/SET */
  /**
   * @return {DbService}
   */
  get dbService ()
  {
    return this._dbService;
  }

  /**
   * @return {DbOperation}
   */
  get dbOperation ()
  {
    return this._dbService.dbOperation;
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
    return this._ENUM;
  }
}

module.exports = ApplicationService;
