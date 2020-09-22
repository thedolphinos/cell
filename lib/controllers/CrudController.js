"use strict";

const {InvalidArgumentsError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");

const DbConnectionSafe = require("../safes/DbConnectionSafe");
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

    this._validateConstructorParams(...arguments);

    this._controllerService = controllerService;
  }

  /**
   * @return {ControllerService}
   */
  get controllerService ()
  {
    return this._controllerService;
  }

  /**
   * @return {ApplicationService}
   */
  get applicationService ()
  {
    return this._controllerService.applicationService;
  }

  /**
   * @return {DbOperation}
   */
  get dbOperation ()
  {
    return this.applicationService.dbOperation;
  }

  /**
   * @return {Schema}
   */
  get schema ()
  {
    return this.dbOperation.schema;
  }

  /**
   * Fetches the requested documents.
   *
   * @param {Object} request
   * @param {Object} response
   * @param {Function} [next]
   * @param {{isSessionEnabled: boolean, queryString: Function, before: Function, after: Function}} [hooks]
   * @return {Promise<void>}
   */
  async read (request, response, next = null, hooks = {})
  {
    let session;
    let documents;

    try
    {
      this._validateControllerParameters(request, response, next);

      let queryString = this._extractQueryString(request);

      hooks.session ? session = DbConnectionSafe.get().mongoClient.startSession() : undefined;

      if (utility.isExist(session))
      {
        await session.withTransaction(async () =>
                                      {
                                        utility.isExist(hooks.queryString) ? queryString = await hooks.queryString(queryString, session) : queryString;

                                        utility.isExist(hooks.before) ? await hooks.before(queryString, session) : null;
                                        documents = await this._controllerService.read(queryString, session);
                                        utility.isExist(hooks.after) ? await hooks.after(documents, session) : null;
                                      }, this.dbOperation.transactionOptions);
      }
      else
      {
        utility.isExist(hooks.queryString) ? queryString = await hooks.queryString(queryString) : queryString;

        utility.isExist(hooks.before) ? await hooks.before(queryString) : null;
        documents = await this._controllerService.read(queryString);
        utility.isExist(hooks.after) ? await hooks.after(documents) : null;
      }

      await this._sendResponse(response, 200, {documents});
    }
    catch (error)
    {
      this._sendResponseWhenError(response, error);
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
   * @param {Object} request
   * @param {Object} response
   * @param {Function} [next]
   * @param {{isSessionEnabled: boolean, before: Function, after: Function}} [hooks]
   * @return {Promise<void>}
   */
  async readOneById (request, response, next = null, hooks = {})
  {
    let session;
    let document;

    try
    {
      this._validateControllerParameters(request, response, next);

      const _id = this._extractPathParameter(request, "_id");

      hooks.session ? session = DbConnectionSafe.get().mongoClient.startSession() : undefined;

      if (utility.isExist(session))
      {
        await session.withTransaction(async () =>
                                      {
                                        utility.isExist(hooks.before) ? await hooks.before(_id, session) : null;
                                        document = await this._controllerService.readOneById(_id, session);
                                        utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                                      }, this.dbOperation.transactionOptions);
      }
      else
      {
        utility.isExist(hooks.before) ? await hooks.before(_id) : null;
        document = await this._controllerService.readOneById(_id);
        utility.isExist(hooks.after) ? await hooks.after(document) : null;
      }

      await this._sendResponse(response, 200, {document});
    }
    catch (error)
    {
      this._sendResponseWhenError(response, error);
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
   * @param {Object} request
   * @param {Object} response
   * @param {Function} [next]
   * @param {{isSessionEnabled: boolean, body: Function, before: Function, after: Function}} [hooks]
   * @return {Promise<void>}
   */
  async createOne (request, response, next = null, hooks = {})
  {
    let session;
    let document;

    try
    {
      this._validateControllerParameters(request, response, next);

      let body = this._extractBody(request);

      hooks.session ? session = DbConnectionSafe.get().mongoClient.startSession() : undefined;

      if (utility.isExist(session))
      {
        await session.withTransaction(async () =>
                                      {
                                        utility.isExist(hooks.body) ? body = await hooks.body(body, session) : body;

                                        utility.isExist(hooks.before) ? await hooks.before(body, session) : null;
                                        document = await this._controllerService.createOne(body, session);
                                        utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                                      }, this.dbOperation.transactionOptions);
      }
      else
      {
        utility.isExist(hooks.body) ? body = await hooks.body(body) : body;

        utility.isExist(hooks.before) ? await hooks.before(body) : null;
        document = await this._controllerService.createOne(body);
        utility.isExist(hooks.after) ? await hooks.after(document) : null;
      }

      await this._sendResponse(response, 201, {document});
    }
    catch (error)
    {
      this._sendResponseWhenError(response, error);
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
   * Updates the requested document by ID and version.
   *
   * @param {Object} request
   * @param {Object} response
   * @param {Function} [next]
   * @param {{isSessionEnabled: boolean, body: Function, before: Function, after: Function}} [hooks]
   * @return {Promise<void>}
   */
  async updateOneByIdAndVersion (request, response, next = null, hooks = {})
  {
    let session;
    let document;

    try
    {
      this._validateControllerParameters(request, response, next);

      const _id = this._extractPathParameter(request, "_id");
      const version = this._extractQueryStringParameter(request, "version");
      let body = this._extractBody(request);

      hooks.session ? session = DbConnectionSafe.get().mongoClient.startSession() : undefined;

      if (utility.isExist(session))
      {
        await session.withTransaction(async () =>
                                      {
                                        utility.isExist(hooks.body) ? body = await hooks.body(body, session) : body;

                                        utility.isExist(hooks.before) ? await hooks.before(_id, version, body, session) : null;
                                        document = await this._controllerService.updateOneByIdAndVersion(_id, version, body, session);
                                        utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                                      }, this.dbOperation.transactionOptions);
      }
      else
      {
        utility.isExist(hooks.body) ? body = await hooks.body(body) : body;

        utility.isExist(hooks.before) ? await hooks.before(_id, version, body) : null;
        document = await this._controllerService.updateOneByIdAndVersion(_id, version, body);
        utility.isExist(hooks.after) ? await hooks.after(document) : null;
      }

      await this._sendResponse(response, 200, {document});
    }
    catch (error)
    {
      this._sendResponseWhenError(response, error);
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
   * Replaces the requested document by ID and version.
   *
   * @param {Object} request
   * @param {Object} response
   * @param {Function} [next]
   * @param {{isSessionEnabled: boolean, body: Function, before: Function, after: Function}} [hooks]
   * @return {Promise<void>}
   */
  async replaceOneByIdAndVersion (request, response, next = null, hooks = {})
  {
    let session;
    let document;

    try
    {
      this._validateControllerParameters(request, response, next);

      const _id = this._extractPathParameter(request, "_id");
      const version = this._extractQueryStringParameter(request, "version");
      let body = this._extractBody(request);

      hooks.session ? session = DbConnectionSafe.get().mongoClient.startSession() : undefined;

      if (utility.isExist(session))
      {
        await session.withTransaction(async () =>
                                      {
                                        utility.isExist(hooks.body) ? body = await hooks.body(body, session) : body;

                                        utility.isExist(hooks.before) ? await hooks.before(_id, version, body, session) : null;
                                        document = await this._controllerService.replaceOneByIdAndVersion(_id, version, body, session);
                                        utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                                      }, this.dbOperation.transactionOptions);
      }
      else
      {
        utility.isExist(hooks.body) ? body = await hooks.body(body) : body;

        utility.isExist(hooks.before) ? await hooks.before(_id, version, body) : null;
        document = await this._controllerService.replaceOneByIdAndVersion(_id, version, body);
        utility.isExist(hooks.after) ? await hooks.after(document) : null;
      }

      await this._sendResponse(response, 200, {document});
    }
    catch (error)
    {
      this._sendResponseWhenError(response, error);
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
   * @param {Object} request
   * @param {Object} response
   * @param {Function} [next]
   * @param {{isSessionEnabled: boolean, before: Function, after: Function}} [hooks]
   * @return {Promise<void>}
   */
  async softDeleteOneByIdAndVersion (request, response, next = null, hooks = {})
  {
    let session;
    let document;

    try
    {
      this._validateControllerParameters(request, response, next);

      const _id = this._extractPathParameter(request, "_id");
      const version = this._extractQueryStringParameter(request, "version");

      hooks.session ? session = DbConnectionSafe.get().mongoClient.startSession() : null;

      if (utility.isExist(session))
      {
        await session.withTransaction(async () =>
                                      {
                                        utility.isExist(hooks.before) ? await hooks.before(_id, version, session) : null;
                                        document = await this._controllerService.softDeleteOneByIdAndVersion(_id, version, session);
                                        utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                                      }, this.dbOperation.transactionOptions);
      }
      else
      {
        utility.isExist(hooks.before) ? await hooks.before(_id, version) : null;
        document = await this._controllerService.softDeleteOneByIdAndVersion(_id, version);
        utility.isExist(hooks.after) ? await hooks.after(document) : null;
      }

      await this._sendResponse(response, 200, {document});
    }
    catch (error)
    {
      this._sendResponseWhenError(response, error);
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
   * @param {Object} request
   * @param {Object} response
   * @param {Function} [next]
   * @param {{isSessionEnabled: boolean, before: Function, after: Function}} [hooks]
   * @return {Promise<void>}
   */
  async deleteOneByIdAndVersion (request, response, next = null, hooks = {})
  {
    let session;
    let document;

    try
    {
      this._validateControllerParameters(request, response, next);

      const _id = this._extractPathParameter(request, "_id");
      const version = this._extractQueryStringParameter(request, "version");

      hooks.session ? session = DbConnectionSafe.get().mongoClient.startSession() : null;

      if (utility.isExist(session))
      {
        await session.withTransaction(async () =>
                                      {
                                        utility.isExist(hooks.before) ? await hooks.before(_id, version, session) : null;
                                        document = await this._controllerService.deleteOneByIdAndVersion(_id, version, session);
                                        utility.isExist(hooks.after) ? await hooks.after(document, session) : null;
                                      }, this.dbOperation.transactionOptions);
      }
      else
      {
        utility.isExist(hooks.before) ? await hooks.before(_id, version) : null;
        document = await this._controllerService.deleteOneByIdAndVersion(_id, version);
        utility.isExist(hooks.after) ? await hooks.after(document) : null;
      }

      await this._sendResponse(response, 200, {document});
    }
    catch (error)
    {
      this._sendResponseWhenError(response, error);
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
   *   readOneById                   : (_id, [session]) -> void
   *   createOne                     : (body, [session]) -> void
   *   updateOneByIdAndVersion: (_id, version, body, [session]) -> void
   *   softDeleteOneByIdAndVersion   : (_id, version, [session]) -> void
   *   deleteOneByIdAndVersion       : (_id, version, [session]) -> void
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
