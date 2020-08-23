"use strict";

const {InvalidArgumentsError} = require("@thedolphinos/error4js");

const Service = require("../core/Service");
const Controller = require("../controllers/Controller");

/**
 * Contains CRUD methods of a controller.
 * Should be used as a super class.
 *
 * @since 0.11.0
 */
class CrudController extends Controller
{
  /**
   * Creates a controller instance that supports CRUD operations for the specified database service.
   *
   * @param {Service} service
   */
  constructor (service)
  {
    super();

    CrudController._validateConstructorParameters(service);

    this._service = service;
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
      const result = await this._service.read(queryString);
      CrudController.sendResponse(response, 200, result);
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
      const result = await this._service.readOneById(id);
      CrudController.sendResponse(response, 200, result);
    }
    catch (error)
    {
      CrudController.sendResponseWhenError(response, error);
    }
  }

  /**
   * Creates the requested document.
   *
   * @param {Object} request
   * @param {Object} response
   * @param {Function} [next]
   * @return {Promise<void>}
   */
  async createOne (request, response, next = null)
  {
    try
    {
      CrudController.validateControllerParameters(request, response, next);
      const body = CrudController.extractBody(request);
      const result = await this._service.createOne(body);
      CrudController.sendResponse(response, 201, result);
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
   * @param {Service} service
   * @protected
   */
  static _validateConstructorParameters (service)
  {
    if (!(service instanceof Service))
    {
      throw new InvalidArgumentsError();
    }
  }
}

module.exports = CrudController;
