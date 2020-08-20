"use strict";

const Controller = require("../controllers/Controller");

/**
 * Contains generic methods for authentication.
 * Should be used as a super class.
 *
 * @since 0.9.0
 */
class AuthController extends Controller
{
  /**
   * Verifies the authentication request using the authorization header.
   *
   * @since 0.11.0
   * @param {Object} request
   * @param {Object} response
   * @param {Function} next
   * @return {Promise<void>}
   */
  async verify (request, response, next)
  {
    try
    {
      AuthController.validateControllerParameters(request, response, next);
      const headers = AuthController.extractHeaders(request);
      const {data} = await this.processVerify(headers);
      next(data);
    }
    catch (error)
    {
      AuthController.sendResponseWhenError(response, error);
    }
  }

  /**
   * Contains the processes during the verify.
   * Must be overridden.
   *
   * @since 0.11.0
   * @param {Object} headers
   * @return {Promise<{data: Object}>}
   */
  async processVerify (headers)
  {
  }

  /**
   * Logins.
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
      AuthController.validateControllerParameters(request, response);
      const body = AuthController.extractBody(request);
      const {statusCode, data} = await this.processLogin(body);
      AuthController.sendResponse(response, statusCode, data);
    }
    catch (error)
    {
      AuthController.sendResponseWhenError(response, error);
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
