"use strict";

const {
  InvalidArgumentsError,
  DocumentNotFoundError,
  MoreThan1DocumentFoundError,
  BadRequestError
} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");
const {ClientSession, ObjectId} = require("mongodb");

const DbConnectionSafe = require("../safes/DbConnectionSafe");
const Schema = require("../db/Schema");
const DbOperation = require("../db/DbOperation");
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
   * @param {Schema | DbOperation | DbService} schema_dbOperation_dbService
   * @param {boolean} [isCrudControllerApplicationService] - If true, rises errors for CRUD controller.
   */
  constructor (schema_dbOperation_dbService, isCrudControllerApplicationService = false)
  {
    super(Service._LAYER.APPLICATION);

    if (!_.isBoolean(isCrudControllerApplicationService))
    {
      throw new InvalidArgumentsError();
    }

    if (schema_dbOperation_dbService instanceof Schema ||
        schema_dbOperation_dbService instanceof DbOperation)
    {
      this._dbService = new DbService(schema_dbOperation_dbService);
    }
    else if (schema_dbOperation_dbService instanceof DbService)
    {
      this._dbService = schema_dbOperation_dbService;
    }
    else
    {
      throw new InvalidArgumentsError();
    }

    this._isCrudControllerApplicationService = isCrudControllerApplicationService;
  }

  /**
   * Fetches the matching documents with the specified query.
   *
   * @param {Object} query
   * @param {Object} [session]
   * @param {Object} [hooks]
   * @returns {Promise<Array>} - The fetched documents.
   */
  async read (query, session = null, hooks = {})
  {
    this._validateParamQuery(query);
    this._validateParamSession(session);
    this._validateParamHooks(hooks);

    let documents;

    query = this._adaptQuery(query);

    await this._exec(async () =>
                     {
                       utility.isExist(hooks.query) ? query = await hooks.query(query, session) : query;

                       utility.isExist(hooks.before) ? await hooks.before(query, session) : null;
                       documents = await this._dbService.read(query, utility.isExist(session) ? {session} : undefined);
                       utility.isExist(hooks.after) ? await hooks.after(documents, session) : null;
                     }, session, hooks.isSessionEnabled);

    return documents;
  }

  /**
   * Fetches the first matching document with the specified query.
   *
   * @param {Object} query
   * @param {Object} [session]
   * @param {Object} [hooks]
   * @param {Object} [hooksOfSpecializedVersion] - The hooks that is used by the specialized versions. If initialized, main hooks is ignored. This is not for external use.
   * @returns {Promise<Object>} - The fetched document.
   */
  async readOne (query, session = null, hooks = {}, hooksOfSpecializedVersion = {})
  {
    this._validateParamQuery(query);
    this._validateParamSession(session);
    this._validateParamHooks(hooks);
    this._validateParamHooks(hooksOfSpecializedVersion);
    const activeHooks = utility.isInitialized(hooksOfSpecializedVersion) ? hooksOfSpecializedVersion : hooks;

    let document;

    query = this._adaptQuery(query);

    await this._exec(async () =>
                     {
                       utility.isExist(activeHooks.query) ? query = await activeHooks.query(query, session) : query;

                       utility.isExist(activeHooks.before) ? await activeHooks.before(query, session) : null;
                       document = await this._dbService.readOne(query, utility.isExist(session) ? {session} : undefined);
                       utility.isExist(activeHooks.after) ? await activeHooks.after(document, session) : null;
                     }, session, activeHooks.isSessionEnabled);

    if (this._isCrudControllerApplicationService && !utility.isExist(document))
    {
      throw new DocumentNotFoundError();
    }

    return document;
  }

  /**
   * Fetches the matching document with the specified ID.
   * This method is a specialized version of the method `readOne`.
   *
   * @param {string | ObjectId} _id
   * @param {Object} [session]
   * @param {Object} [hooks]
   * @returns {Promise<Object>} - The fetched document.
   */
  async readOneById (_id, session = null, hooks = {})
  {
    this._validateParamSession(session);
    this._validateParamHooks(hooks);

    _id = this._validateAndConvertObjectIdCandidate(_id);

    return this.readOne({_id}, session, undefined, hooks);
  }

  /**
   * Creates a document with the specified document candidate.
   *
   * @param {Object} documentCandidate
   * @param {Object} [session]
   * @param {Object} [hooks]
   * @returns {Promise<Object>} - The created document.
   */
  async createOne (documentCandidate, session = null, hooks = {})
  {
    this._validateParamDocumentCandidate(documentCandidate);
    this._validateParamSession(session);
    this._validateParamHooks(hooks);

    documentCandidate = this._validateAndConvertDocumentCandidate(documentCandidate, this.schema.definition);
    documentCandidate = this._adaptDocumentCandidateForCreate(documentCandidate);

    let document;

    await this._exec(async () =>
                     {
                       utility.isExist(hooks.documentCandidate) ? await hooks.documentCandidate(documentCandidate, session) : null;

                       utility.isExist(hooks.before) ? await hooks.before(documentCandidate, session) : null;
                       document = await this._dbService.createOne(documentCandidate, utility.isExist(session) ? {session} : undefined);
                       utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                     }, session, hooks.isSessionEnabled);

    return document;
  }

  /**
   * Updates the matching document (if there is only 1) with the specified query and document candidate.
   * Uses transactions. If a session is not provided externally, creates one internally.
   *
   * @param {Object} query
   * @param {Object} documentCandidate
   * @param {Object} [session]
   * @param {Object} [hooks]
   * @param {Object} [hooksOfSpecializedVersion] - The hooks that is used by the specialized versions. If initialized, main hooks is ignored. This is not for external use.
   * @returns {Promise<Object>} - The updated document.
   */
  async updateOne (query, documentCandidate, session = null, hooks = {}, hooksOfSpecializedVersion = {})
  {
    this._validateParamQuery(query);
    this._validateParamDocumentCandidate(documentCandidate);
    this._validateParamSession(session);
    !utility.isExist(session) ? session = this._startSession() : session;
    this._validateParamHooks(hooks);
    this._validateParamHooks(hooksOfSpecializedVersion);
    const activeHooks = utility.isInitialized(hooksOfSpecializedVersion) ? hooksOfSpecializedVersion : hooks;

    let document;

    query = this._adaptQuery(query);
    documentCandidate = this._validateAndConvertDocumentCandidate(documentCandidate, this.schema.definition);

    await this._exec(async () =>
                     {
                       utility.isExist(hooks.query) ? query = await hooks.query(query, session) : query;

                       const documents = await this.read(query, session);
                       document = this._checkDocumentSingularity(documents);
                       if (!utility.isExist(document))
                       {
                         return;
                       }

                       utility.isExist(hooks.documentCandidate) ? await hooks.documentCandidate(documentCandidate, session) : null;
                       documentCandidate = this._adaptDocumentCandidateForUpdate(documentCandidate, document);

                       utility.isExist(hooks.before) ? await hooks.before(query, document, documentCandidate, session) : null;
                       document = await this._dbService.updateOne({_id: document._id}, documentCandidate, utility.isExist(session) ? {session} : undefined);
                       utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                     }, session, activeHooks.isSessionEnabled);

    return document;
  }

  /**
   * Updates the matching document with the specified ID, version, document candidate.
   * Uses transactions. If a session is not provided externally, creates one internally.
   * This method is a specialized version of the method `updateOne`.
   *
   * @param {string | ObjectId} _id
   * @param {string | number} version
   * @param {Object} documentCandidate
   * @param {Object} [session]
   * @param {Object} [hooks]
   * @returns {Promise<Object>} - The updated document.
   */
  async updateOneByIdAndVersion (_id, version, documentCandidate, session = null, hooks = {})
  {
    this._validateParamDocumentCandidate(documentCandidate);
    this._validateParamSession(session);
    !utility.isExist(session) ? session = this._startSession() : session;
    this._validateParamHooks(hooks);

    _id = this._validateAndConvertObjectIdCandidate(_id);
    version = this._validateAndConvertVersion(version);
    documentCandidate = this._validateAndConvertDocumentCandidate(documentCandidate, this.schema.definition);

    const document = await this.updateOne({_id}, documentCandidate, session, undefined, hooks);

    this._checkVersion(document.version - 1, version);

    return document;
  }

  /**
   * Replaces the matching document (if there is only 1) with the specified query, document candidate.
   * Uses transactions. If a session is not provided externally, creates one internally.
   *
   * @param {Object} query
   * @param {Object} documentCandidate
   * @param {Object} [session]
   * @param {Object} [hooks]
   * @param {Object} [hooksOfSpecializedVersion] - The hooks that is used by the specialized versions. If initialized, main hooks is ignored. This is not for external use.
   * @returns {Promise<Object>} - The updated document.
   */
  async replaceOne (query, documentCandidate, session = null, hooks = {}, hooksOfSpecializedVersion = {})
  {
    this._validateParamQuery(query);
    this._validateParamDocumentCandidate(documentCandidate);
    this._validateParamSession(session);
    !utility.isExist(session) ? session = this._startSession() : session;
    this._validateParamHooks(hooks);
    this._validateParamHooks(hooksOfSpecializedVersion);
    const activeHooks = utility.isInitialized(hooksOfSpecializedVersion) ? hooksOfSpecializedVersion : hooks;

    let document;

    query = this._adaptQuery(query);
    documentCandidate = this._validateAndConvertDocumentCandidate(documentCandidate, this.schema.definition);

    await this._exec(async () =>
                     {
                       utility.isExist(hooks.query) ? query = await hooks.query(query, session) : query;

                       const documents = await this.read(query, session);
                       document = this._checkDocumentSingularity(documents);
                       if (!utility.isExist(document))
                       {
                         return;
                       }

                       utility.isExist(hooks.documentCandidate) ? await hooks.documentCandidate(documentCandidate, session) : null;
                       documentCandidate = this._adaptDocumentCandidateForReplace(documentCandidate, document);

                       utility.isExist(hooks.before) ? await hooks.before(query, document, documentCandidate, session) : null;
                       document = await this._dbService.replaceOne({_id: document._id}, documentCandidate, utility.isExist(session) ? {session} : undefined);
                       utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                     }, session, activeHooks.isSessionEnabled);

    return document;
  }

  /**
   * Replaces the matching document with the specified ID, version, document candidate.
   * Uses transactions. If a session is not provided externally, creates one internally.
   * This method is a specialized version of the method `replaceOne`.
   *
   * @param {string | ObjectId} _id
   * @param {string | number} version
   * @param {Object} documentCandidate
   * @param {Object} [session]
   * @param {Object} [hooks]
   * @returns {Promise<Object>} - The updated document.
   */
  async replaceOneByIdAndVersion (_id, version, documentCandidate, session = null, hooks = {})
  {
    this._validateParamDocumentCandidate(documentCandidate);
    this._validateParamSession(session);
    !utility.isExist(session) ? session = this._startSession() : session;
    this._validateParamHooks(hooks);

    _id = this._validateAndConvertObjectIdCandidate(_id);
    version = this._validateAndConvertVersion(version);
    documentCandidate = this._validateAndConvertDocumentCandidate(documentCandidate, this.schema.definition);

    const document = await this.replaceOne({_id}, documentCandidate, session, undefined, hooks);

    this._checkVersion(document.version - 1, version);

    return document;
  }

  /**
   * Soft deletes the matching document (if there is only 1) with the specified query.
   * This method is a specialized version of the method `updateOne`.
   *
   * @param {Object} query
   * @param {Object} [session]
   * @param {Object} [hooks]
   * @param {Object} [hooksOfSpecializedVersion] - The hooks that is used by the specialized versions. If initialized, main hooks is ignored. This is not for external use.
   * @returns {Promise<Object>} - The soft deleted document.
   */
  async softDeleteOne (query, session = null, hooks = {})
  {
    this._validateParamQuery(query);
    this._validateParamSession(session);
    this._validateParamHooks(hooks);

    return this.updateOne(query, this._generateDocumentPropertyCandidatesForSoftDelete(), session, undefined, hooks);
  }

  /**
   * Soft deletes the matching document with the specified ID, version.
   * Uses transactions. If a session is not provided externally, creates one internally.
   * This method is a specialized version of the method `softDeleteOne` and naturally `updateOne`.
   *
   * @param {string | ObjectId} _id
   * @param {string | number} version
   * @param {Object} [session]
   * @param {Object} [hooks]
   * @returns {Promise<Object>} - The soft deleted document.
   */
  async softDeleteOneByIdAndVersion (_id, version, session = null, hooks = {})
  {
    this._validateParamSession(session);
    !utility.isExist(session) ? session = this._startSession() : session;
    this._validateParamHooks(hooks);

    _id = this._validateAndConvertObjectIdCandidate(_id);
    version = this._validateAndConvertVersion(version);

    const document = await this.softDeleteOne({_id}, session, hooks);

    this._checkVersion(document.version - 1, version);

    return document;
  }

  /**
   * Deletes the matching document (if there is only 1) with the specified query.
   * Uses transactions. If a session is not provided externally, creates one internally.
   *
   * @param {Object} query
   * @param {Object} [session]
   * @param {Object} [hooks]
   * @param {Object} [hooksOfSpecializedVersion] - The hooks that is used by the specialized versions. If initialized, main hooks is ignored. This is not for external use.
   * @returns {Promise<Object>} - The deleted document.
   */
  async deleteOne (query, session = null, hooks = {}, hooksOfSpecializedVersion = {})
  {
    this._validateParamQuery(query);
    this._validateParamSession(session);
    !utility.isExist(session) ? session = this._startSession() : session;
    this._validateParamHooks(hooks);
    this._validateParamHooks(hooksOfSpecializedVersion);
    const activeHooks = utility.isInitialized(hooksOfSpecializedVersion) ? hooksOfSpecializedVersion : hooks;

    let document;

    query = this._adaptQuery(query);

    await this._exec(async () =>
                     {
                       utility.isExist(hooks.query) ? query = await hooks.query(query, session) : query;

                       const documents = await this.read(query, session);
                       document = this._checkDocumentSingularity(documents);
                       if (!utility.isExist(document))
                       {
                         return;
                       }

                       utility.isExist(hooks.before) ? await hooks.before(query, session) : null;
                       document = await this._dbService.deleteOne({_id: document._id}, utility.isExist(session) ? {session} : undefined);
                       utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                     }, session, activeHooks.isSessionEnabled);

    return document;
  }

  /**
   * Deletes the matching document with the specified ID, version.
   * Uses transactions. If a session is not provided externally, creates one internally.
   * This method is a specialized version of the method `deleteOne`.
   *
   * @param {string | ObjectId} _id
   * @param {string | number} version
   * @param {Object} [session]
   * @param {Object} [hooks]
   * @returns {Promise<Object>} - The deleted document.
   */
  async deleteOneByIdAndVersion (_id, version, session = null, hooks = {})
  {
    this._validateParamSession(session);
    !utility.isExist(session) ? session = this._startSession() : session;
    this._validateParamHooks(hooks);

    _id = this._validateAndConvertObjectIdCandidate(_id);
    version = this._validateAndConvertVersion(version);

    const document = await this.deleteOne({_id}, session, hooks);

    this._checkVersion(document.version - 1, version);

    return document;
  }

  /* SESSION */
  /**
   * Starts a client session.
   *
   * @return {ClientSession}
   * @private
   */
  _startSession ()
  {
    return DbConnectionSafe.get().mongoClient.startSession();
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
      throw new InvalidArgumentsError();
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

  /* GETTER/SETTER */
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
}

module.exports = ApplicationService;
