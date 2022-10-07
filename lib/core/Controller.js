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
  BodyMissingError,
  RequiredPropertiesMissingError
} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");

const _ = require("lodash");
const {MongoError} = require("mongodb");

const Logger = require("./Logger");
const ErrorSafe = require("../safes/ErrorSafe");
const DataType = require("../core/DataType.json");
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
    return Controller._extractAndAuthorizeRequestElement(Controller._REQUEST_ELEMENT.HEADERS, request, allowedProperties, null, isRequired);
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
    return Controller._extractAndAuthorizeRequestElement(Controller._REQUEST_ELEMENT.PATH_PARAMETERS, request, allowedProperties, null, isRequired);
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
    return Controller._extractAndAuthorizeRequestElement(Controller._REQUEST_ELEMENT.QUERY_STRING, request, allowedProperties, null, isRequired);
  }

  /**
   * Extracts body from request and authorizes its properties.
   *
   * @param {Object} request - Represents request.
   * @typedef {{[]: string | PropertyDefinition} | Array<{[]: string | PropertyDefinition}>} PropertyDefinition
   * @param {PropertyDefinition} propertyDefinition - Represents property definition for body. Contains information about data type and required status.
   * @param {boolean} [isRequired] - Represents if request element is required. If `true` and request element is not initialized throws error. Default is `true`.
   * @returns {Object} - Body.
   * @protected
   */
  static _extractAndAuthorizeBody (request, propertyDefinition, isRequired)
  {
    return Controller._extractAndAuthorizeRequestElement(Controller._REQUEST_ELEMENT.BODY, request, null, propertyDefinition, isRequired);
  }

  /**
   * Extracts the specified request element (headers, path parameters, query string, body) from request and authorizes its properties.
   *
   * @param {string} requestElement - Request element which must be one of `_REQUEST_ELEMENT`.
   * @param {Object} request - Represents request.
   * @param {{[required]: Array<string>, [optional]: Array<string>} | string} [allowedProperties] - Represents allowed properties.
   *                                                                                              It has 2 types which are required and optional. One of them must be present. Empty string and duplicate values is not allowed as a value of an allowed property type.
   *                                                                                              However, if all properties are allowed, special allowed property for all must be provided instead of an object.
   * @typedef {{[]: string | PropertyDefinition} | Array<{[]: string | PropertyDefinition}>} PropertyDefinition
   * @param {PropertyDefinition} propertyDefinition - Represents property definition. Contains information about data type and required status.
   * @param {boolean} [isRequired] - Represents if request element is required. If `true` and request element is not initialized throws error. Default is `true`.
   * @returns {Object} - Request element.
   * @private
   */
  static _extractAndAuthorizeRequestElement (requestElement, request, allowedProperties = undefined, propertyDefinition = undefined, isRequired = undefined)
  {
    isRequired = utility.init(isRequired, true);

    if (!utility.isValidEnumValue(requestElement, Controller._REQUEST_ELEMENT) ||
        !_.isObject(request) ||
        !_.isBoolean(isRequired))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    const extractedRequestElement = request[requestElement];

    const isInitialized = utility.isInitialized(extractedRequestElement);

    switch (requestElement)
    {
      case Controller._REQUEST_ELEMENT.HEADERS:
      {
        if (utility.isExist(allowedProperties))
        {
          if (!Validator.isValidParameterAllowedProperties(allowedProperties))
          {
            throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
          }
          if (isRequired && !isInitialized)
          {
            throw new HeadersMissingError(ErrorSafe.get().HTTP_211);
          }
          if (isInitialized)
          {
            Controller._authorizePropertiesForAllowedProperties(extractedRequestElement, allowedProperties);
          }
        }
        else
        {
          if (isInitialized)
          {
            Logger.error(`Headers are not allowed but sent!`);
            throw new ForbiddenError(ErrorSafe.get().HTTP_23);
          }
        }

        break;
      }
      case Controller._REQUEST_ELEMENT.PATH_PARAMETERS:
      {
        if (utility.isExist(allowedProperties))
        {
          if (!Validator.isValidParameterAllowedProperties(allowedProperties))
          {
            throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
          }
          if (isRequired && !isInitialized)
          {
            throw new PathParametersMissingError(ErrorSafe.get().HTTP_213);
          }
          if (isInitialized)
          {
            Controller._authorizePropertiesForAllowedProperties(extractedRequestElement, allowedProperties);
          }
        }
        else
        {
          if (isInitialized)
          {
            Logger.error(`Path parameters are not allowed but sent!`);
            throw new ForbiddenError(ErrorSafe.get().HTTP_23);
          }
        }

        break;
      }
      case Controller._REQUEST_ELEMENT.QUERY_STRING:
      {
        if (utility.isExist(allowedProperties))
        {
          if (!Validator.isValidParameterAllowedProperties(allowedProperties))
          {
            throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
          }
          if (isRequired && !isInitialized)
          {
            throw new QueryStringMissingError(ErrorSafe.get().HTTP_215);
          }
          if (isInitialized)
          {
            Controller._authorizePropertiesForAllowedProperties(extractedRequestElement, allowedProperties);
          }
        }
        else
        {
          if (isInitialized)
          {
            Logger.error(`Query string is not allowed but sent!`);
            throw new ForbiddenError(ErrorSafe.get().HTTP_23);
          }
        }

        break;
      }
      case Controller._REQUEST_ELEMENT.BODY:
      {
        if (utility.isExist(propertyDefinition))
        {
          if (!Validator.isValidParameterPropertyDefinition(propertyDefinition))
          {
            throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
          }
          if (isRequired && !isInitialized)
          {
            throw new BodyMissingError(ErrorSafe.get().HTTP_217);
          }
          if (isInitialized)
          {
            Controller._authorizePropertiesForPropertyDefinition(extractedRequestElement, propertyDefinition);
          }
        }
        else
        {
          if (isInitialized)
          {
            Logger.error(`Body is not allowed but sent!`);
            throw new ForbiddenError(ErrorSafe.get().HTTP_23);
          }
        }

        break;
      }
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
  static _authorizePropertiesForAllowedProperties (object, allowedProperties)
  {
    if (!_.isPlainObject(object) ||
        !Validator.isValidParameterAllowedProperties(allowedProperties))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    allowedProperties = _.cloneDeep(allowedProperties); // to loose reference

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

  /**
   * Authorizes the properties of the specified object.
   *
   * @param {Object} object - Represents object whose properties to be authorized.
   * @typedef {{[]: string | PropertyDefinition} | Array<{[]: string | PropertyDefinition}>} PropertyDefinition
   * @param {PropertyDefinition} propertyDefinition - Represents property definition. Contains information about data type and required status.
   * @param {Object} upperObject - Represents upper object of `object` in recursive calls. It is used not to loose reference in primitives for regular expression based manipulations.
   * @param {string} upperKey - Represents key of `upperObject` in recursive calls.
   * @param {boolean} isRegexBased - Converts property value to regex if string.
   * @protected
   */
  static _authorizePropertiesForPropertyDefinition (object, propertyDefinition, upperObject, upperKey, isRegexBased = undefined)
  {
    isRegexBased = utility.init(isRegexBased, false);

    const isRecursiveCall = utility.isExist(upperObject) && utility.isExist(upperKey); // controls validation of `propertyDefinition` which must not be made on the recursive calls.

    if (!isRecursiveCall &&
        (
          !_.isPlainObject(object) ||
          !Validator.isValidParameterPropertyDefinition(propertyDefinition)
        )
    )
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    const clonedObject = _.cloneDeep(object); // to loose reference

    const isString = _.isString(propertyDefinition);
    const isPlainObject = _.isPlainObject(propertyDefinition);
    const isArray = _.isArray(propertyDefinition);

    if (isString)
    {
      let isInvalidType;

      switch (propertyDefinition)
      {
        case DataType.Boolean:
        {
          isInvalidType = !_.isBoolean(object);
          break;
        }
        case DataType.Integer:
        {
          isInvalidType = !utility.isValidNumber(object) || !_.isInteger(object);
          break;
        }
        case DataType.Float:
        {
          isInvalidType = !utility.isValidNumber(object);
          break;
        }
        case DataType.String:
        {
          isInvalidType = !_.isString(object);

          if (isRegexBased)
          {
            upperObject[upperKey] = {$regex: object};
          }

          break;
        }
        case DataType.ObjectId:
        {
          isInvalidType = !utility.isValidId(object);
          break;
        }
        case DataType.Date:
        {
          const value = new Date(object);

          isInvalidType = !utility.isValidDate(value);

          if (!isInvalidType)
          {
            upperObject[upperKey] = value;
          }

          break;
        }
        case DataType.Any:
        {
          isInvalidType = false;
          break;
        }
      }

      if (isInvalidType)
      {
        Logger.error(`Property type is not allowed! It must be type of "${propertyDefinition}".`);
        throw new BadRequestError(ErrorSafe.get().HTTP_21);
      }
    }
    else if (isPlainObject)
    {
      if (!_.isPlainObject(clonedObject))
      {
        Logger.error(`Invalid property! It must be an object.`);
        throw new BadRequestError(ErrorSafe.get().HTTP_21);
      }

      for (const key in propertyDefinition)
      {
        const isOptional = key.startsWith("."); // optional property names starts with `.`.
        const isRequired = !isOptional;
        const isNullable = key.startsWith(":"); // required nullable property names starts with `:`.
        const isRegexBased = key.endsWith("?"); // regex based property names ends with `?`.
        let propertyName = isOptional || isNullable ? key.slice(1) : key;
        propertyName = isRegexBased ? propertyName.slice(0, -1) : propertyName;
        const propertyValue = clonedObject[propertyName];
        delete clonedObject[propertyName];

        if (utility.isExist(propertyValue))
        {
          Controller._authorizePropertiesForPropertyDefinition(propertyValue, propertyDefinition[key], !isRecursiveCall ? object : upperObject[upperKey], propertyName, isRegexBased);
        }
        else
        {
          if (isRequired && !isNullable)
          {
            Logger.error(`Required property is not sent!`);
            throw new RequiredPropertiesMissingError(ErrorSafe.get().HTTP_219);
          }
        }
      }

      if (utility.isInitialized(clonedObject))
      {
        Logger.error(`Not allowed properties are sent!`);
        throw new BadRequestError(ErrorSafe.get().HTTP_21);
      }
    }
    else if (isArray)
    {
      if (!_.isArray(clonedObject))
      {
        Logger.error(`Invalid property! It must be an array.`);
        throw new BadRequestError(ErrorSafe.get().HTTP_21);
      }

      for (let i = 0; i < clonedObject.length; i++)
      {
        Controller._authorizePropertiesForPropertyDefinition(clonedObject[i], propertyDefinition[0], !isRecursiveCall ? object : upperObject[upperKey], i);
      }
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

    let responseData = {};

    if (utility.isExist(data))
    {
      responseData.data = data;
    }

    if (utility.isExist(response?.locals?.authorizationBundle))
    {
      responseData.token = response.locals.authorizationBundle;
    }
    if (utility.isExist(response?.locals?.publicKey))
    {
      responseData.key = response.locals.publicKey;
    }

    if (!utility.isInitialized(responseData))
    {
      responseData = undefined;
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
      const {statusCode, code, message} = httpError;

      response.status(statusCode).json({code, message});
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
