"use strict";

const {InvalidArgumentsError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");

const DbConnectionSafe = require("../safes/DbConnectionSafe");
const CrudControllerService = require("../services/CrudControllerService");
const Controller = require("../core/Controller");

/**
 * Contains CRUD methods of a controller.
 * Should be used as a super class.
 *
 * @since 0.11.0
 */
class CrudController extends Controller
{
  /**
   * Creates a controller instance that supports CRUD operations for the specified service.
   *
   * @since 0.11.0
   * @param {CrudControllerService} crudControllerService
   */
  constructor (crudControllerService)
  {
    super();

    this._validateConstructorParameters(crudControllerService);

    this._controllerService = crudControllerService;
  }

  /**
   * Fetches the requested documents.
   *
   * @since 0.15.0
   * @param {Object} request
   * @param {Object} response
   * @param {Function} [next]
   * @param {{session: Function, queryString: Function, before: Function, after: Function}} [hooks]
   * @return {Promise<void>}
   */
  async read (request, response, next = null, hooks = {})
  {
    let session;
    let documents;

    try
    {
      CrudController.validateControllerParameters(request, response, next);

      let queryString = CrudController.extractQueryString(request);

      hooks.session ? session = DbConnectionSafe.get().mongoClient.startSession() : null;

      if (utility.isExist(session))
      {
        await session.withTransaction(async () =>
                                      {
                                        utility.isExist(hooks.queryString) ? queryString = await hooks.queryString(queryString, session) : queryString;

                                        utility.isExist(hooks.before) ? await hooks.before(queryString, session) : null;
                                        documents = await this._controllerService.read(queryString, session);
                                        utility.isExist(hooks.after) ? await hooks.after(documents, session) : null;
                                      }, this._controllerService.applicationService.dbOperation.transactionOptions);
      }
      else
      {
        utility.isExist(hooks.queryString) ? queryString = await hooks.queryString(queryString) : queryString;

        utility.isExist(hooks.before) ? await hooks.before(queryString) : null;
        documents = await this._controllerService.read(queryString);
        utility.isExist(hooks.after) ? await hooks.after(documents) : null;
      }

      CrudController.sendResponse(response, 200, documents);
    }
    catch (error)
    {
      CrudController.sendResponseWhenError(response, error);
    }
    finally
    {
      if (utility.isExist(session))
      {
        await session.endSession();
      }
    }
  }

  /**
   * Fetches the requested document by ID.
   *
   * @since 0.15.0
   * @param {Object} request
   * @param {Object} response
   * @param {Function} [next]
   * @param {{session: Function, before: Function, after: Function}} [hooks]
   * @return {Promise<void>}
   */
  async readOneById (request, response, next = null, hooks = {})
  {
    let session;
    let document;

    try
    {
      CrudController.validateControllerParameters(request, response, next);

      const id = CrudController.extractPathParameter(request, "id");

      hooks.session ? session = DbConnectionSafe.get().mongoClient.startSession() : null;

      if (utility.isExist(session))
      {
        await session.withTransaction(async () =>
                                      {
                                        utility.isExist(hooks.before) ? await hooks.before(id, session) : null;
                                        document = await this._controllerService.readOneById(id, session);
                                        utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                                      }, this._controllerService.applicationService.dbOperation.transactionOptions);
      }
      else
      {
        utility.isExist(hooks.before) ? await hooks.before(id) : null;
        document = await this._controllerService.readOneById(id);
        utility.isExist(hooks.after) ? await hooks.after(document) : null;
      }

      CrudController.sendResponse(response, 200, document);
    }
    catch (error)
    {
      CrudController.sendResponseWhenError(response, error);
    }
    finally
    {
      if (utility.isExist(session))
      {
        await session.endSession();
      }
    }
  }

  /**
   * Creates the requested document.
   *
   * @since 0.11.0
   * @param {Object} request
   * @param {Object} response
   * @param {Function} [next]
   * @param {{session: Function, body: Function, before: Function, after: Function}} [hooks]
   * @return {Promise<void>}
   */
  async createOne (request, response, next = null, hooks = {})
  {
    let session;
    let document;

    try
    {
      CrudController.validateControllerParameters(request, response, next);

      let body = CrudController.extractBody(request);

      hooks.session ? session = DbConnectionSafe.get().mongoClient.startSession() : null;

      if (utility.isExist(session))
      {
        await session.withTransaction(async () =>
                                      {
                                        utility.isExist(hooks.body) ? body = await hooks.body(body, session) : body;

                                        utility.isExist(hooks.before) ? await hooks.before(body, session) : null;
                                        document = await this._controllerService.createOne(body, session);
                                        utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                                      }, this._controllerService.applicationService.dbOperation.transactionOptions);
      }
      else
      {
        utility.isExist(hooks.body) ? body = await hooks.body(body) : body;

        utility.isExist(hooks.before) ? await hooks.before(body) : null;
        document = await this._controllerService.createOne(body);
        utility.isExist(hooks.after) ? await hooks.after(document) : null;
      }

      CrudController.sendResponse(response, 201, document);
    }
    catch (error)
    {
      CrudController.sendResponseWhenError(response, error);
    }
    finally
    {
      if (utility.isExist(session))
      {
        await session.endSession();
      }
    }
  }

  /**
   * Partially updates the requested document by ID and version.
   *
   * @since 0.16.0
   * @param {Object} request
   * @param {Object} response
   * @param {Function} [next]
   * @param {{session: Function, body: Function, before: Function, after: Function}} [hooks]
   * @return {Promise<void>}
   */
  async updateOneByIdAndVersion (request, response, next = null, hooks = {})
  {
    let session;
    let document;

    try
    {
      CrudController.validateControllerParameters(request, response, next);

      const id = CrudController.extractPathParameter(request, "id");
      const version = CrudController.extractQueryStringParameter(request, "version");
      let body = CrudController.extractBody(request);

      hooks.session ? session = DbConnectionSafe.get().mongoClient.startSession() : null;

      if (utility.isExist(session))
      {
        await session.withTransaction(async () =>
                                      {
                                        utility.isExist(hooks.body) ? body = await hooks.body(body, session) : body;

                                        utility.isExist(hooks.before) ? await hooks.before(id, version, body, session) : null;
                                        document = await this._controllerService.updateOneByIdAndVersion(id, version, body, session);
                                        utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                                      }, this._controllerService.applicationService.dbOperation.transactionOptions);
      }
      else
      {
        utility.isExist(hooks.body) ? body = await hooks.body(body) : body;

        utility.isExist(hooks.before) ? await hooks.before(id, version, body) : null;
        document = await this._controllerService.updateOneByIdAndVersion(id, version, body);
        utility.isExist(hooks.after) ? await hooks.after(document) : null;
      }

      CrudController.sendResponse(response, 201, document);
    }
    catch (error)
    {
      CrudController.sendResponseWhenError(response, error);
    }
    finally
    {
      if (utility.isExist(session))
      {
        await session.endSession();
      }
    }
  }

  /**
   * Soft deletes the requested document by ID and version.
   *
   * @since 0.17.0
   * @param {Object} request
   * @param {Object} response
   * @param {Function} [next]
   * @param {{session: Function, before: Function, after: Function}} [hooks]
   * @return {Promise<void>}
   */
  async softDeleteOneByIdAndVersion (request, response, next = null, hooks = {})
  {
    let session;
    let document;

    try
    {
      CrudController.validateControllerParameters(request, response, next);

      const id = CrudController.extractPathParameter(request, "id");
      const version = CrudController.extractQueryStringParameter(request, "version");

      hooks.session ? session = DbConnectionSafe.get().mongoClient.startSession() : null;

      if (utility.isExist(session))
      {
        await session.withTransaction(async () =>
                                      {
                                        utility.isExist(hooks.before) ? await hooks.before(id, version, session) : null;
                                        document = await this._controllerService.softDeleteOneByIdAndVersion(id, version, session);
                                        utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                                      }, this._controllerService.applicationService.dbOperation.transactionOptions);
      }
      else
      {
        utility.isExist(hooks.before) ? await hooks.before(id, version) : null;
        document = await this._controllerService.softDeleteOneByIdAndVersion(id, version);
        utility.isExist(hooks.after) ? await hooks.after(document) : null;
      }

      CrudController.sendResponse(response, 201, document);
    }
    catch (error)
    {
      CrudController.sendResponseWhenError(response, error);
    }
    finally
    {
      if (utility.isExist(session))
      {
        await session.endSession();
      }
    }
  }

  /**
   * Deletes the requested document by ID and version.
   *
   * @since 0.18.0
   * @param {Object} request
   * @param {Object} response
   * @param {Function} [next]
   * @param {{session: Function, before: Function, after: Function}} [hooks]
   * @return {Promise<void>}
   */
  async deleteOneByIdAndVersion (request, response, next = null, hooks = {})
  {
    let session;
    let document;

    try
    {
      CrudController.validateControllerParameters(request, response, next);

      const id = CrudController.extractPathParameter(request, "id");
      const version = CrudController.extractQueryStringParameter(request, "version");

      hooks.session ? session = DbConnectionSafe.get().mongoClient.startSession() : null;

      if (utility.isExist(session))
      {
        await session.withTransaction(async () =>
                                      {
                                        utility.isExist(hooks.before) ? await hooks.before(id, version, session) : null;
                                        document = await this._controllerService.deleteOneByIdAndVersion(id, version, session);
                                        utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                                      }, this._controllerService.applicationService.dbOperation.transactionOptions);
      }
      else
      {
        utility.isExist(hooks.before) ? await hooks.before(id, version) : null;
        document = await this._controllerService.deleteOneByIdAndVersion(id, version);
        utility.isExist(hooks.after) ? await hooks.after(document) : null;
      }

      CrudController.sendResponse(response, 201, document);
    }
    catch (error)
    {
      CrudController.sendResponseWhenError(response, error);
    }
    finally
    {
      if (utility.isExist(session))
      {
        await session.endSession();
      }
    }
  }

  /**
   * Validates the parameters for the constructor method.
   *
   * @since 0.14.0
   * @param {CrudControllerService} service
   * @protected
   */
  _validateConstructorParameters (service)
  {
    if (!(service instanceof CrudControllerService))
    {
      throw new InvalidArgumentsError();
    }
  }

  /* HOOKS */
  /**
   * session
   *   read                          : () -> session
   *   readOneById                   : "
   *   createOne                     : "
   *   updateOneByIdAndVersion: "
   *   softDeleteOneByIdAndVersion   : "
   *   deleteOneByIdAndVersion       : "
   *
   * queryString
   *   read                          : (queryString, [session]) -> queryString
   *
   * body
   *   createOne                     : (body, [session]) -> body
   *   updateOneByIdAndVersion: "
   *
   * before
   *   read                          : (queryString, [session]) -> void
   *   readOneById                   : (id, [session]) -> void
   *   createOne                     : (body, [session]) -> void
   *   updateOneByIdAndVersion: (id, version, body, [session]) -> void
   *   softDeleteOneByIdAndVersion   : (id, version, [session]) -> void
   *   deleteOneByIdAndVersion       : (id, version, [session]) -> void
   *
   * after
   *   read                          : (documents, [session]) -> void
   *   readOneById                   : (document, [session]) -> void
   *   createOne                     : "
   *   updateOneByIdAndVersion: "
   *   softDeleteOneByIdAndVersion   : "
   *   deleteOneByIdAndVersion       : "
   */
}

module.exports = CrudController;
