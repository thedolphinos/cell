const {InvalidArgumentsError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");

const _ = require("lodash");

const ErrorSafe = require("../safes/ErrorSafe");
const SessionManager = require("../db/SessionManager");
const ControllerService = require("../services/ControllerService");
const Controller = require("../core/Controller");

/**
 * Contains generic methods for CRUD operations.
 * Should be used as a super Class.
 */
class CrudController extends Controller
{
  /**
   * @param {ControllerService} controllerService
   * @param {Object} controllerService
   * @param {Object} [options]
   * @param {Object} [options.allowedProperties]
   * @param {boolean} [options.isAllowedPropertiesComplete]
   */
  constructor (controllerService, options = undefined)
  {
    options = utility.init(options, {});
    options.allowedProperties = utility.init(options.allowedProperties, CrudController.DEFAULT_ALLOWED_PROPERTIES);
    options.isAllowedPropertiesComplete = utility.init(options.isAllowedPropertiesComplete, false);

    super();

    this._validateConstructorParams(controllerService, options);

    this._controllerService = controllerService;
    this._allowedProperties = options.isAllowedPropertiesComplete ? options.allowedProperties : _.merge(_.cloneDeep(CrudController.DEFAULT_ALLOWED_PROPERTIES), options.allowedProperties); // cloneDeep is used to remove reference.
  }

  /**
   * Fetches the requested documents.
   *
   * @param {Object} request
   * @param {Object} response
   * @param {Function} [next]
   * @param {Object} [hooks]
   * @param {Object} [allowedProperties]
   * @return {Promise<void>}
   */
  async read (request, response, next = undefined, hooks = undefined, allowedProperties = undefined)
  {
    try
    {
      hooks = utility.init(hooks, {});
      hooks.bearer = utility.init(hooks.bearer, {});
      allowedProperties = utility.init(allowedProperties, this._allowedProperties[CrudController.METHOD_IDENTIFIER.READ]);

      const queryString = this._extractQueryString(request, allowedProperties.queryString);
      let query = this._extractQueryStringParameter(queryString, "query");

      this._authorizeAttempting(query, allowedProperties.query || []);

      let documents;
      const {session} = SessionManager.generateSessionsForController(hooks);
      await SessionManager.exec(async () =>
                                {
                                  utility.isExist(hooks.query) ? await hooks.query(query) : undefined;

                                  utility.isExist(hooks.before) ? await hooks.before(query) : undefined;
                                  documents = await this._controllerService.read(query, session, {bearer: hooks.bearer});
                                  utility.isExist(hooks.after) ? await hooks.after(documents) : undefined;
                                }, undefined, session);

      await this._sendResponse(request, response, 200, {documents});
    }
    catch (error)
    {
      this._sendResponseWhenError(response, error);
    }
  }

  /**
   * Fetches the requested document by ID.
   *
   * @param {Object} request
   * @param {Object} response
   * @param {Function} [next]
   * @param {Object} [hooks]
   * @param {Object} [allowedProperties]
   * @return {Promise<void>}
   */
  async readOneById (request, response, next = undefined, hooks = undefined, allowedProperties = undefined)
  {
    try
    {
      hooks = utility.init(hooks, {});
      hooks.bearer = utility.init(hooks.bearer, {});
      allowedProperties = utility.init(allowedProperties, this._allowedProperties[CrudController.METHOD_IDENTIFIER.READ_ONE_BY_ID]);

      const pathParameters = this._extractPathParameters(request, allowedProperties.pathParameters);
      const _id = this._extractPathParameter(pathParameters, "_id");

      let document;
      const {session} = SessionManager.generateSessionsForController(hooks);
      await SessionManager.exec(async () =>
                                {
                                  utility.isExist(hooks.before) ? await hooks.before(_id) : undefined;
                                  document = await this._controllerService.readOneById(_id, session, {bearer: hooks.bearer});
                                  utility.isExist(hooks.after) ? await hooks.after(document) : undefined;
                                }, undefined, session);

      await this._sendResponse(request, response, 200, {document});
    }
    catch (error)
    {
      this._sendResponseWhenError(response, error);
    }
  }

  /**
   * Creates the requested document.
   *
   * @param {Object} request
   * @param {Object} response
   * @param {Function} [next]
   * @param {Object} [hooks]
   * @param {Object} [allowedProperties]
   * @return {Promise<void>}
   */
  async createOne (request, response, next = undefined, hooks = undefined, allowedProperties = undefined)
  {
    try
    {
      hooks = utility.init(hooks, {});
      hooks.bearer = utility.init(hooks.bearer, {});
      allowedProperties = utility.init(allowedProperties, this._allowedProperties[CrudController.METHOD_IDENTIFIER.CREATE_ONE]);

      let body = this._extractBody(request, allowedProperties.body);

      let document;
      const {session} = SessionManager.generateSessionsForController(hooks);
      await SessionManager.exec(async () =>
                                {
                                  utility.isExist(hooks.body) ? await hooks.body(body) : undefined;

                                  utility.isExist(hooks.before) ? await hooks.before(body) : undefined;
                                  document = await this._controllerService.createOne(body, session, {bearer: hooks.bearer});
                                  utility.isExist(hooks.after) ? await hooks.after(document) : undefined;
                                }, undefined, session);

      await this._sendResponse(request, response, 201, {document});
    }
    catch (error)
    {
      this._sendResponseWhenError(response, error);
    }
  }

  /**
   * Updates the requested document by ID and version.
   *
   * @param {Object} request
   * @param {Object} response
   * @param {Function} [next]
   * @param {Object} [hooks]
   * @param {Object} [allowedProperties]
   * @return {Promise<void>}
   */
  async updateOneByIdAndVersion (request, response, next = undefined, hooks = undefined, allowedProperties = undefined)
  {
    try
    {
      hooks = utility.init(hooks, {});
      hooks.bearer = utility.init(hooks.bearer, {});
      allowedProperties = utility.init(allowedProperties, this._allowedProperties[CrudController.METHOD_IDENTIFIER.UPDATE_ONE_BY_ID_AND_VERSION]);

      const pathParameters = this._extractPathParameters(request, allowedProperties.pathParameters);
      const _id = this._extractPathParameter(pathParameters, "_id");
      const queryString = this._extractQueryString(request, allowedProperties.queryString);
      const version = this._extractQueryStringParameter(queryString, "version");
      let body = this._extractBody(request, allowedProperties.body);

      let document;
      const {session} = SessionManager.generateSessionsForController(hooks);
      await SessionManager.exec(async () =>
                                {
                                  utility.isExist(hooks.body) ? await hooks.body(body) : undefined;

                                  utility.isExist(hooks.before) ? await hooks.before(_id, version, body) : undefined;
                                  document = await this._controllerService.updateOneByIdAndVersion(_id, version, body, session, {bearer: hooks.bearer});
                                  utility.isExist(hooks.after) ? await hooks.after(document) : undefined;
                                }, undefined, session);

      await this._sendResponse(request, response, 200, {document});
    }
    catch (error)
    {
      this._sendResponseWhenError(response, error);
    }
  }

  /**
   * Replaces the requested document by ID and version.
   *
   * @param {Object} request
   * @param {Object} response
   * @param {Function} [next]
   * @param {Object} [hooks]
   * @param {Object} [allowedProperties]
   * @return {Promise<void>}
   */
  async replaceOneByIdAndVersion (request, response, next = undefined, hooks = undefined, allowedProperties = undefined)
  {
    try
    {
      hooks = utility.init(hooks, {});
      hooks.bearer = utility.init(hooks.bearer, {});
      allowedProperties = utility.init(allowedProperties, this._allowedProperties[CrudController.METHOD_IDENTIFIER.REPLACE_ONE_BY_ID_AND_VERSION]);

      const pathParameters = this._extractPathParameters(request, allowedProperties.pathParameters);
      const _id = this._extractPathParameter(pathParameters, "_id");
      const queryString = this._extractQueryString(request, allowedProperties.queryString);
      const version = this._extractQueryStringParameter(queryString, "version");
      let body = this._extractBody(request, allowedProperties.body);

      let document;
      const {session} = SessionManager.generateSessionsForController(hooks);
      await SessionManager.exec(async () =>
                                {
                                  utility.isExist(hooks.body) ? await hooks.body(body) : undefined;

                                  utility.isExist(hooks.before) ? await hooks.before(_id, version, body) : undefined;
                                  document = await this._controllerService.replaceOneByIdAndVersion(_id, version, body, session, {bearer: hooks.bearer});
                                  utility.isExist(hooks.after) ? await hooks.after(document) : undefined;
                                }, undefined, session);

      await this._sendResponse(request, response, 200, {document});
    }
    catch (error)
    {
      this._sendResponseWhenError(response, error);
    }
  }

  /**
   * Soft deletes the requested document by ID and version.
   *
   * @param {Object} request
   * @param {Object} response
   * @param {Function} [next]
   * @param {Object} [hooks]
   * @param {Object} [allowedProperties]
   * @return {Promise<void>}
   */
  async softDeleteOneByIdAndVersion (request, response, next = undefined, hooks = undefined, allowedProperties = undefined)
  {
    try
    {
      hooks = utility.init(hooks, {});
      hooks.bearer = utility.init(hooks.bearer, {});
      allowedProperties = utility.init(allowedProperties, this._allowedProperties[CrudController.METHOD_IDENTIFIER.SOFT_DELETE_ONE_BY_ID_AND_VERSION]);

      const pathParameters = this._extractPathParameters(request, allowedProperties.pathParameters);
      const _id = this._extractPathParameter(pathParameters, "_id");
      const queryString = this._extractQueryString(request, allowedProperties.queryString);
      const version = this._extractQueryStringParameter(queryString, "version");

      let document;
      const {session} = SessionManager.generateSessionsForController(hooks);
      await SessionManager.exec(async () =>
                                {
                                  utility.isExist(hooks.before) ? await hooks.before(_id, version) : undefined;
                                  document = await this._controllerService.softDeleteOneByIdAndVersion(_id, version, session, {bearer: hooks.bearer});
                                  utility.isExist(hooks.after) ? await hooks.after(document) : undefined;
                                }, undefined, session);

      await this._sendResponse(request, response, 200, {document});
    }
    catch (error)
    {
      this._sendResponseWhenError(response, error);
    }
  }

  /**
   * Deletes the requested document by ID and version.
   *
   * @param {Object} request
   * @param {Object} response
   * @param {Function} [next]
   * @param {Object} [hooks]
   * @param {Object} [allowedProperties]
   * @return {Promise<void>}
   */
  async deleteOneByIdAndVersion (request, response, next = undefined, hooks = undefined, allowedProperties = undefined)
  {
    try
    {
      hooks = utility.init(hooks, {});
      hooks.bearer = utility.init(hooks.bearer, {});
      allowedProperties = utility.init(allowedProperties, this._allowedProperties[CrudController.METHOD_IDENTIFIER.DELETE_ONE_BY_ID_AND_VERSION]);

      const pathParameters = this._extractPathParameters(request, allowedProperties.pathParameters);
      const _id = this._extractPathParameter(pathParameters, "_id");
      const queryString = this._extractQueryString(request, allowedProperties.queryString);
      const version = this._extractQueryStringParameter(queryString, "version");

      let document;
      const {session} = SessionManager.generateSessionsForController(hooks);
      await SessionManager.exec(async () =>
                                {
                                  utility.isExist(hooks.before) ? await hooks.before(_id, version) : undefined;
                                  document = await this._controllerService.deleteOneByIdAndVersion(_id, version, session, {bearer: hooks.bearer});
                                  utility.isExist(hooks.after) ? await hooks.after(document) : undefined;
                                }, undefined, session);

      await this._sendResponse(request, response, 200, {document});
    }
    catch (error)
    {
      this._sendResponseWhenError(response, error);
    }
  }

  /* VARIABLES */
  static METHOD_IDENTIFIER = {
    READ: "READ",
    READ_ONE_BY_ID: "READ_ONE_BY_ID",
    CREATE_ONE: "CREATE_ONE",
    UPDATE_ONE_BY_ID_AND_VERSION: "UPDATE_ONE_BY_ID_AND_VERSION",
    REPLACE_ONE_BY_ID_AND_VERSION: "REPLACE_ONE_BY_ID_AND_VERSION",
    SOFT_DELETE_ONE_BY_ID_AND_VERSION: "SOFT_DELETE_ONE_BY_ID_AND_VERSION",
    DELETE_ONE_BY_ID_AND_VERSION: "DELETE_ONE_BY_ID_AND_VERSION"
  };

  static DEFAULT_ALLOWED_PROPERTIES = {
    READ: {
      queryString: ["query"]
    },
    READ_ONE_BY_ID: {
      pathParameters: ["_id"]
    },
    CREATE_ONE: {
      body: []
    },
    UPDATE_ONE_BY_ID_AND_VERSION: {
      pathParameters: ["_id"],
      queryString: ["version"],
      body: []
    },
    REPLACE_ONE_BY_ID_AND_VERSION: {
      pathParameters: ["_id"],
      queryString: ["version"],
      body: []
    },
    SOFT_DELETE_ONE_BY_ID_AND_VERSION: {
      pathParameters: ["_id"],
      queryString: ["version"]
    },
    DELETE_ONE_BY_ID_AND_VERSION: {
      pathParameters: ["_id"],
      queryString: ["version"]
    }
  };

  /* VALIDATE PARAMS */
  /**
   * Validates the parameters of the constructor method.
   *
   * @param {ControllerService} service
   * @param {Object} options
   * @protected
   */
  _validateConstructorParams (service, options)
  {
    const allowedProperties = utility.isExist(options) ? options.allowedProperties : null;
    const isAllowedPropertiesComplete = utility.isExist(options) ? options.isAllowedPropertiesComplete : null;

    if (!(service instanceof ControllerService) ||
        !_.isPlainObject(allowedProperties) ||
        !_.isBoolean(isAllowedPropertiesComplete))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    for (const methodIdentifier in allowedProperties)
    {
      if (!utility.isExist(CrudController.METHOD_IDENTIFIER[methodIdentifier]))
      {
        throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
      }

      const allowedMethodProperties = allowedProperties[methodIdentifier];

      // key is pathParameters, queryString, or body.
      for (const key in allowedMethodProperties)
      {
        const value = allowedMethodProperties[key];
        this._validateParameterAllowedProperties(value);
      }
    }
  }

  /* GET/SET */
  /**
   * @return {ControllerService}
   */
  get controllerService ()
  {
    return this._controllerService;
  }
}

module.exports = CrudController;
