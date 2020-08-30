"use strict";

const {InvalidArgumentsError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");

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

    CrudController._validateConstructorParameters(crudControllerService);

    this._controllerService = crudControllerService;
  }

  /**
   * Fetches the requested documents.
   *
   * @since 0.15.0
   * @param {Object} request
   * @param {Object} response
   * @param {Function} [next]
   * @return {Promise<void>}
   */
  async read (request, response, next = null)
  {
    try
    {
      CrudController.validateControllerParameters(request, response, next);
      const queryString = CrudController.extractQueryString(request);
      const documents = await this._controllerService.read(queryString);
      CrudController.sendResponse(response, 200, documents);
    }
    catch (error)
    {
      CrudController.sendResponseWhenError(response, error);
    }
  }

  /**
   * Fetches the requested document by ID.
   *
   * @since 0.15.0
   * @param {Object} request
   * @param {Object} response
   * @param {Function} [next]
   * @return {Promise<void>}
   */
  async readOneById (request, response, next = null)
  {
    try
    {
      CrudController.validateControllerParameters(request, response, next);
      const id = CrudController.extractPathParameter(request, "id");
      const document = await this._controllerService.readOneById(id);
      CrudController.sendResponse(response, 200, document);
    }
    catch (error)
    {
      CrudController.sendResponseWhenError(response, error);
    }
  }

  /**
   * Creates the requested document.
   *
   * @since 0.11.0
   * @param {Object} request
   * @param {Object} response
   * @param {Function} [next]
   * @param {Object} hooks
   * @return {Promise<void>}
   */
  async createOne (request, response, next = null, hooks = {})
  {
    try
    {
      CrudController.validateControllerParameters(request, response, next);
      let body = CrudController.extractBody(request);
      utility.isExist(hooks.body) ? body = await hooks.body(body) : null;
      const document = await this._controllerService.createOne(body);
      CrudController.sendResponse(response, 201, document);
    }
    catch (error)
    {
      CrudController.sendResponseWhenError(response, error);
    }
  }

  /**
   * Updates the requested document by ID and version.
   *
   * @since 0.16.0
   * @param {Object} request
   * @param {Object} response
   * @param {Function} [next]
   * @param {Object} hooks
   * @return {Promise<void>}
   */
  async updateOneByIdAndVersion (request, response, next = null, hooks = {})
  {
    try
    {
      CrudController.validateControllerParameters(request, response, next);
      const id = CrudController.extractPathParameter(request, "id");
      const version = CrudController.extractQueryStringParameter(request, "version");
      let body = CrudController.extractBody(request);
      utility.isExist(hooks.body) ? body = await hooks.body(body) : null;
      const document = await this._controllerService.updateOneByIdAndVersion(id, version, body);
      CrudController.sendResponse(response, 201, document);
    }
    catch (error)
    {
      CrudController.sendResponseWhenError(response, error);
    }
  }

  /**
   * Deletes (soft) the requested document by ID and version.
   *
   * @since 0.17.0
   * @param {Object} request
   * @param {Object} response
   * @param {Function} [next]
   * @return {Promise<void>}
   */
  async softDeleteOneByIdAndVersion (request, response, next = null)
  {
    try
    {
      CrudController.validateControllerParameters(request, response, next);
      const id = CrudController.extractPathParameter(request, "id");
      const version = CrudController.extractQueryStringParameter(request, "version");
      const document = await this._controllerService.softDeleteOneByIdAndVersion(id, version);
      CrudController.sendResponse(response, 201, document);
    }
    catch (error)
    {
      CrudController.sendResponseWhenError(response, error);
    }
  }

  /**
   * Deletes the requested document by ID and version.
   *
   * @since 0.18.0
   * @param {Object} request
   * @param {Object} response
   * @param {Function} [next]
   * @return {Promise<void>}
   */
  async deleteOneByIdAndVersion (request, response, next = null)
  {
    try
    {
      CrudController.validateControllerParameters(request, response, next);
      const id = CrudController.extractPathParameter(request, "id");
      const version = CrudController.extractQueryStringParameter(request, "version");
      const document = await this._controllerService.deleteOneByIdAndVersion(id, version);
      CrudController.sendResponse(response, 201, document);
    }
    catch (error)
    {
      CrudController.sendResponseWhenError(response, error);
    }
  }

  /**
   * Validates the parameters for the constructor method.
   *
   * @since 0.14.0
   * @param {CrudControllerService} service
   * @protected
   */
  static _validateConstructorParameters (service)
  {
    if (!(service instanceof CrudControllerService))
    {
      throw new InvalidArgumentsError();
    }
  }
}

module.exports = CrudController;
