"use strict";

const {
  InvalidArgumentsError,
  DocumentNotFoundError,
  MoreThan1DocumentFoundError,
  BadRequestError
} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");
const {ObjectId} = require("mongodb");

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
   * @param {Schema | DbOperation | DbService} schema_dbOperation_dbService
   */
  constructor (schema_dbOperation_dbService)
  {
    super(Service._LAYER.APPLICATION);

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
  }

  /**
   * Fetches the matching documents with the specified query.
   *
   * @param {Object} query
   * @param {ClientSession} [externalSession]
   * @param {Object} [hooks]
   * @returns {Promise<Array>} - The fetched documents.
   */
  async read (query, externalSession = null, hooks = {})
  {
    this._validateParameterQuery(query);
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);

    query = this._validateAndConvertCandidate(query, this.schema.definition);
    query = this._adaptQuery(query);

    let documents;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.query) ? await hooks.query(query, session) : null;

                                utility.isExist(hooks.before) ? await hooks.before(query, session) : null;
                                documents = await this._dbService.read(query, utility.isExist(session) ? {session} : undefined);
                                utility.isExist(hooks.after) ? await hooks.after(documents, session) : null;
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
  async readOne (query, externalSession = null, hooks = {}, hooksOfSpecializedVersion = {})
  {
    this._validateParameterQuery(query);
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);
    this._validateParameterHooks(hooksOfSpecializedVersion);
    hooks = utility.isInitialized(hooksOfSpecializedVersion) ? hooksOfSpecializedVersion : hooks;

    query = this._validateAndConvertCandidate(query, this.schema.definition);
    query = this._adaptQuery(query);

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.query) ? await hooks.query(query, session) : null;

                                utility.isExist(hooks.before) ? await hooks.before(query, session) : null;
                                document = await this._dbService.readOne(query, utility.isExist(session) ? {session} : undefined);
                                utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                              }, externalSession, internalSession);

    if (!utility.isExist(document))
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
   * @param {ClientSession} [externalSession]
   * @param {Object} [hooks]
   * @returns {Promise<Object>} - The fetched document.
   */
  async readOneById (_id, externalSession = null, hooks = {})
  {
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);

    _id = this._validateAndConvertObjectIdCandidate(_id);

    return this.readOne({_id}, externalSession, undefined, hooks);
  }

  /**
   * Creates a document with the specified document candidate.
   *
   * @param {Object} documentCandidate
   * @param {ClientSession} [externalSession]
   * @param {Object} [hooks]
   * @returns {Promise<Object>} - The created document.
   */
  async createOne (documentCandidate, externalSession = null, hooks = {})
  {
    this._validateParameterDocumentCandidate(documentCandidate);
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);

    documentCandidate = this._validateAndConvertCandidate(documentCandidate, this.schema.definition);
    documentCandidate = this._adaptDocumentCandidateForCreate(documentCandidate);

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.documentCandidate) ? await hooks.documentCandidate(documentCandidate, session) : null;

                                utility.isExist(hooks.before) ? await hooks.before(documentCandidate, session) : null;
                                document = await this._dbService.createOne(documentCandidate, utility.isExist(session) ? {session} : undefined);
                                utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
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
  async updateOne (query, documentCandidate, externalSession = null, hooks = {}, hooksOfSpecializedVersion = {})
  {
    this._validateParameterQuery(query);
    this._validateParameterDocumentCandidate(documentCandidate);
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);
    this._validateParameterHooks(hooksOfSpecializedVersion);
    hooks = utility.isInitialized(hooksOfSpecializedVersion) ? hooksOfSpecializedVersion : hooks;

    query = this._validateAndConvertCandidate(query, this.schema.definition);
    query = this._adaptQuery(query);
    documentCandidate = this._validateAndConvertCandidate(documentCandidate, this.schema.definition);

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks, true);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.query) ? await hooks.query(query, session) : null;

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
  async updateOneByIdAndVersion (_id, version, documentCandidate, externalSession = null, hooks = {})
  {
    this._validateParameterDocumentCandidate(documentCandidate);
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);

    _id = this._validateAndConvertObjectIdCandidate(_id);
    version = this._validateAndConvertVersion(version);
    documentCandidate = this._validateAndConvertCandidate(documentCandidate, this.schema.definition);

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
  async replaceOne (query, documentCandidate, externalSession = null, hooks = {}, hooksOfSpecializedVersion = {})
  {
    this._validateParameterQuery(query);
    this._validateParameterDocumentCandidate(documentCandidate);
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);
    this._validateParameterHooks(hooksOfSpecializedVersion);
    hooks = utility.isInitialized(hooksOfSpecializedVersion) ? hooksOfSpecializedVersion : hooks;

    query = this._validateAndConvertCandidate(query, this.schema.definition);
    query = this._adaptQuery(query);
    documentCandidate = this._validateAndConvertCandidate(documentCandidate, this.schema.definition);

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks, true);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.query) ? await hooks.query(query, session) : null;

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
  async replaceOneByIdAndVersion (_id, version, documentCandidate, externalSession = null, hooks = {})
  {
    this._validateParameterDocumentCandidate(documentCandidate);
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);

    _id = this._validateAndConvertObjectIdCandidate(_id);
    version = this._validateAndConvertVersion(version);
    documentCandidate = this._validateAndConvertCandidate(documentCandidate, this.schema.definition);

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
   * @param {Object} [session]
   * @param {Object} [hooks]
   * @returns {Promise<Object>} - The soft deleted document.
   */
  async softDeleteOne (query, session = null, hooks = {})
  {
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
  async softDeleteOneByIdAndVersion (_id, version, externalSession = null, hooks = {})
  {
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);

    _id = this._validateAndConvertObjectIdCandidate(_id);
    version = this._validateAndConvertVersion(version);

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
  async deleteOne (query, externalSession = null, hooks = {}, hooksOfSpecializedVersion = {})
  {
    this._validateParameterQuery(query);
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);
    this._validateParameterHooks(hooksOfSpecializedVersion);
    hooks = utility.isInitialized(hooksOfSpecializedVersion) ? hooksOfSpecializedVersion : hooks;

    query = this._validateAndConvertCandidate(query, this.schema.definition);
    query = this._adaptQuery(query);

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks, true);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.query) ? await hooks.query(query, session) : null;

                                const documents = await this.read(query, session);
                                document = this._checkDocumentSingularity(documents);
                                if (!utility.isExist(document))
                                {
                                  return;
                                }

                                utility.isExist(hooks.before) ? await hooks.before(query, session) : null;
                                document = await this._dbService.deleteOne({_id: document._id}, utility.isExist(session) ? {session} : undefined);
                                utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
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
  async deleteOneByIdAndVersion (_id, version, externalSession = null, hooks = {})
  {
    this._validateParameterSession(externalSession);
    this._validateParameterHooks(hooks);

    _id = this._validateAndConvertObjectIdCandidate(_id);
    version = this._validateAndConvertVersion(version);

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(externalSession, hooks, true);
    await SessionManager.exec(async () =>
                              {
                                document = await this.deleteOne({_id}, session, hooks);
                                this._checkVersion(document.version - 1, version);
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

    switch (documents.length)
    {
      case 0:
        throw new DocumentNotFoundError();
      case 1:
        break;
      default:
        throw new MoreThan1DocumentFoundError();
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
}

module.exports = ApplicationService;
