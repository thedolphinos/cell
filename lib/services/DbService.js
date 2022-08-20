const {InvalidArgumentsError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");
const {ClientSession} = require("mongodb");
const mongoDotNotation = require("mongo-dot-notation");
const ErrorSafe = require("../safes/ErrorSafe");
const Schema = require("../db/Schema");
const SessionManager = require("../db/SessionManager");
const DbOperation = require("../db/DbOperation");
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
   * @param {Object} options
   * @param {Schema} [options.schema]
   * @param {Array<string>} [options.ENUM]
   * @param {DbOperation} [options.dbOperation]
   * @param {string} [options.persona]
   */
  constructor (options)
  {
    if (!_.isPlainObject(options))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    super();

    let isDbOperationCreated = false;

    if (utility.isExist(options.schema))
    {
      if (!(options.schema instanceof Schema))
      {
        throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
      }

      this._dbOperation = new DbOperation(options.schema);
      isDbOperationCreated = true;
    }

    if (utility.isExist(options.dbOperation))
    {
      if (!(options.dbOperation instanceof DbOperation) ||
          isDbOperationCreated)
      {
        throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
      }

      this._dbOperation = options.dbOperation;
      isDbOperationCreated = true;
    }

    if (!isDbOperationCreated)
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    this._ENUM = utility.isExist(options.ENUM) ? this._buildEnum(options.ENUM) : null;
    this._persona = options.persona;
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
  async count (query, options = undefined, hooks = undefined)
  {
    options = utility.init(options, {});
    hooks = utility.init(hooks, {});
    hooks.bearer = utility.init(hooks.bearer, {});

    this._validateParameterQuery(query);
    this._validateParameterOptions(options);
    this._validateParameterHooks(hooks);

    query = Service.validateAndConvertCandidate(query, this.schema.definition, undefined, this._layer);
    query = this._adaptQueryToRead(query);

    utility.isExist(hooks.query) ? await hooks.query(query) : undefined;

    utility.isExist(hooks.before) ? await hooks.before(query) : undefined;
    const count = await this._dbOperation.count(query, options);
    utility.isExist(hooks.after) ? await hooks.after(count) : undefined;

    return count;
  }

  /**
   * Fetches the matching documents with the specified query and options.
   *
   * @param {Object} query
   * @param {Object} [options]
   * @param {number} [options.skip]
   * @param {number} [options.limit]
   * @param {Object} [options.sort]
   * @param {ClientSession} [options.session]
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

    utility.isExist(hooks.query) ? await hooks.query(query) : undefined;
    utility.isExist(hooks.options) ? await hooks.options(options) : undefined;

    let documents;
    const {session, internalSession} = SessionManager.generateSessionsForService(options.session, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.before) ? await hooks.before(query, options, session) : undefined;
                                documents = await this._dbOperation.read(query, {...options, session});
                                utility.isExist(hooks.after) ? await hooks.after(documents, session) : undefined;
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
    hooks = utility.isInitialized(hooksOfSpecializedVersion) ? _.merge(hooks, hooksOfSpecializedVersion, {bearer: hooks.bearer}) : hooks;

    query = Service.validateAndConvertCandidate(query, this.schema.definition, undefined, this._layer);
    query = this._adaptQueryToRead(query);

    utility.isExist(hooks.query) ? await hooks.query(query) : undefined;

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(options.session, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.before) ? await hooks.before(query, session) : undefined;
                                document = await this._dbOperation.readOne(query, {...options, session});
                                utility.isExist(hooks.after) ? await hooks.after(document, session) : undefined;
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

    utility.isExist(hooks.documentCandidate) ? await hooks.documentCandidate(documentCandidate) : undefined;

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(options.session, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.before) ? await hooks.before(documentCandidate, session) : undefined;
                                document = await this._dbOperation.createOne(documentCandidate, {...options, session});
                                utility.isExist(hooks.after) ? await hooks.after(document, session) : undefined;
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
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    query = Service.validateAndConvertCandidate(query, this.schema.definition, undefined, this._layer);
    documentCandidate = Service.validateAndConvertCandidate(documentCandidate, this.schema.definition, undefined, this._layer);
    documentCandidate = this._adaptDocumentCandidateToUpdate(documentCandidate);

    utility.isExist(hooks.query) ? await hooks.query(query) : undefined;
    utility.isExist(hooks.documentCandidate) ? await hooks.documentCandidate(documentCandidate) : undefined;

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(options.session, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.before) ? await hooks.before(query, document, documentCandidate, session) : undefined;
                                document = await this._dbOperation.updateOne(query, documentCandidate, {...options, session, returnOriginal: false});
                                utility.isExist(hooks.after) ? await hooks.after(document, session) : undefined;
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

    utility.isExist(hooks.query) ? await hooks.query(query) : undefined;
    utility.isExist(hooks.documentCandidate) ? await hooks.documentCandidate(documentCandidate) : undefined;

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(options.session, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.before) ? await hooks.before(query, document, documentCandidate, session) : undefined;
                                document = await this._dbOperation.replaceOne(query, documentCandidate, {...options, session, returnOriginal: false});
                                utility.isExist(hooks.after) ? await hooks.after(document, session) : undefined;
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
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    query = Service.validateAndConvertCandidate(query, this.schema.definition, undefined, this._layer);

    utility.isExist(hooks.query) ? await hooks.query(query) : undefined;

    let document;
    const {session, internalSession} = SessionManager.generateSessionsForService(options.session, hooks);
    await SessionManager.exec(async () =>
                              {
                                utility.isExist(hooks.before) ? await hooks.before(query, session) : undefined;
                                document = await this._dbOperation.deleteOne(query, {...options, session});
                                utility.isExist(hooks.after) ? await hooks.after(document, session) : undefined;
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
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    let convertedQuery = mongoDotNotation.flatten(query);
    convertedQuery = utility.isExist(convertedQuery.$set) ? convertedQuery.$set : {};

    for (const key in convertedQuery)
    {
      if (key.endsWith(".$regex"))
      {
        const newKey = key.replace(".$regex", "");
        const value = _.cloneDeep(convertedQuery[key]); // to loose reference
        convertedQuery[newKey] = {$regex: value, $options: "i"};
        delete convertedQuery[key];
      }
    }

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
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
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

  /**
   * @return {Object}
   */
  get ENUM ()
  {
    return this._ENUM;
  }
}

module.exports = DbService;
