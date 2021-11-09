const {
  DeveloperError,
  InvalidArgumentsError,
  DbError,
  HTTPError,
  ClientError,
  InternalServerError,
  BadRequestError,
  ForbiddenError,
  HeadersMissingError,
  PathParametersMissingError,
  QueryStringMissingError,
  BodyMissingError
} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");

const _ = require("lodash");
const {MongoError} = require("mongodb");

const Logger = require("./Logger");
const ErrorSafe = require("../safes/ErrorSafe");
const Validator = require("../helpers/Validator");

/**
 * Base class of controllers.
 */
class Controller
{
  /**
   * Represents API type.
   *
   * @type {{REST: string, NON_REST: string}}
   * @public
   */
  static API_TYPE = {
    "REST": "REST",
    "NON_REST": "NON_REST"
  };

  /**
   * Maps special allowed property names to values.
   *
   * @type {{ALL: string}}
   * @public
   */
  static SPECIAL_ALLOWED_PROPERTY = {
    "ALL": "*"
  };

  /**
   * Maps attempting names to the corresponding request key in Express.
   *
   * @type {{HEADERS: string, PATH_PARAMETERS: string, QUERY_STRING: string, BODY: string}}
   * @private
   */
  static _REQUEST_ELEMENT = {
    "HEADERS": "headers",
    "PATH_PARAMETERS": "params",
    "QUERY_STRING": "query",
    "BODY": "body"
  };

  /**
   * Represents valid HTTP status codes.
   *
   * @type {{INFORMATIONAL: Array<number>, SUCCESSFUL: Array<number>, REDIRECT: Array<number>, CLIENT_ERROR: Array<number>, SERVER_ERROR: Array<number>}}
   * @private
   */
  static _VALID_HTTP_STATUS_CODES = {
    INFORMATIONAL: [100, 101, 102, 103],
    SUCCESSFUL: [200, 201, 202, 203, 204, 205, 206],
    REDIRECT: [300, 301, 302, 303, 304, 307, 308],
    CLIENT_ERROR: [400, 401, 402, 403, 404, 405, 406, 407, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 422, 425, 426, 428, 429, 431, 451],
    SERVER_ERROR: [500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 511]
  };

  /**** INCOMING ****/
  /**
   * Extracts headers from request and authorizes its properties.
   *
   * @param {Object} request - Represents request.
   * @param {{[required]: Array<string>, [optional]: Array<string>} | string} allowedProperties - Represents allowed properties for header.
   *                                                                                              It has 2 types which are required and optional. One of them must be present. Empty string and duplicate values is not allowed as a value of an allowed property type.
   *                                                                                              However, if all properties are allowed, special allowed property for all must be provided instead of an object.
   * @param {boolean} [isRequired] - Represents if request element is required. If `true` and request element is not initialized throws error. Default is `true`.
   * @returns {Object} - Headers.
   * @protected
   */
  static _extractAndAuthorizeHeaders (request, allowedProperties, isRequired = undefined)
  {
    return Controller._extractAndAuthorizeRequestElement(Controller._REQUEST_ELEMENT.HEADERS, request, allowedProperties, isRequired);
  }

  /**
   * Extracts path parameters from request and authorizes its properties.
   *
   * @param {Object} request - Represents request.
   * @param {{[required]: Array<string>, [optional]: Array<string>} | string} allowedProperties - Represents allowed properties for path parameters.
   *                                                                                              It has 2 types which are required and optional. One of them must be present. Empty string and duplicate values is not allowed as a value of an allowed property type.
   *                                                                                              However, if all properties are allowed, special allowed property for all must be provided instead of an object.
   * @param {boolean} [isRequired] - Represents if request element is required. If `true` and request element is not initialized throws error. Default is `true`.
   * @returns {Object} - Path parameters.
   * @protected
   */
  static _extractAndAuthorizePathParameters (request, allowedProperties, isRequired)
  {
    return Controller._extractAndAuthorizeRequestElement(Controller._REQUEST_ELEMENT.PATH_PARAMETERS, request, allowedProperties, isRequired);
  }

  /**
   * Extracts query string from request and authorizes its properties.
   *
   * @param {Object} request - Represents request.
   * @param {{[required]: Array<string>, [optional]: Array<string>} | string} allowedProperties - Represents allowed properties for query string.
   *                                                                                              It has 2 types which are required and optional. One of them must be present. Empty string and duplicate values is not allowed as a value of an allowed property type.
   *                                                                                              However, if all properties are allowed, special allowed property for all must be provided instead of an object.
   * @param {boolean} [isRequired] - Represents if request element is required. If `true` and request element is not initialized throws error. Default is `true`.
   * @returns {Object} - Query string.
   * @protected
   */
  static _extractAndAuthorizeQueryString (request, allowedProperties, isRequired)
  {
    return Controller._extractAndAuthorizeRequestElement(Controller._REQUEST_ELEMENT.QUERY_STRING, request, allowedProperties, isRequired);
  }

  /**
   * Extracts body from request and authorizes its properties.
   *
   * @param {Object} request - Represents request.
   * @param {{[required]: Array<string>, [optional]: Array<string>} | string} allowedProperties - Represents allowed properties for body.
   *                                                                                              It has 2 types which are required and optional. One of them must be present. Empty string and duplicate values is not allowed as a value of an allowed property type.
   *                                                                                              However, if all properties are allowed, special allowed property for all must be provided instead of an object.
   * @param {boolean} [isRequired] - Represents if request element is required. If `true` and request element is not initialized throws error. Default is `true`.
   * @returns {Object} - Body.
   * @protected
   */
  static _extractAndAuthorizeBody (request, allowedProperties, isRequired)
  {
    return Controller._extractAndAuthorizeRequestElement(Controller._REQUEST_ELEMENT.BODY, request, allowedProperties, isRequired);
  }

  /**
   * Extracts the specified request element (headers, path parameters, query string, body) from request and authorizes its properties.
   *
   * @param {string} requestElement - Request element which must be one of `_REQUEST_ELEMENT`.
   * @param {Object} request - Represents request.
   * @param {{[required]: Array<string>, [optional]: Array<string>} | string} allowedProperties - Represents allowed properties.
   *                                                                                              It has 2 types which are required and optional. One of them must be present. Empty string and duplicate values is not allowed as a value of an allowed property type.
   *                                                                                              However, if all properties are allowed, special allowed property for all must be provided instead of an object.
   * @param {boolean} [isRequired] - Represents if request element is required. If `true` and request element is not initialized throws error. Default is `true`.
   * @returns {Object} - Request element.
   * @private
   */
  static _extractAndAuthorizeRequestElement (requestElement, request, allowedProperties, isRequired = undefined)
  {
    isRequired = utility.init(isRequired, true);

    if (!utility.isValidEnumValue(requestElement, Controller._REQUEST_ELEMENT) ||
        !_.isObject(request) ||
        !Validator.isValidParameterAllowedProperties(allowedProperties) ||
        !_.isBoolean(isRequired))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    const extractedRequestElement = request[requestElement];

    const isInitialized = utility.isInitialized(extractedRequestElement);

    if (isRequired && !isInitialized)
    {
      switch (requestElement)
      {
        case Controller._REQUEST_ELEMENT.HEADERS:
        {
          throw new HeadersMissingError(ErrorSafe.get().HTTP_211);
        }
        case Controller._REQUEST_ELEMENT.PATH_PARAMETERS:
        {
          throw new PathParametersMissingError(ErrorSafe.get().HTTP_213);
        }
        case Controller._REQUEST_ELEMENT.QUERY_STRING:
        {
          throw new QueryStringMissingError(ErrorSafe.get().HTTP_215);
        }
        case Controller._REQUEST_ELEMENT.BODY:
        {
          throw new BodyMissingError(ErrorSafe.get().HTTP_217);
        }
      }
    }

    if (isInitialized)
    {
      Controller._authorizeProperties(extractedRequestElement, allowedProperties);
    }

    return extractedRequestElement;
  }

  /**
   * Authorizes the properties of the specified object.
   *
   * @param {Object} object - Represents object whose properties to be authorized.
   * @param {{[required]: Array<string>, [optional]: Array<string>} | string} allowedProperties - Represents allowed properties.
   *                                                                                              It has 2 types which are required and optional. One of them must be present. Empty string and duplicate values is not allowed as a value of an allowed property type.
   *                                                                                              However, if all properties are allowed, special allowed property for all must be provided instead of an object.
   * @protected
   */
  static _authorizeProperties (object, allowedProperties)
  {
    if (!_.isPlainObject(object) ||
        !Validator.isValidParameterAllowedProperties(allowedProperties))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    // all properties are allowed
    if (_.isEqual(allowedProperties, Controller.SPECIAL_ALLOWED_PROPERTY.ALL))
    {
      return;
    }

    for (const property in object)
    {
      let isAllowed = false;

      if (utility.isExist(allowedProperties.required))
      {
        const index = allowedProperties.required.indexOf(property);

        if (index > -1)
        {
          isAllowed = true;
          allowedProperties.required.splice(index, 1); // remove the sent property to check if all required properties are sent
        }
      }

      if (utility.isExist(allowedProperties.optional))
      {
        if (allowedProperties.optional.includes(property))
        {
          isAllowed = true;
        }
      }

      if (!isAllowed)
      {
        Logger.error(`Property "${property}" is not allowed!`);
        throw new ForbiddenError(ErrorSafe.get().HTTP_23);
      }
    }

    if (utility.isExist(allowedProperties.required) && allowedProperties.required.length !== 0)
    {
      const notSentProperties = "";

      for (const property of allowedProperties.required)
      {
        notSentProperties.concat(`${property} ,`);
      }

      Logger.error(`Required properties "${notSentProperties.slice(0, -2)}" are not sent!`);
      throw new ForbiddenError(ErrorSafe.get().HTTP_23);
    }
  }

  /**** OUTGOING ****/
  /**
   * Sends the appropriate response when successful.
   *
   * @param {Object} request - Represents request.
   * @param {Object} response - Represents response.
   * @param {number} [statusCode] - Represents status code of response. Default is `200`.
   * @param {*} [data] - Represents data to be embedded into response data under the property data. (Remember, data is not the only property of response data)
   * @protected
   */
  async _sendResponse (request, response, statusCode = undefined, data = undefined)
  {
    statusCode = utility.init(statusCode, 200);

    if (!_.isObject(request) ||
        !_.isObject(response) ||
        !utility.isValidNumber(statusCode) || !(
        Controller._VALID_HTTP_STATUS_CODES.INFORMATIONAL.includes(statusCode) ||
        Controller._VALID_HTTP_STATUS_CODES.SUCCESSFUL.includes(statusCode)))
    {
      throw new InternalServerError(ErrorSafe.get().HTTP_11);
    }

    const responseData = {};

    if (utility.isExist(data))
    {
      responseData.data = data;
    }

    if (utility.isExist(request?.locals?.newToken))
    {
      responseData.token = request.locals.newToken;
    }

    response.status(statusCode).json(responseData);
  }

  /**
   * Sends the appropriate response when an error is occurred.
   *
   * @param {Object} response - Represents response.
   * @param {DeveloperError | DbError | MongoError | HTTPError} error - Represents the error occurred.
   * @protected
   */
  _sendResponseWhenError (response, error)
  {
    try
    {
      const httpError = this._toHTTPError(error);
      const {statusCode, message} = httpError;

      response.status(statusCode).json({message});
    }
    catch (error)
    {
      try
      {
        Logger.error(`Error occurred while sending error (stringified):\n${JSON.stringify(error)}`, error);

        response.status(500).json();
      }
      catch (error)
      {
        console.error("There is (also) a problem inside the logger!");
        console.error(error);

        response.status(500).json();
      }
    }
  }

  /**
   * Converts the specified error to a corresponding HTTP error.
   *
   * @param {DeveloperError | DbError | MongoError | HTTPError} error - Represents the error occurred.
   * @return {HTTPError} - Corresponding HTTP error.
   * @protected
   */
  _toHTTPError (error)
  {
    let isConvertToInternalServerError = false;

    if (!(error instanceof DeveloperError) &&
        !(error instanceof DbError) &&
        !(error instanceof MongoError) &&
        !(error instanceof HTTPError))
    {
      isConvertToInternalServerError = true;
      Logger.error(`Unexpected type of error!`, error);
    }

    if (error instanceof HTTPError &&
        !Controller._VALID_HTTP_STATUS_CODES.CLIENT_ERROR.includes(error.statusCode) &&
        !Controller._VALID_HTTP_STATUS_CODES.SERVER_ERROR.includes(error.statusCode))
    {
      isConvertToInternalServerError = true;
      Logger.error(`Unexpected status code for HTTP error!`, error);
    }

    if (isConvertToInternalServerError)
    {
      error = new InternalServerError(ErrorSafe.get().HTTP_11);
    }

    if (!(error instanceof InternalServerError))
    {
      if (error instanceof DeveloperError)
      {
        Logger.error(`Developer error is occurred! ${JSON.stringify(error)}`, error);
        error = new InternalServerError(ErrorSafe.get().HTTP_11);
      }
      else if (error instanceof DbError)
      {
        Logger.error(`Database level error is occurred!`, error);
        error = new ClientError(ErrorSafe.get().RESOURCE_NOT_FOUND);
      }
      else if (error instanceof MongoError)
      {
        Logger.error(`MongoDB level error is occurred! (Code: ${error.code}) (Message: ${error.message})`, error);

        if (error.code === 121)
        {
          error = new BadRequestError(ErrorSafe.get().INVALID_BODY);
        }
        else
        {
          error = new InternalServerError(ErrorSafe.get().HTTP_11);
        }
      }
      else if (error instanceof HTTPError)
      {
        Logger.error(`HTTP error is given!`, error);
      }
    }

    return error;
  }
}

module.exports = Controller;
