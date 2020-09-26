"use strict";

const {InvalidArgumentsError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");

const SessionManager = require("../db/SessionManager");
const ControllerService = require("../services/ControllerService");
const Controller = require("../core/Controller");

const METHOD_IDENTIFIER = Object.freeze({
                                          READ: "READ",
                                          READ_ONE_BY_ID: "READ_ONE_BY_ID",
                                          CREATE_ONE: "CREATE_ONE",
                                          UPDATE_ONE_BY_ID_AND_VERSION: "UPDATE_ONE_BY_ID_AND_VERSION",
                                          REPLACE_ONE_BY_ID_AND_VERSION: "REPLACE_ONE_BY_ID_AND_VERSION",
                                          SOFT_DELETE_ONE_BY_ID_AND_VERSION: "SOFT_DELETE_ONE_BY_ID_AND_VERSION",
                                          DELETE_ONE_BY_ID_AND_VERSION: "DELETE_ONE_BY_ID_AND_VERSION"
                                        });

const DEFAULT_ALLOWED_PROPERTIES = Object.freeze({
                                                   pathParameters: {
                                                     READ: [],
                                                     READ_ONE_BY_ID: ["_id"],
                                                     UPDATE_ONE_BY_ID_AND_VERSION: ["_id"],
                                                     REPLACE_ONE_BY_ID_AND_VERSION: ["_id"],
                                                     SOFT_DELETE_ONE_BY_ID_AND_VERSION: ["_id"],
                                                     DELETE_ONE_BY_ID_AND_VERSION: ["_id"]
                                                   },
                                                   queryString: {
                                                     UPDATE_ONE_BY_ID_AND_VERSION: ["version"],
                                                     REPLACE_ONE_BY_ID_AND_VERSION: ["version"],
                                                     SOFT_DELETE_ONE_BY_ID_AND_VERSION: ["version"],
                                                     DELETE_ONE_BY_ID_AND_VERSION: ["version"]
                                                   },
                                                   body: {
                                                     CREATE_ONE: [],
                                                     UPDATE_ONE_BY_ID_AND_VERSION: [],
                                                     REPLACE_ONE_BY_ID_AND_VERSION: []
                                                   }
                                                 });

/**
 * Contains CRUD methods of a controller.
 * Should be used as a super class.
 */
class CrudController extends Controller
{
  /**
   * Creates a controller instance that supports CRUD operations for the specified service.
   *
   * @param {ControllerService} controllerService
   * @param {Object} controllerService
   * @param {{pathParameters: Object, queryString: Object, body: Object}} allowedProperties
   */
  constructor (controllerService, allowedProperties = DEFAULT_ALLOWED_PROPERTIES)
  {
    super();

    this._validateConstructorParams(controllerService, allowedProperties);

    this._controllerService = controllerService;
    this._allowedProperties = allowedProperties;
  }

  /**
   * Fetches the requested documents.
   *
   * @param {Object} request
   * @param {Object} response
   * @param {Function} [next]
   * @param {Object} [hooks]
   * @return {Promise<void>}
   */
  async read (request, response, next = null, hooks = {})
  {
    try
    {
      this._validateControllerParams(request, response, next);

      let queryString = this._extractQueryString(request, this._allowedProperties.queryString[METHOD_IDENTIFIER.READ]);

      let documents;
      const {session} = SessionManager.generateSessionsForController(hooks);
      await SessionManager.exec(async () =>
                                {
                                  utility.isExist(hooks.queryString) ? queryString = await hooks.queryString(queryString, session) : queryString;

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
   * @return {Promise<void>}
   */
  async readOneById (request, response, next = null, hooks = {})
  {
    try
    {
      this._validateControllerParams(request, response, next);

      const _id = this._extractPathParameter(request, "_id", this._allowedProperties.pathParameters[METHOD_IDENTIFIER.READ_ONE_BY_ID]);

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
   * @return {Promise<void>}
   */
  async createOne (request, response, next = null, hooks = {})
  {
    try
    {
      this._validateControllerParams(request, response, next);

      let body = this._extractBody(request, this._allowedProperties.body[METHOD_IDENTIFIER.CREATE_ONE]);

      let document;
      const {session} = SessionManager.generateSessionsForController(hooks);
      await SessionManager.exec(async () =>
                                {
                                  utility.isExist(hooks.body) ? body = await hooks.body(body, session) : body;

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
   * @return {Promise<void>}
   */
  async updateOneByIdAndVersion (request, response, next = null, hooks = {})
  {
    try
    {
      this._validateControllerParams(request, response, next);

      const _id = this._extractPathParameter(request, "_id", this._allowedProperties.pathParameters[METHOD_IDENTIFIER.UPDATE_ONE_BY_ID_AND_VERSION]);
      const version = this._extractQueryStringParameter(request, "version", this._allowedProperties.queryString[METHOD_IDENTIFIER.UPDATE_ONE_BY_ID_AND_VERSION]);
      let body = this._extractBody(request, this._allowedProperties.body[METHOD_IDENTIFIER.UPDATE_ONE_BY_ID_AND_VERSION]);

      let document;
      const {session} = SessionManager.generateSessionsForController(hooks);
      await SessionManager.exec(async () =>
                                {
                                  utility.isExist(hooks.body) ? body = await hooks.body(body, session) : body;

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
   * @return {Promise<void>}
   */
  async replaceOneByIdAndVersion (request, response, next = null, hooks = {})
  {
    try
    {
      this._validateControllerParams(request, response, next);

      const _id = this._extractPathParameter(request, "_id", this._allowedProperties.pathParameters[METHOD_IDENTIFIER.REPLACE_ONE_BY_ID_AND_VERSION]);
      const version = this._extractQueryStringParameter(request, "version", this._allowedProperties.queryString[METHOD_IDENTIFIER.REPLACE_ONE_BY_ID_AND_VERSION]);
      let body = this._extractBody(request, this._allowedProperties.body[METHOD_IDENTIFIER.REPLACE_ONE_BY_ID_AND_VERSION]);

      let document;
      const {session} = SessionManager.generateSessionsForController(hooks);
      await SessionManager.exec(async () =>
                                {
                                  utility.isExist(hooks.body) ? body = await hooks.body(body, session) : body;

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
   * @return {Promise<void>}
   */
  async softDeleteOneByIdAndVersion (request, response, next = null, hooks = {})
  {
    try
    {
      this._validateControllerParams(request, response, next);

      const _id = this._extractPathParameter(request, "_id", this._allowedProperties.pathParameters[METHOD_IDENTIFIER.SOFT_DELETE_ONE_BY_ID_AND_VERSION]);
      const version = this._extractQueryStringParameter(request, "version", this._allowedProperties.queryString[METHOD_IDENTIFIER.SOFT_DELETE_ONE_BY_ID_AND_VERSION]);

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
   * @return {Promise<void>}
   */
  async deleteOneByIdAndVersion (request, response, next = null, hooks = {})
  {
    try
    {
      this._validateControllerParams(request, response, next);

      const _id = this._extractPathParameter(request, this._allowedProperties.pathParameters[METHOD_IDENTIFIER.DELETE_ONE_BY_ID_AND_VERSION]);
      const version = this._extractQueryStringParameter(request, "version", this._allowedProperties.queryString[METHOD_IDENTIFIER.DELETE_ONE_BY_ID_AND_VERSION]);

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

  /* VALIDATE PARAMS */
  /**
   * Validates the parameters for the constructor method.
   *
   * @param {ControllerService} service
   * @param {Object} allowedProperties
   * @protected
   */
  _validateConstructorParams (service, allowedProperties)
  {
    if (!(service instanceof ControllerService) ||
        !_.isPlainObject(allowedProperties) ||
        Object.keys(allowedProperties).length !== 2)
    {
      throw new InvalidArgumentsError();
    }

    const {queryString, body} = allowedProperties;

    const validateAllowedPropertyKeys = (allowedPropertyKey) =>
    {
      if (!_.isPlainObject(allowedPropertyKey))
      {
        throw new InvalidArgumentsError();
      }

      for (const methodIdentifier in allowedPropertyKey)
      {
        if (!utility.isExist(METHOD_IDENTIFIER[methodIdentifier]))
        {
          throw new InvalidArgumentsError();
        }

        this._validateParameterAllowedProperties(allowedPropertyKey[methodIdentifier]);
      }
    };

    validateAllowedPropertyKeys(body);
    validateAllowedPropertyKeys(queryString);
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
