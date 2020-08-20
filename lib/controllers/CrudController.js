"use strict";

const {InvalidArgumentsError} = require("@thedolphinos/error4js");

const DbService = require("../db/DbService");
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
   * @param {DbService} dbService
   */
  constructor (dbService)
  {
    super();

    if (!(dbService instanceof DbService))
    {
      throw new InvalidArgumentsError();
    }

    this._dbService = dbService;
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
      const result = await this._dbService.createOne(body);
      CrudController.sendResponse(response, 201, result);
    }
    catch (error)
    {
      CrudController.sendResponseWhenError(response, error);
    }
  }
}

module.exports = CrudController;
