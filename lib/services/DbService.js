"use strict";

const {InvalidArgumentsError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");
const mongoDotNotation = require("mongo-dot-notation");

const Schema = require("../db/Schema");
const DbOperation = require("../db/DbOperation");
const SessionManager = require("../db/SessionManager");
const Service = require("../core/Service");

/**
 * Contains the service logic of the framework in database level.
 */
class DbService extends Service
{
  /**
   * Creates an database service instance for the specified schema or database operation.
   * If a schema is provided, creates a database operation.
   *
   * @param {Schema | DbOperation} schema_dbOperation
   */
  constructor (schema_dbOperation)
  {
    super(Service._LAYER.APPLICATION);

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
   * Fetches the matching documents with the specified query and options.
   *
   * @param {Object} query
   * @param {Object} [options]
   * @param {Object} [hooks]
   * @returns {Promise<Array>} - The fetched documents.
   */
  async read (query, options = {}, hooks = {})
  {
    this._validateParamQuery(query);
    this._validateParamOptions(options);
    this._validateParamHooks(hooks);

    let documents;
    const {session, internalSession} = SessionManager.generateSessionsForService(options.session, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.query) ? query = await hooks.query(query, session) : query;

                                utility.isExist(hooks.before) ? await hooks.before(query, session) : null;
                                documents = await this._dbOperation.read(query, options);
                                utility.isExist(hooks.after) ? await hooks.after(documents, session) : null;
                              }, options.session, internalSession);

    return documents;
  }

  /**
   * Fetches the first matching document with the specified query and options.
   *
   * @param {Object} query
   * @param {Object} [options]
   * @param {Object} [hooks]
   * @param {Object} [hooksOfSpecializedVersion] - The hooks that is used by the specialized versions. If initialized, main hooks is ignored. This is not for external use.
   * @returns {Promise<Object>} - The fetched document.
   */
  async readOne (query, options = {}, hooks = {}, hooksOfSpecializedVersion = {})
  {
    this._validateParamQuery(query);
    this._validateParamOptions(options);
    this._validateParamHooks(hooks);
    this._validateParamHooks(hooksOfSpecializedVersion);
    hooks = utility.isInitialized(hooksOfSpecializedVersion) ? hooksOfSpecializedVersion : hooks;

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(options.session, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.query) ? query = await hooks.query(query, session) : query;

                                utility.isExist(hooks.before) ? await hooks.before(query, session) : null;
                                document = await this._dbOperation.readOne(query, options);
                                utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                              }, options.session, internalSession);

    return document;
  }

  /**
   * Creates a document with the specified document candidate and options.
   *
   * @param {Object} documentCandidate
   * @param {Object} [options]
   * @param {Object} [hooks]
   * @returns {Promise<Object>} - The created document.
   */
  async createOne (documentCandidate, options = {}, hooks = {})
  {
    this._validateParamDocumentCandidate(documentCandidate);
    this._validateParamOptions(options);
    this._validateParamHooks(hooks);

    documentCandidate = this._validateAndConvertDocumentCandidate(documentCandidate, this.schema.definition);

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(options.session, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.documentCandidate) ? await hooks.documentCandidate(documentCandidate, session) : null;

                                utility.isExist(hooks.before) ? await hooks.before(documentCandidate, session) : null;
                                document = await this._dbOperation.createOne(documentCandidate, options);
                                utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                              }, options.session, internalSession);

    return document;
  }

  /**
   * Updates the matching document with the specified query, document candidate, and options.
   *
   * @param {Object} query
   * @param {Object} documentCandidate
   * @param {Object} [options]
   * @param {Object} [hooks]
   * @returns {Promise<Object>} - The updated document.
   */
  async updateOne (query, documentCandidate, options = {}, hooks = {})
  {
    if (!_.isPlainObject(query) ||
        !_.isPlainObject(documentCandidate) ||
        !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    documentCandidate = this._validateAndConvertDocumentCandidate(documentCandidate, this.schema.definition);
    documentCandidate = this._adaptDocumentCandidateToUpdate(documentCandidate);

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(options.session, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.query) ? query = await hooks.query(query) : query;
                                utility.isExist(hooks.documentCandidate) ? await hooks.documentCandidate(documentCandidate, session) : null;

                                utility.isExist(hooks.before) ? await hooks.before(query, document, documentCandidate, session) : null;
                                document = await this._dbOperation.findOneAndUpdate(query, documentCandidate, {
                                  ...options,
                                  returnOriginal: false
                                });
                                utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                              }, options.session, internalSession);

    return document;
  }

  /**
   * Replaces the matching document with the specified query, document candidate, and options.
   *
   * @param {Object} query
   * @param {Object} documentCandidate
   * @param {Object} [options]
   * @param {Object} [hooks]
   * @returns {Promise<Object>} - The updated document.
   */
  async replaceOne (query, documentCandidate, options = {}, hooks = {})
  {
    this._validateParamQuery(query);
    this._validateParamDocumentCandidate(documentCandidate);
    this._validateParamOptions(options);
    this._validateParamHooks(hooks);

    documentCandidate = this._validateAndConvertDocumentCandidate(documentCandidate, this.schema.definition);

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(options.session, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.query) ? query = await hooks.query(query) : query;
                                utility.isExist(hooks.documentCandidate) ? await hooks.documentCandidate(documentCandidate, session) : null;

                                utility.isExist(hooks.before) ? await hooks.before(query, document, documentCandidate, session) : null;
                                document = await this._dbOperation.findOneAndReplace(query, documentCandidate, {
                                  ...options,
                                  returnOriginal: false
                                });
                                utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                              }, options.session, internalSession);

    return document;
  }

  /**
   * Deletes the matching document with the specified query and options.
   *
   * @param {Object} query
   * @param {Object} [options]
   * @param {Object} [hooks]
   * @returns {Promise<Object>} - The deleted document.
   */
  async deleteOne (query, options = {}, hooks = {})
  {
    if (!_.isPlainObject(query) ||
        !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(options.session, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.query) ? query = await hooks.query(query, session) : query;

                                utility.isExist(hooks.before) ? await hooks.before(query, session) : null;
                                document = await this._dbOperation.findOneAndDelete(query, options);
                                utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                              }, options.session, internalSession);

    return document;
  }

  /* ADAPT */
  /**
   * Adapts document candidate to database logic.
   * Prepares the necessary update operation according to the specified document candidate.
   * Converts the specified document candidate from object notation to dot notation.
   *
   * !!! If a value is not specified, please provide the key to the unset operation.
   *
   * @param {Object} documentCandidate
   * @return {Object}
   * @protected
   */
  _adaptDocumentCandidateToUpdate (documentCandidate)
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

  /* GET/SET */
  /**
   * @return {DbOperation}
   */
  get dbOperation ()
  {
    return this._dbOperation;
  }

  /**
   * @return {Schema}
   */
  get schema ()
  {
    return this._dbOperation.schema;
  }
}

module.exports = DbService;
