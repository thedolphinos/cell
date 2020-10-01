"use strict";

const {InvalidArgumentsError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");

const SessionManager = require("../db/SessionManager");
const ControllerService = require("../services/ControllerService");
const Controller = require("../core/Controller");

/**
 * Contains generic methods for CRUD
 * Should be used as a super class.
 */
class CrudController extends Controller
{
  /**
   * Creates a CRUD controller instance that supports CRUD operations for the specified service.
   *
   * @param {ControllerService} controllerService
   * @param {Object} controllerService
   * @param {Object} allowedProperties
   * @param {boolean} isAllowedPropertiesComplete
   */
  constructor (controllerService, allowedProperties = CrudController.DEFAULT_ALLOWED_PROPERTIES, isAllowedPropertiesComplete = true)
  {
    super();

    this._validateConstructorParams(controllerService, allowedProperties, isAllowedPropertiesComplete);

    this._controllerService = controllerService;
    this._allowedProperties = isAllowedPropertiesComplete ? allowedProperties : _.merge(CrudController.DEFAULT_ALLOWED_PROPERTIES, allowedProperties);
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
  async read (request, response, next = null, hooks = {}, allowedProperties = this._allowedProperties[CrudController.METHOD_IDENTIFIER.READ])
  {
    try
    {
      this._validateControllerParams(request, response, next);

      let queryString = this._extractQueryString(request, allowedProperties.queryString);

      let documents;
      const {session} = SessionManager.generateSessionsForController(hooks);
      await SessionManager.exec(async () =>
                                {
                                  utility.isExist(hooks.queryString) ? await hooks.queryString(queryString, session) : null;

                                  utility.isExist(hooks.before) ? await hooks.before(queryString, session) : null;
                                  documents = await this._controllerService.read(queryString, session);
                                  utility.isExist(hooks.after) ? await hooks.after(documents, session) : null;
                                });

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
  async readOneById (request, response, next = null, hooks = {}, allowedProperties = this._allowedProperties[CrudController.METHOD_IDENTIFIER.READ_ONE_BY_ID])
  {
    try
    {
      this._validateControllerParams(request, response, next);

      const _id = this._extractPathParameter(request, "_id", allowedProperties.pathParameters);

      let document;
      const {session} = SessionManager.generateSessionsForController(hooks);
      await SessionManager.exec(async () =>
                                {
                                  utility.isExist(hooks.before) ? await hooks.before(_id, session) : null;
                                  document = await this._controllerService.readOneById(_id, session);
                                  utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                                });

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
  async createOne (request, response, next = null, hooks = {}, allowedProperties = this._allowedProperties[CrudController.METHOD_IDENTIFIER.CREATE_ONE])
  {
    try
    {
      this._validateControllerParams(request, response, next);

      let body = this._extractBody(request, allowedProperties.body);

      let document;
      const {session} = SessionManager.generateSessionsForController(hooks);
      await SessionManager.exec(async () =>
                                {
                                  utility.isExist(hooks.body) ? await hooks.body(body, session) : null;

                                  utility.isExist(hooks.before) ? await hooks.before(body, session) : null;
                                  document = await this._controllerService.createOne(body, session);
                                  utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                                });

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
  async updateOneByIdAndVersion (request, response, next = null, hooks = {}, allowedProperties = this._allowedProperties[CrudController.METHOD_IDENTIFIER.UPDATE_ONE_BY_ID_AND_VERSION])
  {
    try
    {
      this._validateControllerParams(request, response, next);

      const _id = this._extractPathParameter(request, "_id", allowedProperties.pathParameters);
      const version = this._extractQueryStringParameter(request, "version", allowedProperties.queryString);
      let body = this._extractBody(request, allowedProperties.body);

      let document;
      const {session} = SessionManager.generateSessionsForController(hooks);
      await SessionManager.exec(async () =>
                                {
                                  utility.isExist(hooks.body) ? await hooks.body(body, session) : null;

                                  utility.isExist(hooks.before) ? await hooks.before(_id, version, body, session) : null;
                                  document = await this._controllerService.updateOneByIdAndVersion(_id, version, body, session);
                                  utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                                });

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
  async replaceOneByIdAndVersion (request, response, next = null, hooks = {}, allowedProperties = this._allowedProperties[CrudController.METHOD_IDENTIFIER.REPLACE_ONE_BY_ID_AND_VERSION])
  {
    try
    {
      this._validateControllerParams(request, response, next);

      const _id = this._extractPathParameter(request, "_id", allowedProperties.pathParameters);
      const version = this._extractQueryStringParameter(request, "version", allowedProperties.queryString);
      let body = this._extractBody(request, allowedProperties.body);

      let document;
      const {session} = SessionManager.generateSessionsForController(hooks);
      await SessionManager.exec(async () =>
                                {
                                  utility.isExist(hooks.body) ? await hooks.body(body, session) : null;

                                  utility.isExist(hooks.before) ? await hooks.before(_id, version, body, session) : null;
                                  document = await this._controllerService.replaceOneByIdAndVersion(_id, version, body, session);
                                  utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                                });

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
  async softDeleteOneByIdAndVersion (request, response, next = null, hooks = {}, allowedProperties = this._allowedProperties[CrudController.METHOD_IDENTIFIER.SOFT_DELETE_ONE_BY_ID_AND_VERSION])
  {
    try
    {
      this._validateControllerParams(request, response, next);

      const _id = this._extractPathParameter(request, "_id", allowedProperties.pathParameters);
      const version = this._extractQueryStringParameter(request, "version", allowedProperties.queryString);

      let document;
      const {session} = SessionManager.generateSessionsForController(hooks);
      await SessionManager.exec(async () =>
                                {
                                  utility.isExist(hooks.before) ? await hooks.before(_id, version, session) : null;
                                  document = await this._controllerService.softDeleteOneByIdAndVersion(_id, version, session);
                                  utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                                });

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
  async deleteOneByIdAndVersion (request, response, next = null, hooks = {}, allowedProperties = this._allowedProperties[CrudController.METHOD_IDENTIFIER.DELETE_ONE_BY_ID_AND_VERSION])
  {
    try
    {
      this._validateControllerParams(request, response, next);

      const _id = this._extractPathParameter(request, "_id", allowedProperties.pathParameters);
      const version = this._extractQueryStringParameter(request, "version", allowedProperties.queryString);

      let document;
      const {session} = SessionManager.generateSessionsForController(hooks);
      await SessionManager.exec(async () =>
                                {
                                  utility.isExist(hooks.before) ? await hooks.before(_id, version, session) : null;
                                  document = await this._controllerService.deleteOneByIdAndVersion(_id, version, session);
                                  utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                                });

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
      queryString: []
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
   * Validates the parameters for the constructor method.
   *
   * @param {ControllerService} service
   * @param {Object} allowedProperties
   * @param {boolean} isAllowedPropertiesComplete
   * @protected
   */
  _validateConstructorParams (service, allowedProperties, isAllowedPropertiesComplete)
  {
    if (!(service instanceof ControllerService) ||
        !_.isPlainObject(allowedProperties) ||
        !_.isBoolean(isAllowedPropertiesComplete))
    {
      throw new InvalidArgumentsError();
    }

    for (const methodIdentifier in allowedProperties)
    {
      if (!utility.isExist(CrudController.METHOD_IDENTIFIER[methodIdentifier]))
      {
        throw new InvalidArgumentsError();
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
