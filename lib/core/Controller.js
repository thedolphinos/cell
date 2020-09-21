"use strict";

const {
  DeveloperError,
  InvalidArgumentsError,
  DbError,
  HTTPError,
  InternalServerError,
  ClientError,
  BadRequestError,
  HeadersMissingError,
  PathParametersMissingError,
  PathParameterMissingError,
  QueryStringMissingError,
  QueryStringParameterMissingError,
  BodyMissingError
} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");
const {MongoError} = require("mongodb");

const Logger = require("./Logger");

/**
 * Represents valid HTTP status codes.
 *
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
 */
class Controller
{
  /**
   * Checks if the specified request is valid.
   *
   * @param {Object} request
   * @return {boolean}
   * @private
   */
  _isValidRequest (request)
  {
    return _.isObject(request);
  }

  /**
   * Checks if the specified response is valid.
   *
   * @param {Object} response
   * @return {boolean}
   * @private
   */
  _isValidResponse (response)
  {
    return _.isObject(response);
  }

  /**
   * Checks if the specified next is valid.
   *
   * @param {Function} next
   * @return {boolean}
   * @private
   */
  _isValidNext (next)
  {
    return !(utility.isExist(next) && !_.isFunction(next));
  }

  /**
   * Validates controller parameters.
   *
   * @param {Object} request
   * @param {Object} response
   * @param {Function} [next]
   * @protected
   */
  _validateControllerParameters (request, response, next = null)
  {
    if (!this._isValidRequest(request) ||
        !this._isValidResponse(response) ||
        !this._isValidNext(next))
    {
      throw new InvalidArgumentsError();
    }
  }

  /**
   * Extracts headers from request.
   *
   * @param {Object} request
   * @return {Object}
   * @protected
   */
  _extractHeaders (request)
  {
    if (!this._isValidRequest(request))
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
   * @param {Object} request
   * @returns {Object}
   * @protected
   */
  _extractPathParameters (request)
  {
    if (!this._isValidRequest(request))
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
   * @param {Object} request
   * @param {string} name
   * @returns {String}
   * @protected
   */
  _extractPathParameter (request, name)
  {
    if (!this._isValidRequest(request) ||
        !_.isString(name))
    {
      throw new InvalidArgumentsError();
    }

    const pathParameters = this._extractPathParameters(request);

    if (!utility.isExist(pathParameters[name]))
    {
      throw new PathParameterMissingError(name);
    }

    return pathParameters[name];
  }

  /**
   * Extracts query string from request.
   *
   * @param {Object} request
   * @returns {Object}
   * @protected
   */
  _extractQueryString (request)
  {
    if (!this._isValidRequest(request))
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
   * @param {Object} request
   * @param {string} name
   * @returns {String}
   * @protected
   */
  _extractQueryStringParameter (request, name)
  {
    if (!this._isValidRequest(request) ||
        !_.isString(name))
    {
      throw new InvalidArgumentsError();
    }

    const queryString = this._extractQueryString(request);

    if (!utility.isExist(queryString[name]))
    {
      throw new QueryStringParameterMissingError(name);
    }

    return queryString[name];
  }

  /**
   * Extracts body from request.
   *
   * @param {Object} request
   * @return {Object}
   * @protected
   */
  _extractBody (request)
  {
    if (!this._isValidRequest(request))
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
   * @param {Object} response
   * @param {Number} statusCode
   * @param {*} [data]
   * @protected
   */
  async _sendResponse (response, statusCode, data = null)
  {
    if (!this._isValidResponse(response) ||
        !utility.isValidNumber(statusCode) || !(VALID_HTTP_STATUS_CODES.INFORMATIONAL.includes(statusCode) || VALID_HTTP_STATUS_CODES.SUCCESSFUL.includes(statusCode)))
    {
      throw new InternalServerError();
    }

    response.status(statusCode).json(data);
  }

  /**
   * Sends the appropriate response when an error is occurred.
   *
   * @param {Object} response
   * @param {DeveloperError | DbError | MongoError | HTTPError} error
   * @protected
   */
  _sendResponseWhenError (response, error)
  {
    if (!this._isValidResponse(response) ||
        !((error instanceof DeveloperError) || (error instanceof DbError) || (error instanceof MongoError) || (error instanceof HTTPError)) ||
        (error instanceof HTTPError && !(VALID_HTTP_STATUS_CODES.CLIENT_ERROR.includes(error.statusCode) || VALID_HTTP_STATUS_CODES.SERVER_ERROR.includes(error.statusCode))))
    {
      Logger.error(`Developer made a mistake.`, error);
      error = new InternalServerError();
    }

    if (!(error instanceof InternalServerError))
    {
      if (error instanceof HTTPError)
      {
        Logger.error(`HTTP error is given: ${error.message}`);
      }
      else if (error instanceof MongoError)
      {
        Logger.error(`MongoDB level error is occurred: (CODE ${error.code}) ${error.message}`);

        if (error.code === 121)
        {
          error = new BadRequestError("Invalid body.");
        }
        else
        {
          error = new InternalServerError();
        }
      }
      else if (error instanceof DbError)
      {
        Logger.error(`Database level error is occurred.`, error);
        error = new ClientError(400, "Resource is not found.");
      }
      else if (error instanceof DeveloperError)
      {
        Logger.error(`Developer error is occurred: ${error.message}`);

        error = new InternalServerError();
      }
      else
      {
        Logger.error(`Unexpected type of error is occurred: ${JSON.stringify(error)}`);

        error = new InternalServerError();
      }
    }

    response.status(error.statusCode).json({
                                             statusCode: error.statusCode,
                                             message: error.message
                                           });
  }
}

module.exports = Controller;
