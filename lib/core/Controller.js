"use strict";

const {
  DeveloperError,
  InvalidArgumentsError,
  DbError,
  HTTPError,
  InternalServerError,
  ClientError,
  BadRequestError,
  ForbiddenError,
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

const DEFAULT_HEADER_PARAMETERS = ["accept", "content-type", "content-length", "host", "user-agent"];

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
  /* EXTRACT FROM REQUEST */
  /**
   * Extracts headers from request.
   *
   * @param {Object} request
   * @param {Array<string>} [allowedProperties] - If present, authorizes the headers according to.
   * @return {Object}
   * @protected
   */
  _extractHeaders (request, allowedProperties = [])
  {
    this._validateParameterRequest(request);
    this._validateParameterAllowedProperties(allowedProperties);
    allowedProperties = _.union(allowedProperties, DEFAULT_HEADER_PARAMETERS);

    const headers = request.headers;

    if (!utility.isExist(headers))
    {
      throw new HeadersMissingError();
    }

    if (utility.isInitialized(allowedProperties))
    {
      this._authorizeAttempting(headers, allowedProperties);
    }

    return headers;
  }

  /**
   * Extracts path parameters from request.
   *
   * @param {Object} request
   * @param {Array<string>} [allowedProperties] - If present, authorizes the path parameters according to.
   * @returns {Object}
   * @protected
   */
  _extractPathParameters (request, allowedProperties = [])
  {
    this._validateParameterRequest(request);
    this._validateParameterAllowedProperties(allowedProperties);

    const pathParameters = request.params;

    if (!utility.isExist(pathParameters))
    {
      throw new PathParametersMissingError();
    }

    if (utility.isInitialized(allowedProperties))
    {
      this._authorizeAttempting(pathParameters, allowedProperties);
    }

    return pathParameters;
  }

  /**
   * Extracts path parameter with the specified name from request.
   *
   * @param {Object} request
   * @param {string} name
   * @param {Array<string>} [allowedProperties] - If present, authorizes the path parameter according to.
   * @returns {String}
   * @protected
   */
  _extractPathParameter (request, name, allowedProperties = [])
  {
    this._validateParameterRequest(request);
    this._validateParameterAllowedProperties(allowedProperties);

    if (!_.isString(name))
    {
      throw new InvalidArgumentsError();
    }

    const pathParameters = this._extractPathParameters(request, allowedProperties);
    const pathParameter = pathParameters[name];

    if (!utility.isExist(pathParameter))
    {
      throw new PathParameterMissingError(name);
    }

    return pathParameter;
  }

  /**
   * Extracts query string from request.
   *
   * @param {Object} request
   * @param {Array<string>} [allowedProperties] - If present, authorizes the query string according to.
   * @returns {Object}
   * @protected
   */
  _extractQueryString (request, allowedProperties = [])
  {
    this._validateParameterRequest(request);
    this._validateParameterAllowedProperties(allowedProperties);

    const queryString = request.query;

    if (!utility.isExist(queryString))
    {
      throw new QueryStringMissingError();
    }

    if (utility.isInitialized(allowedProperties))
    {
      this._authorizeAttempting(queryString, allowedProperties);
    }

    return queryString;
  }

  /**
   * Extracts query string parameter with the specified name from request.
   *
   * @param {Object} request
   * @param {string} name
   * @param {Array<string>} [allowedProperties] - If present, authorizes the query string parameter according to.
   * @returns {String}
   * @protected
   */
  _extractQueryStringParameter (request, name, allowedProperties = [])
  {
    this._validateParameterRequest(request);
    this._validateParameterAllowedProperties(allowedProperties);

    if (!_.isString(name))
    {
      throw new InvalidArgumentsError();
    }

    const queryString = this._extractQueryString(request);
    const queryStringParameter = queryString[name];

    if (!utility.isExist(queryStringParameter))
    {
      throw new QueryStringParameterMissingError(name);
    }

    return queryStringParameter;
  }

  /**
   * Extracts body from request.
   *
   * @param {Object} request
   * @param {Array<string>} [allowedProperties] - If present, authorizes the body according to.
   * @return {Object}
   * @protected
   */
  _extractBody (request, allowedProperties = [])
  {
    this._validateParameterRequest(request);
    this._validateParameterAllowedProperties(allowedProperties);

    const body = request.body;

    if (!utility.isExist(body))
    {
      throw new BodyMissingError();
    }

    if (utility.isInitialized(allowedProperties))
    {
      this._authorizeAttempting(body, allowedProperties);
    }

    return body;
  }

  /* AUTHORIZE */
  /**
   * Checks if the properties of the specified attempting are in the specified allowed properties.
   *
   * @param {Object} attempting - Headers, path parameters, query string, body.
   * @param {Array<string>} allowedProperties
   * @private
   */
  _authorizeAttempting (attempting, allowedProperties)
  {
    if (!_.isPlainObject(attempting))
    {
      throw new InvalidArgumentsError();
    }

    this._validateParameterAllowedProperties(allowedProperties);

    if (!utility.isInitialized(allowedProperties) && utility.isInitialized(attempting))
    {
      throw new ForbiddenError();
    }

    for (const attemptingKey in attempting)
    {
      if (!allowedProperties.includes(attemptingKey))
      {
        throw new ForbiddenError();
      }
    }
  }

  /* SEND RESPONSE */
  /**
   * Sends the appropriate response when successful.
   *
   * @param {Object} request
   * @param {Object} response
   * @param {Number} statusCode
   * @param {*} [data]
   * @protected
   */
  async _sendResponse (request, response, statusCode, data = null)
  {
    this._validateParameterRequest(request);
    this._validateParameterResponse(response);

    if (!utility.isValidNumber(statusCode) || !(VALID_HTTP_STATUS_CODES.INFORMATIONAL.includes(statusCode) || VALID_HTTP_STATUS_CODES.SUCCESSFUL.includes(statusCode)))
    {
      throw new InternalServerError();
    }

    if (utility.isExist(request?.locals?.newToken))
    {
      data.token = request.locals.newToken;
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
    this._validateParameterResponse(response);

    if (!((error instanceof DeveloperError) || (error instanceof DbError) || (error instanceof MongoError) || (error instanceof HTTPError)) ||
        (error instanceof HTTPError && !(VALID_HTTP_STATUS_CODES.CLIENT_ERROR.includes(error.statusCode) || VALID_HTTP_STATUS_CODES.SERVER_ERROR.includes(error.statusCode))))
    {
      Logger.error(`Developer made a mistake.`, error);
      error = new InternalServerError();
    }

    if (!(error instanceof InternalServerError))
    {
      if (error instanceof HTTPError)
      {
        Logger.error(`HTTP error is given: ${error.message}`, error);
      }
      else if (error instanceof MongoError)
      {
        Logger.error(`MongoDB level error is occurred: (CODE ${error.code}) ${error.message}`, error);

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
        Logger.error(`Developer error is occurred: ${error.message}`, error);

        error = new InternalServerError();
      }
      else
      {
        Logger.error(`Unexpected type of error is occurred: ${JSON.stringify(error)}`, error);

        error = new InternalServerError();
      }
    }

    response.status(error.statusCode).json({
                                             statusCode: error.statusCode,
                                             message: error.message
                                           });
  }

  /* VALIDATE PARAMS */
  /**
   * Validates the specified controller parameters.
   *
   * @param {Object} request
   * @param {Object} response
   * @param {Function} next
   * @protected
   */
  _validateControllerParams (request, response, next)
  {
    this._validateParameterRequest(request);
    this._validateParameterResponse(response);
    this._validateParameterNext(next);
  }

  /**
   * Validates the specified request parameter.
   *
   * @param {Object} request
   * @private
   */
  _validateParameterRequest (request)
  {
    if (!_.isObject(request))
    {
      throw new InvalidArgumentsError();
    }
  }

  /**
   * Validates the specified response parameter.
   *
   * @param {Object} response
   * @private
   */
  _validateParameterResponse (response)
  {
    if (!_.isObject(response))
    {
      throw new InvalidArgumentsError();
    }
  }

  /**
   * Validates the specified next parameter.
   *
   * @param {Function} next
   * @private
   */
  _validateParameterNext (next)
  {
    if (utility.isExist(next) && !_.isFunction(next))
    {
      throw new InvalidArgumentsError();
    }
  }

  /**
   * Validates the specified allowed properties.
   *
   * @param {Array<string>} allowedProperties
   * @protected
   */
  _validateParameterAllowedProperties (allowedProperties)
  {
    if (!_.isArray(allowedProperties))
    {
      throw new InvalidArgumentsError();
    }

    for (const allowedProperty of allowedProperties)
    {
      if (!_.isString(allowedProperty))
      {
        throw new InvalidArgumentsError();
      }
    }
  }
}

module.exports = Controller;
