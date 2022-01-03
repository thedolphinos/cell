const {
  InvalidArgumentsError,
  BadRequestError
} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");

const _ = require("lodash");

const ErrorSafe = require("../safes/ErrorSafe");
const SessionManager = require("../db/SessionManager");
const ControllerService = require("../services/ControllerService");
const Controller = require("../core/Controller");
const Validator = require("../helpers/Validator");

/**
 * A controller which contains CRUD operations.
 * It can be used as a base class for the controllers of your application.
 */
class CrudController extends Controller
{
  /**
   * Represents API type which must be one of `API_TYPE`.
   *
   * @type {string}
   * @private
   */
  _apiType;

  /**
   * @returns {string}
   */
  get apiType ()
  {
    return this._apiType;
  }

  /**
   * Represents controller service to be used for CRUD methods.
   *
   * @type {ControllerService}
   * @private
   */
  _controllerService;

  /**
   * @returns {ControllerService}
   */
  get controllerService ()
  {
    return this._controllerService;
  }

  /**
   * @param {string} apiType - Represents API type which must be one of `API_TYPE`.
   * @param {ControllerService} controllerService - Represents controller service to be used for CRUD methods.
   */
  constructor (apiType, controllerService)
  {
    super();

    if (!utility.isValidEnumValue(apiType, CrudController.API_TYPE) ||
        !(controllerService instanceof ControllerService))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    this._apiType = apiType;
    this._controllerService = controllerService;
  }

  /**
   * Fetches the requested documents according to a single search value.
   *
   * @param {Object} request - Represents request.
   * @param {Object} response - Represents response.
   * @param {Function} [next] - Represents the next middleware function in the application’s request-response cycle.
   * @param {Object} [hooks] - Represents hooks.
   * @typedef {{[required]: Array<string>, [optional]: Array<string>} | string} AllowedProperties
   * @typedef {{[]: string | PropertyDefinition} | Array<{[]: string | PropertyDefinition}>} PropertyDefinition
   * @param {{[headers]: AllowedProperties, [pathParameters]: AllowedProperties, [queryString]: AllowedProperties, [body]: PropertyDefinition}} [allowedPropertiesForRequestElements] - Represents allowed properties for request elements.
   * @param {Array<string>} searchFields - Specifies the fields where the search will be performed on.
   * @return {Promise<void>}
   */
  async search (request, response, next = undefined, hooks = undefined, allowedPropertiesForRequestElements = undefined, searchFields)
  {
    try
    {
      if (!Validator.isValidRouteFacingControllerMethodParameters(request, response, next, hooks, allowedPropertiesForRequestElements))
      {
        throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
      }

      if (!_.isArray(searchFields))
      {
        throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
      }

      for (const field of searchFields)
      {
        if (!_.isString(field))
        {
          throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
        }
      }

      hooks = utility.init(hooks, {});
      hooks.bearer = utility.init(hooks.bearer, {});

      let searchValue;

      switch (this._apiType)
      {
        case Controller.API_TYPE.REST:
        {
          CrudController._extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
          CrudController._extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
          const queryString = CrudController._extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString);
          searchValue = queryString.search;
          CrudController._extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body, false);
          break;
        }
        case Controller.API_TYPE.NON_REST:
        {
          CrudController._extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
          CrudController._extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
          CrudController._extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString, false);
          const body = CrudController._extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body);
          searchValue = body.search;
          break;
        }
      }

      if (!_.isString(searchValue) ||
          !utility.isInitialized(searchValue))
      {
        throw new BadRequestError(ErrorSafe.get().INVALID_SEARCH_VALUE);
      }

      let documents;
      const {session} = SessionManager.generateSessionsForController(hooks);
      await SessionManager.exec(async () =>
                                {
                                  utility.isExist(hooks.query) ? await hooks.searchValue(searchValue) : undefined;

                                  utility.isExist(hooks.before) ? await hooks.before(searchValue) : undefined;
                                  documents = await this._controllerService.search(searchValue, searchFields, session, {bearer: hooks.bearer});
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
   * Fetches the requested documents.
   *
   * @param {Object} request - Represents request.
   * @param {Object} response - Represents response.
   * @param {Function} [next] - Represents the next middleware function in the application’s request-response cycle.
   * @param {Object} [hooks] - Represents hooks.
   * @typedef {{[required]: Array<string>, [optional]: Array<string>} | string} AllowedProperties
   * @typedef {{[]: string | PropertyDefinition} | Array<{[]: string | PropertyDefinition}>} PropertyDefinition
   * @param {{[headers]: AllowedProperties, [pathParameters]: AllowedProperties, [queryString]: AllowedProperties, [body]: PropertyDefinition}} [allowedPropertiesForRequestElements] - Represents allowed properties for request elements.
   * @return {Promise<void>}
   */
  async read (request, response, next = undefined, hooks = undefined, allowedPropertiesForRequestElements = undefined)
  {
    try
    {
      if (!Validator.isValidRouteFacingControllerMethodParameters(request, response, next, hooks, allowedPropertiesForRequestElements))
      {
        throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
      }

      hooks = utility.init(hooks, {});
      hooks.bearer = utility.init(hooks.bearer, {});

      let query;

      switch (this._apiType)
      {
        case Controller.API_TYPE.REST:
        {
          CrudController._extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
          CrudController._extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
          const queryString = CrudController._extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString);
          query = queryString.query;
          CrudController._extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body, false);
          break;
        }
        case Controller.API_TYPE.NON_REST:
        {
          CrudController._extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
          CrudController._extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
          CrudController._extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString, false);
          const body = CrudController._extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body);
          query = body.query;
          break;
        }
      }

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
   * @param {Object} request - Represents request.
   * @param {Object} response - Represents response.
   * @param {Function} [next] - Represents the next middleware function in the application’s request-response cycle.
   * @param {Object} [hooks] - Represents hooks.
   * @typedef {{[required]: Array<string>, [optional]: Array<string>} | string} AllowedProperties
   * @typedef {{[]: string | PropertyDefinition} | Array<{[]: string | PropertyDefinition}>} PropertyDefinition
   * @param {{[headers]: AllowedProperties, [pathParameters]: AllowedProperties, [queryString]: AllowedProperties, [body]: PropertyDefinition}} [allowedPropertiesForRequestElements] - Represents allowed properties for request elements.
   * @return {Promise<void>}
   */
  async readOneById (request, response, next = undefined, hooks = undefined, allowedPropertiesForRequestElements = undefined)
  {
    try
    {
      if (!Validator.isValidRouteFacingControllerMethodParameters(request, response, next, hooks, allowedPropertiesForRequestElements))
      {
        throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
      }

      hooks = utility.init(hooks, {});
      hooks.bearer = utility.init(hooks.bearer, {});

      let _id;

      switch (this._apiType)
      {
        case Controller.API_TYPE.REST:
        {
          CrudController._extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
          const pathParameters = CrudController._extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters);
          _id = pathParameters._id;
          CrudController._extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString, false);
          CrudController._extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body, false);
          break;
        }
        case Controller.API_TYPE.NON_REST:
        {
          CrudController._extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
          CrudController._extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
          CrudController._extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString, false);
          const body = CrudController._extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body);
          _id = body._id;
          break;
        }
      }

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
   * @param {Object} request - Represents request.
   * @param {Object} response - Represents response.
   * @param {Function} [next] - Represents the next middleware function in the application’s request-response cycle.
   * @param {Object} [hooks] - Represents hooks.
   * @typedef {{[required]: Array<string>, [optional]: Array<string>} | string} AllowedProperties
   * @typedef {{[]: string | PropertyDefinition} | Array<{[]: string | PropertyDefinition}>} PropertyDefinition
   * @param {{[headers]: AllowedProperties, [pathParameters]: AllowedProperties, [queryString]: AllowedProperties, [body]: PropertyDefinition}} [allowedPropertiesForRequestElements] - Represents allowed properties for request elements.
   * @return {Promise<void>}
   */
  async createOne (request, response, next = undefined, hooks = undefined, allowedPropertiesForRequestElements = undefined)
  {
    try
    {
      if (!Validator.isValidRouteFacingControllerMethodParameters(request, response, next, hooks, allowedPropertiesForRequestElements))
      {
        throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
      }

      hooks = utility.init(hooks, {});
      hooks.bearer = utility.init(hooks.bearer, {});

      let fields;

      switch (this._apiType)
      {
        case Controller.API_TYPE.REST:
        {
          CrudController._extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
          CrudController._extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
          CrudController._extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString, false);
          fields = CrudController._extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body);
          break;
        }
        case Controller.API_TYPE.NON_REST:
        {
          CrudController._extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
          CrudController._extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
          CrudController._extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString, false);
          const body = CrudController._extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body);
          fields = body.fields;
          break;
        }
      }

      let document;
      const {session} = SessionManager.generateSessionsForController(hooks);
      await SessionManager.exec(async () =>
                                {
                                  utility.isExist(hooks.fields) ? await hooks.fields(fields) : undefined;

                                  utility.isExist(hooks.before) ? await hooks.before(fields) : undefined;
                                  document = await this._controllerService.createOne(fields, session, {bearer: hooks.bearer});
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
   * @param {Object} request - Represents request.
   * @param {Object} response - Represents response.
   * @param {Function} [next] - Represents the next middleware function in the application’s request-response cycle.
   * @param {Object} [hooks] - Represents hooks.
   * @typedef {{[required]: Array<string>, [optional]: Array<string>} | string} AllowedProperties
   * @typedef {{[]: string | PropertyDefinition} | Array<{[]: string | PropertyDefinition}>} PropertyDefinition
   * @param {{[headers]: AllowedProperties, [pathParameters]: AllowedProperties, [queryString]: AllowedProperties, [body]: PropertyDefinition}} [allowedPropertiesForRequestElements] - Represents allowed properties for request elements.
   * @return {Promise<void>}
   */
  async updateOneByIdAndVersion (request, response, next = undefined, hooks = undefined, allowedPropertiesForRequestElements = undefined)
  {
    try
    {
      if (!Validator.isValidRouteFacingControllerMethodParameters(request, response, next, hooks, allowedPropertiesForRequestElements))
      {
        throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
      }

      hooks = utility.init(hooks, {});
      hooks.bearer = utility.init(hooks.bearer, {});

      let _id, version, fields;

      switch (this._apiType)
      {
        case Controller.API_TYPE.REST:
        {
          CrudController._extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
          const pathParameters = CrudController._extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters);
          _id = pathParameters._id;
          const queryString = CrudController._extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString);
          version = queryString.version;
          fields = CrudController._extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body, false);
          break;
        }
        case Controller.API_TYPE.NON_REST:
        {
          CrudController._extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
          CrudController._extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
          CrudController._extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString, false);
          const body = CrudController._extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body);
          _id = body._id;
          version = body.version;
          fields = body.fields;
          break;
        }
      }

      let document;
      const {session} = SessionManager.generateSessionsForController(hooks);
      await SessionManager.exec(async () =>
                                {
                                  utility.isExist(hooks.fields) ? await hooks.fields(fields) : undefined;

                                  utility.isExist(hooks.before) ? await hooks.before(_id, version, fields) : undefined;
                                  document = await this._controllerService.updateOneByIdAndVersion(_id, version, fields, session, {bearer: hooks.bearer});
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
   * @param {Object} request - Represents request.
   * @param {Object} response - Represents response.
   * @param {Function} [next] - Represents the next middleware function in the application’s request-response cycle.
   * @param {Object} [hooks] - Represents hooks.
   * @typedef {{[required]: Array<string>, [optional]: Array<string>} | string} AllowedProperties
   * @typedef {{[]: string | PropertyDefinition} | Array<{[]: string | PropertyDefinition}>} PropertyDefinition
   * @param {{[headers]: AllowedProperties, [pathParameters]: AllowedProperties, [queryString]: AllowedProperties, [body]: PropertyDefinition}} [allowedPropertiesForRequestElements] - Represents allowed properties for request elements.
   * @return {Promise<void>}
   */
  async replaceOneByIdAndVersion (request, response, next = undefined, hooks = undefined, allowedPropertiesForRequestElements = undefined)
  {
    try
    {
      if (!Validator.isValidRouteFacingControllerMethodParameters(request, response, next, hooks, allowedPropertiesForRequestElements))
      {
        throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
      }

      hooks = utility.init(hooks, {});
      hooks.bearer = utility.init(hooks.bearer, {});

      let _id, version, fields;

      switch (this._apiType)
      {
        case Controller.API_TYPE.REST:
        {
          CrudController._extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
          const pathParameters = CrudController._extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters);
          _id = pathParameters._id;
          const queryString = CrudController._extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString);
          version = queryString.version;
          fields = CrudController._extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body);
          break;
        }
        case Controller.API_TYPE.NON_REST:
        {
          CrudController._extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
          CrudController._extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
          CrudController._extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString, false);
          const body = CrudController._extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body);
          _id = body._id;
          version = body.version;
          fields = body.fields;
          break;
        }
      }

      let document;
      const {session} = SessionManager.generateSessionsForController(hooks);
      await SessionManager.exec(async () =>
                                {
                                  utility.isExist(hooks.fields) ? await hooks.fields(fields) : undefined;

                                  utility.isExist(hooks.before) ? await hooks.before(_id, version, fields) : undefined;
                                  document = await this._controllerService.replaceOneByIdAndVersion(_id, version, fields, session, {bearer: hooks.bearer});
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
   * @param {Object} request - Represents request.
   * @param {Object} response - Represents response.
   * @param {Function} [next] - Represents the next middleware function in the application’s request-response cycle.
   * @param {Object} [hooks] - Represents hooks.
   * @typedef {{[required]: Array<string>, [optional]: Array<string>} | string} AllowedProperties
   * @typedef {{[]: string | PropertyDefinition} | Array<{[]: string | PropertyDefinition}>} PropertyDefinition
   * @param {{[headers]: AllowedProperties, [pathParameters]: AllowedProperties, [queryString]: AllowedProperties, [body]: PropertyDefinition}} [allowedPropertiesForRequestElements] - Represents allowed properties for request elements.
   * @return {Promise<void>}
   */
  async softDeleteOneByIdAndVersion (request, response, next = undefined, hooks = undefined, allowedPropertiesForRequestElements = undefined)
  {
    try
    {
      if (!Validator.isValidRouteFacingControllerMethodParameters(request, response, next, hooks, allowedPropertiesForRequestElements))
      {
        throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
      }

      hooks = utility.init(hooks, {});
      hooks.bearer = utility.init(hooks.bearer, {});

      let _id, version;

      switch (this._apiType)
      {
        case Controller.API_TYPE.REST:
        {
          CrudController._extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
          const pathParameters = CrudController._extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters);
          _id = pathParameters._id;
          const queryString = CrudController._extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString);
          version = queryString.version;
          CrudController._extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body, false);
          break;
        }
        case Controller.API_TYPE.NON_REST:
        {
          CrudController._extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
          CrudController._extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
          CrudController._extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString, false);
          const body = CrudController._extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body);
          _id = body._id;
          version = body.version;
          break;
        }
      }

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
   * @param {Object} request - Represents request.
   * @param {Object} response - Represents response.
   * @param {Function} [next] - Represents the next middleware function in the application’s request-response cycle.
   * @param {Object} [hooks] - Represents hooks.
   * @typedef {{[required]: Array<string>, [optional]: Array<string>} | string} AllowedProperties
   * @typedef {{[]: string | PropertyDefinition} | Array<{[]: string | PropertyDefinition}>} PropertyDefinition
   * @param {{[headers]: AllowedProperties, [pathParameters]: AllowedProperties, [queryString]: AllowedProperties, [body]: PropertyDefinition}} [allowedPropertiesForRequestElements] - Represents allowed properties for request elements.
   * @return {Promise<void>}
   */
  async deleteOneByIdAndVersion (request, response, next = undefined, hooks = undefined, allowedPropertiesForRequestElements = undefined)
  {
    try
    {
      if (!Validator.isValidRouteFacingControllerMethodParameters(request, response, next, hooks, allowedPropertiesForRequestElements))
      {
        throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
      }

      hooks = utility.init(hooks, {});
      hooks.bearer = utility.init(hooks.bearer, {});

      let _id, version;

      switch (this._apiType)
      {
        case Controller.API_TYPE.REST:
        {
          CrudController._extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
          const pathParameters = CrudController._extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters);
          _id = pathParameters._id;
          const queryString = CrudController._extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString);
          version = queryString.version;
          CrudController._extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body, false);
          break;
        }
        case Controller.API_TYPE.NON_REST:
        {
          const body = CrudController._extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body);
          _id = body._id;
          version = body.version;
          break;
        }
      }

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
}

module.exports = CrudController;
