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

/**
 * Contains the controller logic of the framework.
 * Should be used as a super class.
 */
class Controller
{
  /**
   * Verifies the public request using the authorization header.
   *
   * @param {Object} request
   * @param {Object} response
   * @param {Function} next
   * @param {Object} [hooks]
   * @param {Object} [allowedProperties]
   * @return {Promise<void>}
   */
  async verifyPublic (request, response, next, hooks = undefined, allowedProperties = undefined)
  {
    try
    {
      hooks = utility.init(hooks, {});
      hooks.bearer = utility.init(hooks.bearer, {});
      allowedProperties = utility.init(allowedProperties, {});
      allowedProperties.headers = utility.init(allowedProperties.headers, []);

      const headers = this._extractHeaders(request, allowedProperties.headers);
      utility.isExist(hooks.headers) ? await hooks.headers(headers) : undefined;

      next();
    }
    catch (error)
    {
      this._sendResponseWhenError(response, error);
    }
  }

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
    this._validateParameterAllowedProperties(allowedProperties);
    allowedProperties = _.union(allowedProperties, Controller.DEFAULT_HEADER_PARAMETERS);

    const headers = request.headers;

    if (!utility.isExist(headers))
    {
      throw new HeadersMissingError();
    }

    this._authorizeAttempting(headers, allowedProperties);

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
    this._validateParameterAllowedProperties(allowedProperties);

    const pathParameters = request.params;

    if (!utility.isExist(pathParameters))
    {
      throw new PathParametersMissingError();
    }

    this._authorizeAttempting(pathParameters, allowedProperties);

    return pathParameters;
  }

  /**
   * Extracts path parameter with the specified name from path parameters.
   *
   * @param {Object} pathParameters
   * @param {string} name
   * @param {Array<string>} [allowedProperties] - If present, authorizes the path parameters according to.
   * @returns {String}
   * @protected
   */
  _extractPathParameter (pathParameters, name, allowedProperties = [])
  {
    if (!_.isPlainObject(pathParameters) ||
        !_.isString(name))
    {
      throw new InvalidArgumentsError();
    }

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
    this._validateParameterAllowedProperties(allowedProperties);

    const queryString = request.query;

    if (!utility.isExist(queryString))
    {
      throw new QueryStringMissingError();
    }

    this._authorizeAttempting(queryString, allowedProperties);

    return queryString;
  }

  /**
   * Extracts query string parameter with the specified name from query string.
   *
   * @param {Object} queryString
   * @param {string} name
   * @param {Array<string>} [allowedProperties] - If present, authorizes the path parameters according to.
   * @returns {String}
   * @protected
   */
  _extractQueryStringParameter (queryString, name, allowedProperties = [])
  {
    if (!_.isPlainObject(queryString) ||
        !_.isString(name))
    {
      throw new InvalidArgumentsError();
    }

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
    this._validateParameterAllowedProperties(allowedProperties);

    const body = request.body;

    if (!utility.isExist(body))
    {
      throw new BodyMissingError();
    }

    this._authorizeAttempting(body, allowedProperties);

    return body;
  }

  /* AUTHORIZE */
  /**
   * Checks if the properties of the specified attempting are in the specified allowed properties.
   *
   * @param {Object} attempting - Headers, path parameters, query string, body.
   * @param {Array<string>} allowedProperties
   * @protected
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
  async _sendResponse (request, response, statusCode, data = undefined)
  {
    if (!utility.isValidNumber(statusCode) || !(Controller.VALID_HTTP_STATUS_CODES.INFORMATIONAL.includes(statusCode) || Controller.VALID_HTTP_STATUS_CODES.SUCCESSFUL.includes(statusCode)))
    {
      throw new InternalServerError();
    }
    utility.init(data, {});

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
    try
    {
      if (!((error instanceof DeveloperError) || (error instanceof DbError) || (error instanceof MongoError) || (error instanceof HTTPError)) ||
          (error instanceof HTTPError && !(Controller.VALID_HTTP_STATUS_CODES.CLIENT_ERROR.includes(error.statusCode) || Controller.VALID_HTTP_STATUS_CODES.SERVER_ERROR.includes(error.statusCode))))
      {
        Logger.error(`Developer made a mistake.`, error);
        error = new InternalServerError();
      }

      if (!(error instanceof InternalServerError))
      {
        if (error instanceof HTTPError)
        {
          Logger.error(`HTTP error is given: ${error.getMessage()}`, error);
        }
        else if (error instanceof MongoError)
        {
          Logger.error(`MongoDB level error is occurred: (CODE ${error.code}) ${error.message}`, error);

          if (error.code === 121)
          {
            error = new BadRequestError({en: "Invalid body."});
          }
          else
          {
            error = new InternalServerError();
          }
        }
        else if (error instanceof DbError)
        {
          Logger.error(`Database level error is occurred.`, error);
          error = new ClientError(400, {en: "Resource is not found."});
        }
        else if (error instanceof DeveloperError)
        {
          Logger.error(`Developer error is occurred: ${error.getMessage()}`, error);

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
                                               message: error.getMessage()
                                             });
    }
    catch (error)
    {
      Logger.error(`Error occurred while sending error: ${JSON.stringify(error)}`, error);

      response.status(500).json();
    }
  }

  /* VARIABLES */
  /**
   * Represents valid HTTP status codes.
   */
  static VALID_HTTP_STATUS_CODES = {
    INFORMATIONAL: [100, 101, 102, 103],
    SUCCESSFUL: [200, 201, 202, 203, 204, 205, 206],
    REDIRECT: [300, 301, 302, 303, 304, 307, 308],
    CLIENT_ERROR: [400, 401, 402, 403, 404, 405, 406, 407, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 422, 425, 426, 428, 429, 431, 451],
    SERVER_ERROR: [500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 511]
  };

  static DEFAULT_HEADER_PARAMETERS = ["accept", "content-type", "content-length", "host", "user-agent"];

  /* VALIDATE PARAMS */
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
