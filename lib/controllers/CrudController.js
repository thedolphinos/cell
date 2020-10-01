"use strict";

const {InvalidArgumentsError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");

const SessionManager = require("../db/SessionManager");
const ApplicationService = require("../services/ApplicationService");
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
   * @param {Object} options
   * @param {Object} options.allowedProperties
   * @param {boolean} options.isAllowedPropertiesComplete
   * @param {Array<{pathParameter: string, applicationService: ApplicationService}>} [options.parentRoutes] - The order of the parent routes are important. The preceding path comes first in the URL.
   */
  constructor (controllerService, options = {
    allowedProperties: CrudController.DEFAULT_ALLOWED_PROPERTIES,
    isAllowedPropertiesComplete: true
  })
  {
    super();

    this._validateConstructorParams(controllerService, options);

    this._controllerService = controllerService;
    this._allowedProperties = options.isAllowedPropertiesComplete ? options.allowedProperties : _.merge(_.cloneDeep(CrudController.DEFAULT_ALLOWED_PROPERTIES), options.allowedProperties); // cloneDeep is used to remove reference.
    this._parentRoutes = options.parentRoutes;

    // add parent path parameters to allowed properties.
    if (utility.isInitialized(this._parentRoutes))
    {
      for (const parentRoute of this._parentRoutes)
      {
        for (const methodIdentifier of CrudController.METHOD_IDENTIFIER)
        {
          if (!utility.isExist(this._allowedProperties[methodIdentifier]))
          {
            this._allowedProperties[methodIdentifier] = {};
          }

          if (!utility.isExist(this._allowedProperties[methodIdentifier].pathParameters))
          {
            this._allowedProperties[methodIdentifier].pathParameters = [];
          }

          this._allowedProperties[methodIdentifier].pathParameters.push(parentRoute.pathParameter);
        }
      }
    }
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

      const parentRouteValues = utility.isInitialized(this._parentRoutes) ? this._extractparentRouteParameters(request, allowedProperties.pathParameters) : null;
      let queryString = this._extractQueryString(request, allowedProperties.queryString);

      let documents;
      const {session} = SessionManager.generateSessionsForController(hooks);
      await SessionManager.exec(async () =>
                                {
                                  utility.isExist(hooks.queryString) ? await hooks.queryString(queryString, session) : null;

                                  utility.isExist(hooks.before) ? await hooks.before(queryString, session) : null;
                                  const parentRoutes = utility.isInitialized(parentRouteValues) ? this._generateparentRoutesForControllerService(parentRouteValues) : null;
                                  documents = await this._controllerService.read(queryString, session, parentRoutes);
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
      const parentRouteValues = utility.isInitialized(this._parentRoutes) ? this._extractparentRouteParameters(request, allowedProperties.pathParameters) : null;

      let document;
      const {session} = SessionManager.generateSessionsForController(hooks);
      await SessionManager.exec(async () =>
                                {
                                  utility.isExist(hooks.before) ? await hooks.before(_id, session) : null;
                                  const parentRoutes = utility.isInitialized(parentRouteValues) ? this._generateparentRoutesForControllerService(parentRouteValues) : null;
                                  document = await this._controllerService.readOneById(_id, session, parentRoutes);
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

      const parentRouteValues = utility.isInitialized(this._parentRoutes) ? this._extractparentRouteParameters(request, allowedProperties.pathParameters) : null;
      let body = this._extractBody(request, allowedProperties.body);

      let document;
      const {session} = SessionManager.generateSessionsForController(hooks);
      await SessionManager.exec(async () =>
                                {
                                  utility.isExist(hooks.body) ? await hooks.body(body, session) : null;

                                  utility.isExist(hooks.before) ? await hooks.before(body, session) : null;
                                  const parentRoutes = utility.isInitialized(parentRouteValues) ? this._generateparentRoutesForControllerService(parentRouteValues) : null;
                                  document = await this._controllerService.createOne(body, session, parentRoutes);
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
      const parentRouteValues = utility.isInitialized(this._parentRoutes) ? this._extractparentRouteParameters(request, allowedProperties.pathParameters) : null;
      const version = this._extractQueryStringParameter(request, "version", allowedProperties.queryString);
      let body = this._extractBody(request, allowedProperties.body);

      let document;
      const {session} = SessionManager.generateSessionsForController(hooks);
      await SessionManager.exec(async () =>
                                {
                                  utility.isExist(hooks.body) ? await hooks.body(body, session) : null;

                                  utility.isExist(hooks.before) ? await hooks.before(_id, version, body, session) : null;
                                  const parentRoutes = utility.isInitialized(parentRouteValues) ? this._generateparentRoutesForControllerService(parentRouteValues) : null;
                                  document = await this._controllerService.updateOneByIdAndVersion(_id, version, body, session, parentRoutes);
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
      const parentRouteValues = utility.isInitialized(this._parentRoutes) ? this._extractparentRouteParameters(request, allowedProperties.pathParameters) : null;
      const version = this._extractQueryStringParameter(request, "version", allowedProperties.queryString);
      let body = this._extractBody(request, allowedProperties.body);

      let document;
      const {session} = SessionManager.generateSessionsForController(hooks);
      await SessionManager.exec(async () =>
                                {
                                  utility.isExist(hooks.body) ? await hooks.body(body, session) : null;

                                  utility.isExist(hooks.before) ? await hooks.before(_id, version, body, session) : null;
                                  const parentRoutes = utility.isInitialized(parentRouteValues) ? this._generateparentRoutesForControllerService(parentRouteValues) : null;
                                  document = await this._controllerService.replaceOneByIdAndVersion(_id, version, body, session, parentRoutes);
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
      const parentRouteValues = utility.isInitialized(this._parentRoutes) ? this._extractparentRouteParameters(request, allowedProperties.pathParameters) : null;
      const version = this._extractQueryStringParameter(request, "version", allowedProperties.queryString);

      let document;
      const {session} = SessionManager.generateSessionsForController(hooks);
      await SessionManager.exec(async () =>
                                {
                                  utility.isExist(hooks.before) ? await hooks.before(_id, version, session) : null;
                                  const parentRoutes = utility.isInitialized(parentRouteValues) ? this._generateparentRoutesForControllerService(parentRouteValues) : null;
                                  document = await this._controllerService.softDeleteOneByIdAndVersion(_id, version, session, parentRoutes);
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
      const parentRouteValues = utility.isInitialized(this._parentRoutes) ? this._extractparentRouteParameters(request, allowedProperties.pathParameters) : null;
      const version = this._extractQueryStringParameter(request, "version", allowedProperties.queryString);

      let document;
      const {session} = SessionManager.generateSessionsForController(hooks);
      await SessionManager.exec(async () =>
                                {
                                  utility.isExist(hooks.before) ? await hooks.before(_id, version, session) : null;
                                  const parentRoutes = utility.isInitialized(parentRouteValues) ? this._generateparentRoutesForControllerService(parentRouteValues) : null;
                                  document = await this._controllerService.deleteOneByIdAndVersion(_id, version, session, parentRoutes);
                                  utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                                });

      await this._sendResponse(request, response, 200, {document});
    }
    catch (error)
    {
      this._sendResponseWhenError(response, error);
    }
  }

  _generateparentRoutesForControllerService (parentRouteValues)
  {
    const parentRoutes = _.cloneDeep(this._parentRoutes);

    for (const parentRoute of parentRoutes)
    {
      parentRoute.value = parentRouteValues[parentRoute.pathParameter];
    }

    return parentRoutes;
  }

  _extractparentRouteParameters (request, allowedProperties)
  {
    this._validateParameterRequest(request);

    if (!_.isArray(allowedProperties))
    {
      throw new InvalidArgumentsError();
    }

    const parentRouteValues = {};
    const pathParameters = this._extractPathParameters(request, allowedProperties);

    for (const parentRoute of this._parentRoutes)
    {
      const pathParameter = parentRoute.pathParameter;
      parentRouteValues[pathParameter] = pathParameters[pathParameter];
    }

    return parentRouteValues;
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
   * @param {Object} options
   * @protected
   */
  _validateConstructorParams (service, options)
  {
    const allowedProperties = options?.allowedProperties;
    const isAllowedPropertiesComplete = options?.isAllowedPropertiesComplete;
    const parentRoutes = options?.parentRoutes;

    if (!(service instanceof ControllerService) ||
        !_.isPlainObject(allowedProperties) ||
        !_.isBoolean(isAllowedPropertiesComplete) ||
        (utility.isExist(parentRoutes) && !_.isArray(allowedProperties)))
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
