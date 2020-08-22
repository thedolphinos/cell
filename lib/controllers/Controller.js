"use strict";

const {
  InvalidArgumentsError,
  HTTPError,
  HeadersMissingError,
  PathParametersMissingError,
  PathParameterMissingError,
  QueryStringMissingError,
  QueryStringParameterMissingError,
  BodyMissingError,
  InternalServerError
} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");

const Logger = require("../core/Logger");

/**
 * Represents valid HTTP status codes.
 *
 * @since 0.9.0
 * @type {Readonly<Object>}
 */
const VALID_HTTP_STATUS_CODES = Object.freeze({
                                                INFORMATIONAL: [100, 101, 102, 103],
                                                SUCCESSFUL: [200, 201, 202, 203, 204, 205, 206],
                                                REDIRECT: [300, 301, 302, 303, 304, 307, 308],
                                                CLIENT_ERROR: [400, 401, 402, 403, 404, 405, 406, 407, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 422, 425, 426, 428, 429, 431, 451],
                                                SERVER_ERROR: [500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 511]
                                              });

/**
 * Contains the controller logic of the framework.
 * Should be used as a super class.
 *
 * @since 0.11.0
 */
class Controller
{
  /**
   * Checks if the specified request is valid.
   *
   * @since 0.9.0
   * @param {Object} request
   * @return {boolean}
   */
  static isValidRequest (request)
  {
    return _.isObject(request);
  }

  /**
   * Checks if the specified response is valid.
   *
   * @since 0.9.0
   * @param {Object} response
   * @return {boolean}
   */
  static isValidResponse (response)
  {
    return _.isObject(response);
  }

  /**
   * Checks if the specified next is valid.
   *
   * @since 0.9.0
   * @param {Function} next
   * @return {boolean}
   */
  static isValidNext (next)
  {
    return !(utility.isExist(next) && !_.isFunction(next));
  }

  /**
   * Validates controller parameters.
   *
   * @since 0.9.0
   * @param {Object} request
   * @param {Object} response
   * @param {Function} [next]
   */
  static validateControllerParameters (request, response, next = null)
  {
    if (!Controller.isValidRequest(request) ||
        !Controller.isValidResponse(response) ||
        !Controller.isValidNext(next))
    {
      throw new InvalidArgumentsError();
    }
  }

  /**
   * Extracts headers from request.
   *
   * @since 0.9.0
   * @param {Object} request
   * @return {Object}
   */
  static extractHeaders (request)
  {
    if (!Controller.isValidRequest(request))
    {
      throw new InvalidArgumentsError();
    }
    else if (!utility.isExist(request.headers))
    {
      throw new HeadersMissingError();
    }

    return request.headers;
  }

  /**
   * Extracts path parameters from request.
   *
   * @since 0.9.0
   * @param {Object} request
   * @returns {Object}
   */
  static extractPathParameters (request)
  {
    if (!Controller.isValidRequest(request))
    {
      throw new InvalidArgumentsError();
    }
    else if (!utility.isExist(request.params))
    {
      throw new PathParametersMissingError();
    }

    return request.params;
  }

  /**
   * Extracts path parameter with the specified name from request.
   *
   * @since 0.9.0
   * @param {Object} request
   * @param {string} name
   * @returns {String}
   */
  static extractPathParameter (request, name)
  {
    if (!Controller.isValidRequest(request) ||
        !_.isString(name))
    {
      throw new InvalidArgumentsError();
    }

    const pathParameters = Controller.extractPathParameters(request);

    if (!utility.isExist(pathParameters[name]))
    {
      throw new PathParameterMissingError(name);
    }

    return pathParameters[name];
  }

  /**
   * Extracts query string from request.
   *
   * @since 0.9.0
   * @param {Object} request
   * @returns {Object}
   */
  static extractQueryString (request)
  {
    if (!Controller.isValidRequest(request))
    {
      throw new InvalidArgumentsError();
    }
    else if (!utility.isExist(request.query))
    {
      throw new QueryStringMissingError();
    }

    return request.query;
  }

  /**
   * Extracts query string parameter with the specified name from request.
   *
   * @since 0.9.0
   * @param {Object} request
   * @param {string} name
   * @returns {String}
   */
  static extractQueryStringParameter (request, name)
  {
    if (!Controller.isValidRequest(request) ||
        !_.isString(name))
    {
      throw new InvalidArgumentsError();
    }

    const queryString = Controller.extractQueryString(request);

    if (!utility.isExist(queryString[name]))
    {
      throw new QueryStringParameterMissingError(name);
    }

    return queryString[name];
  }

  /**
   * Extracts body from request.
   *
   * @since 0.9.0
   * @param {Object} request
   * @return {Object}
   */
  static extractBody (request)
  {
    if (!Controller.isValidRequest(request))
    {
      throw new InvalidArgumentsError();
    }
    else if (!utility.isExist(request.body))
    {
      throw new BodyMissingError();
    }

    return request.body;
  }

  /**
   * Sends the appropriate response when successful.
   *
   * @since 0.9.0
   * @param {Object} response
   * @param {Number} statusCode
   * @param {Object} data
   */
  static sendResponse (response, statusCode, data)
  {
    if (!Controller.isValidResponse(response) ||
        !utility.isValidNumber(statusCode) || !(VALID_HTTP_STATUS_CODES.INFORMATIONAL.includes(statusCode) || VALID_HTTP_STATUS_CODES.SUCCESSFUL.includes(statusCode)) ||
        !_.isPlainObject(data))
    {
      throw new InternalServerError();
    }

    response.status(statusCode).json(data);
  }

  /**
   * Sends the appropriate response when an error is occurred.
   *
   * @since 0.9.0
   * @param {Object} response
   * @param {HTTPError} error
   */
  static sendResponseWhenError (response, error)
  {
    if (!Controller.isValidResponse(response) ||
        !(error instanceof HTTPError) || !(VALID_HTTP_STATUS_CODES.CLIENT_ERROR.includes(error.statusCode) || VALID_HTTP_STATUS_CODES.SERVER_ERROR.includes(error.statusCode)))
    {
      Logger.error(`Developer made a mistake: ${error}`);
      error = new InternalServerError();
    }

    response.status(error.statusCode).json({
                                             statusCode: error.statusCode,
                                             message: error.message
                                           });
  }
}

module.exports = Controller;
