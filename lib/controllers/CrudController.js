"use strict";

const {InvalidArgumentsError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");

const SessionManager = require("../db/SessionManager");
const ControllerService = require("../services/ControllerService");
const Controller = require("../core/Controller");

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
   */
  constructor (controllerService)
  {
    super();

    this._validateConstructorParams(controllerService);

    this._controllerService = controllerService;
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

      let queryString = this._extractQueryString(request);

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

      const _id = this._extractPathParameter(request, "_id");

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

      let body = this._extractBody(request);

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

      const _id = this._extractPathParameter(request, "_id");
      const version = this._extractQueryStringParameter(request, "version");
      let body = this._extractBody(request);

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

      const _id = this._extractPathParameter(request, "_id");
      const version = this._extractQueryStringParameter(request, "version");
      let body = this._extractBody(request);

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

      const _id = this._extractPathParameter(request, "_id");
      const version = this._extractQueryStringParameter(request, "version");

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

      const _id = this._extractPathParameter(request, "_id");
      const version = this._extractQueryStringParameter(request, "version");

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
   * @protected
   */
  _validateConstructorParams (service)
  {
    if (!(service instanceof ControllerService))
    {
      throw new InvalidArgumentsError();
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
