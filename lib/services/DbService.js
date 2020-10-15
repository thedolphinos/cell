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
    super();

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

    this._layer = Service.LAYER.DB;
  }

  /**
   * Counts the matching documents with the specified query and options.
   *
   * @param {Object} query
   * @param {Object} [options]
   * @param {Object} [hooks]
   * @returns {Promise<Number>} - The matching document count.
   */
  async read (query, options = undefined, hooks = undefined)
  {
    options = utility.init(options, {});
    hooks = utility.init(hooks, {});
    hooks.bearer = utility.init(hooks.bearer, {});

    this._validateParameterQuery(query);
    this._validateParameterOptions(options);
    this._validateParameterHooks(hooks);

    query = Service.validateAndConvertCandidate(query, this.schema.definition, undefined, this._layer);
    query = this._adaptQueryToRead(query);

    let count;
    const {session, internalSession} = SessionManager.generateSessionsForService(options.session, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.query) ? await hooks.query(query) : undefined;

                                utility.isExist(hooks.before) ? await hooks.before(query) : undefined;
                                count = await this._dbOperation.count(query, options);
                                utility.isExist(hooks.after) ? await hooks.after(count) : undefined;
                              }, options.session, internalSession);

    return count;
  }

  /**
   * Fetches the matching documents with the specified query and options.
   *
   * @param {Object} query
   * @param {Object} [options]
   * @param {Object} [hooks]
   * @returns {Promise<Array>} - The fetched documents.
   */
  async read (query, options = undefined, hooks = undefined)
  {
    options = utility.init(options, {});
    hooks = utility.init(hooks, {});
    hooks.bearer = utility.init(hooks.bearer, {});

    this._validateParameterQuery(query);
    this._validateParameterOptions(options);
    this._validateParameterHooks(hooks);

    query = Service.validateAndConvertCandidate(query, this.schema.definition, undefined, this._layer);
    query = this._adaptQueryToRead(query);

    let documents;
    const {session, internalSession} = SessionManager.generateSessionsForService(options.session, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.query) ? await hooks.query(query) : undefined;

                                utility.isExist(hooks.before) ? await hooks.before(query) : undefined;
                                documents = await this._dbOperation.read(query, options);
                                utility.isExist(hooks.after) ? await hooks.after(documents) : undefined;
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
  async readOne (query, options = undefined, hooks = undefined, hooksOfSpecializedVersion = {})
  {
    options = utility.init(options, {});
    hooks = utility.init(hooks, {});
    hooks.bearer = utility.init(hooks.bearer, {});

    this._validateParameterQuery(query);
    this._validateParameterOptions(options);
    this._validateParameterHooks(hooks);
    this._validateParameterHooks(hooksOfSpecializedVersion);
    hooks = utility.isInitialized(hooksOfSpecializedVersion) ? _.merge(hooksOfSpecializedVersion, {bearer: hooks.bearer}) : hooks;

    query = Service.validateAndConvertCandidate(query, this.schema.definition, undefined, this._layer);
    query = this._adaptQueryToRead(query);

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(options.session, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.query) ? await hooks.query(query) : undefined;

                                utility.isExist(hooks.before) ? await hooks.before(query) : undefined;
                                document = await this._dbOperation.readOne(query, options);
                                utility.isExist(hooks.after) ? await hooks.after(document) : undefined;
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
  async createOne (documentCandidate, options = undefined, hooks = undefined)
  {
    options = utility.init(options, {});
    hooks = utility.init(hooks, {});
    hooks.bearer = utility.init(hooks.bearer, {});

    this._validateParameterDocumentCandidate(documentCandidate);
    this._validateParameterOptions(options);
    this._validateParameterHooks(hooks);

    documentCandidate = Service.validateAndConvertCandidate(documentCandidate, this.schema.definition, undefined, this._layer);

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(options.session, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.documentCandidate) ? await hooks.documentCandidate(documentCandidate) : undefined;

                                utility.isExist(hooks.before) ? await hooks.before(documentCandidate) : undefined;
                                document = await this._dbOperation.createOne(documentCandidate, options);
                                utility.isExist(hooks.after) ? await hooks.after(document) : undefined;
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
  async updateOne (query, documentCandidate, options = undefined, hooks = undefined)
  {
    options = utility.init(options, {});
    hooks = utility.init(hooks, {});
    hooks.bearer = utility.init(hooks.bearer, {});

    if (!_.isPlainObject(query) ||
        !_.isPlainObject(documentCandidate) ||
        !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    query = Service.validateAndConvertCandidate(query, this.schema.definition, undefined, this._layer);
    documentCandidate = Service.validateAndConvertCandidate(documentCandidate, this.schema.definition, undefined, this._layer);
    documentCandidate = this._adaptDocumentCandidateToUpdate(documentCandidate);

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(options.session, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.query) ? await hooks.query(query) : undefined;
                                utility.isExist(hooks.documentCandidate) ? await hooks.documentCandidate(documentCandidate) : undefined;

                                utility.isExist(hooks.before) ? await hooks.before(query, document, documentCandidate) : undefined;
                                document = await this._dbOperation.findOneAndUpdate(query, documentCandidate, {
                                  ...options,
                                  returnOriginal: false
                                });
                                utility.isExist(hooks.after) ? await hooks.after(document) : undefined;
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
  async replaceOne (query, documentCandidate, options = undefined, hooks = undefined)
  {
    options = utility.init(options, {});
    hooks = utility.init(hooks, {});
    hooks.bearer = utility.init(hooks.bearer, {});

    this._validateParameterQuery(query);
    this._validateParameterDocumentCandidate(documentCandidate);
    this._validateParameterOptions(options);
    this._validateParameterHooks(hooks);

    query = Service.validateAndConvertCandidate(query, this.schema.definition, undefined, this._layer);
    documentCandidate = Service.validateAndConvertCandidate(documentCandidate, this.schema.definition, undefined, this._layer);

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(options.session, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.query) ? await hooks.query(query) : undefined;
                                utility.isExist(hooks.documentCandidate) ? await hooks.documentCandidate(documentCandidate) : undefined;

                                utility.isExist(hooks.before) ? await hooks.before(query, document, documentCandidate) : undefined;
                                document = await this._dbOperation.findOneAndReplace(query, documentCandidate, {
                                  ...options,
                                  returnOriginal: false
                                });
                                utility.isExist(hooks.after) ? await hooks.after(document) : undefined;
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
  async deleteOne (query, options = undefined, hooks = undefined)
  {
    options = utility.init(options, {});
    hooks = utility.init(hooks, {});
    hooks.bearer = utility.init(hooks.bearer, {});

    if (!_.isPlainObject(query) ||
        !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    query = Service.validateAndConvertCandidate(query, this.schema.definition, undefined, this._layer);

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(options.session, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.query) ? await hooks.query(query) : undefined;

                                utility.isExist(hooks.before) ? await hooks.before(query) : undefined;
                                document = await this._dbOperation.findOneAndDelete(query, options);
                                utility.isExist(hooks.after) ? await hooks.after(document) : undefined;
                              }, options.session, internalSession);

    return document;
  }

  /* ADAPT */
  /**
   * Adapts query to database logic.
   * Converts the specified query from object notation to dot notation.
   *
   * @param {Object} query
   * @return {Object}
   * @protected
   */
  _adaptQueryToRead (query)
  {
    if (!_.isPlainObject(query))
    {
      throw new InvalidArgumentsError();
    }

    let convertedQuery = mongoDotNotation.flatten(query);
    convertedQuery = convertedQuery.$set;

    return convertedQuery;
  }

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
