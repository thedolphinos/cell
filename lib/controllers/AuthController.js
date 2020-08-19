"use strict";

const ControllerHelper = require("../helpers/ControllerHelper");

/**
 * Contains generic methods for authentication.
 * Should be used as a super class.
 *
 * @since 0.9.0
 */
class AuthController
{
  /**
   * Login.
   *
   * @since 0.9.0
   * @param {Object} request
   * @param {Object} response
   * @return {Promise<void>}
   */
  async login (request, response)
  {
    try
    {
      ControllerHelper.validateControllerParameters(request, response);
      const body = ControllerHelper.extractBody(request);
      const {statusCode, data} = await this.processLogin(body);
      ControllerHelper.sendResponse(response, statusCode, data);
    }
    catch (error)
    {
      ControllerHelper.sendResponseWhenError(response, error);
    }
  }

  /**
   * Contains the processes during the login.
   * Must be overridden.
   *
   * @since 0.9.0
   * @param {Object} body
   * @return {Promise<{statusCode: number, data: Object}>}
   */
  async processLogin (body)
  {
  }
}

module.exports = AuthController;
