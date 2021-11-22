const {
  InvalidArgumentsError,
  StaticClassInstantiationError
} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");

const _ = require("lodash");

/**
 * Validates.
 * Methods which named `validate`, throws exception if validation is not successful.
 * Methods which named `isValid`, returns the result of validation.
 */
class Validator
{
  /**
   * Static classes must not be instantiated.
   */
  constructor ()
  {
    throw new StaticClassInstantiationError("Validator");
  }

  /**** Cell ****/
  /**
   * @param {Object} config
   * @param {Object} [config.server]
   * @param {boolean} config.server.isEnabled
   * @param {Object} [config.server.options]
   * @param {Object} config.server.options.http
   * @param {boolean} config.server.options.http.isEnabled
   * @param {Object} [config.server.options.http.config]
   * @param {number} config.server.options.http.config.port
   * @param {Object} config.server.options.https
   * @param {boolean} config.server.options.https.isEnabled
   * @param {Object} [config.server.options.https.config]
   * @param {number} config.server.options.https.config.port
   * @param {Object} config.server.options.https.config.sslTlsCertificate
   * @param {string} config.server.options.https.config.sslTlsCertificate.key
   * @param {string} config.server.options.https.config.sslTlsCertificate.cert
   * @param {string} config.server.options.https.config.sslTlsCertificate.ca
   * @param {Object} [config.db]
   * @param {Object} config.db.connection
   * @param {string} config.db.connection.uri
   * @param {Object} [config.db.connection.options]
   * @param {Object} [config.interceptors]
   * @param {Object} [config.interceptors.init]
   * @param {string} config.interceptors.init.path
   * @param {Object} [config.interceptors.dbConnection]
   * @param {string} config.interceptors.dbConnection.path
   * @param {Object} [config.interceptors.app]
   * @param {string} config.interceptors.app.path
   * @param {Object} [config.interceptors.final]
   * @param {string} config.interceptors.final.path
   * @param {Object} [config.errors]
   * @public
   */
  static validateParameterConfig (config)
  {
    if (!_.isPlainObject(config))
    {
      throw new InvalidArgumentsError();
    }

    if (utility.isExist(config.server) &&
        (
          !_.isPlainObject(config.server) ||
          !_.isBoolean(config.server.isEnabled) ||
          (config.server.isEnabled && !utility.isExist(config.server.options)) ||
          (utility.isExist(config.server.options) && !_.isPlainObject(config.server.options)) // further validations for `config.server.options` is done in `Server`.
        )
    )
    {
      throw new InvalidArgumentsError();
    }

    if (utility.isExist(config.db) &&
        (
          !_.isPlainObject(config.db) ||
          !_.isPlainObject(config.db.connection) ||
          !_.isString(config.db.connection.uri) ||
          (utility.isExist(config.db.connection.options) && !_.isPlainObject(config.db.connection.options)) // further validations for `config.db.connection.options` is not done.
        )
    )
    {
      throw new InvalidArgumentsError();
    }

    if (utility.isExist(config.interceptors) &&
        (
          !_.isPlainObject(config.interceptors) ||
          (utility.isExist(config.interceptors.init) && (!_.isPlainObject(config.interceptors.init) && !_.isString(config.interceptors.init.path))) ||
          (utility.isExist(config.interceptors.app) && (!_.isPlainObject(config.interceptors.app) && !_.isString(config.interceptors.app.path))) ||
          (utility.isExist(config.interceptors.dbConnection) && (!_.isPlainObject(config.interceptors.dbConnection) && !_.isString(config.interceptors.dbConnection.path))) ||
          (utility.isExist(config.interceptors.final) && (!_.isPlainObject(config.interceptors.final) && !_.isString(config.interceptors.final.path)))
        )
    )
    {
      throw new InvalidArgumentsError();
    }

    if (utility.isExist(config.errors) && !_.isPlainObject(config.errors))
    {
      throw new InvalidArgumentsError();
    }
  }

  /**** Class Types ****/
  /**
   * @param {ApplicationService} applicationService
   * @returns {boolean}
   * @public
   */
  static isValidParameterApplicationService (applicationService)
  {
    return applicationService instanceof ApplicationService;
  }

  /**
   * @param {CrudController} crudController
   * @returns {boolean}
   * @public
   */
  static isValidParameterCrudController (crudController)
  {
    return crudController instanceof CrudController;
  }

  /**** Router ****/
  /**
   * @typedef {{[required]: Array<string>, [optional]: Array<string>} | string} AllowedProperties
   * @typedef {{[headers]: AllowedProperties, [pathParameters]: AllowedProperties, [queryString]: AllowedProperties, [body]: AllowedProperties}} AllowedPropertiesForRequestElements
   * @typedef {{[isEnabled]: boolean, [allowedPropertiesForRequestElements]: AllowedPropertiesForRequestElements}} RouteDefinition
   * @param {{[READ]: RouteDefinition, [READ_ONE_BY_ID]: RouteDefinition, [CREATE_ONE]: RouteDefinition, [UPDATE_ONE_BY_ID_AND_VERSION]: RouteDefinition, [REPLACE_ONE_BY_ID_AND_VERSION]: RouteDefinition, [SOFT_DELETE_ONE_BY_ID_AND_VERSION]: RouteDefinition, [DELETE_ONE_BY_ID_AND_VERSION]: RouteDefinition}} routesDefinitions - Represents route definitions where each contains enabled status and allowed properties for request elements.
   * @returns {boolean}
   * @public
   */
  static isValidParameterRoutesDefinitions (routesDefinitions)
  {
    if (!_.isPlainObject(routesDefinitions))
    {
      return false;
    }

    const routeNames = Object.keys(routesDefinitions);

    for (const routeName of routeNames)
    {
      if (!Router.ALLOWED_ROUTE_NAMES.includes(routeName))
      {
        return false;
      }

      const routeDefinition = routesDefinitions[routeName];
      const {isEnabled, allowedPropertiesForRequestElements} = routeDefinition;

      if (utility.isExist(isEnabled) && !_.isBoolean(isEnabled))
      {
        return false;
      }

      if (utility.isExist(allowedPropertiesForRequestElements) && !Validator.isValidParameterAllowedPropertiesForRequestElements(allowedPropertiesForRequestElements))
      {
        return false;
      }
    }

    return true;
  }

  /**
   * @typedef {{[required]: Array<string>, [optional]: Array<string>} | string} AllowedProperties
   * @param {{[headers]: AllowedProperties, [pathParameters]: AllowedProperties, [queryString]: AllowedProperties, [body]: AllowedProperties}} allowedPropertiesForRequestElements
   * @returns {boolean}
   * @public
   */
  static isValidParameterAllowedPropertiesForRequestElements (allowedPropertiesForRequestElements)
  {
    if (!_.isPlainObject(allowedPropertiesForRequestElements))
    {
      return false;
    }

    for (const requestElement in allowedPropertiesForRequestElements)
    {
      switch (requestElement)
      {
        case "headers":
        case "pathParameters":
        case "queryString":
        {
          const allowedProperties = allowedPropertiesForRequestElements[requestElement];

          if (utility.isExist(allowedProperties) && !Validator.isValidParameterAllowedProperties(allowedProperties))
          {
            return false;
          }

          break;
        }
        case "body":
        {
          const propertyDefinition = allowedPropertiesForRequestElements[requestElement];

          if (utility.isExist(propertyDefinition) && !Validator.isValidParameterPropertyDefinition(propertyDefinition))
          {
            return false;
          }

          break;
        }
        default:
        {
          return false; // not allowed request element.
        }
      }
    }

    return true;
  }

  /**
   * @param {{[required]: Array<string>, [optional]: Array<string>} | string} allowedProperties
   * @returns {boolean}
   * @public
   */
  static isValidParameterAllowedProperties (allowedProperties)
  {
    const isPlainObject = _.isPlainObject(allowedProperties);
    const isString = _.isString(allowedProperties);

    if (isPlainObject)
    {
      let isAtLeastOneTypeIsInitialized = false;
      const duplicateCheck = [];
      const ALLOWED_TYPES = ["required", "optional"]; // todo should it be moved to a static variable?

      for (const type in allowedProperties)
      {
        if (!ALLOWED_TYPES.includes(type))
        {
          return false;
        }

        if (utility.isInitialized(allowedProperties[type]))
        {
          isAtLeastOneTypeIsInitialized = true;

          for (const allowedProperty of allowedProperties[type])
          {
            if (!_.isString(allowedProperty) ||
                _.isEqual(allowedProperty, ""))
            {
              return false;
            }

            if (duplicateCheck.includes(allowedProperty))
            {
              return false;
            }
            else
            {
              duplicateCheck.push(allowedProperty);
            }
          }
        }
      }

      if (!isAtLeastOneTypeIsInitialized)
      {
        return false;
      }
    }
    else if (isString)
    {
      if (!utility.isValidEnumValue(allowedProperties, Controller.SPECIAL_ALLOWED_PROPERTY))
      {
        return false;
      }
    }
    else
    {
      return false;
    }

    return true;
  }

  /**
   * @typedef {{[]: string | PropertyDefinition} | Array<{[]: string | PropertyDefinition}>} PropertyDefinition
   * @param {PropertyDefinition} propertyDefinition
   * @returns {boolean}
   * @public
   */
  static isValidParameterPropertyDefinition (propertyDefinition)
  {
    const isString = _.isString(propertyDefinition);
    const isPlainObject = _.isPlainObject(propertyDefinition);
    const isArray = _.isArray(propertyDefinition);

    if (isString)
    {
      // property definition is data type.
      return utility.isValidEnumValue(propertyDefinition, DataType);
    }
    else if (isPlainObject)
    {
      for (const key in propertyDefinition)
      {
        if (!Validator.isValidParameterPropertyDefinition(propertyDefinition[key]))
        {
          return false;
        }
      }
    }
    else if (isArray)
    {
      // property definition must be the one and only item in array.
      if (propertyDefinition.length !== 1)
      {
        return false;
      }

      if (!Validator.isValidParameterPropertyDefinition(propertyDefinition[0]))
      {
        return false;
      }
    }
    else
    {
      return false;
    }

    return true;
  }

  /**
   * @param {{[READ]: Array<Function>, [READ_ONE_BY_ID]: Array<Function>, [CREATE_ONE]: Array<Function>, [UPDATE_ONE_BY_ID_AND_VERSION]: Array<Function>, [REPLACE_ONE_BY_ID_AND_VERSION]: Array<Function>, [SOFT_DELETE_ONE_BY_ID_AND_VERSION]: Array<Function>, [DELETE_ONE_BY_ID_AND_VERSION]: Array<Function>}} extraVerificationFunctions
   * @returns {boolean}
   * @public
   */
  static isValidParameterExtraVerificationFunctions (extraVerificationFunctions)
  {
    if (!_.isPlainObject(extraVerificationFunctions))
    {
      return false;
    }

    const routeNames = Object.keys(extraVerificationFunctions);

    for (const routeName of routeNames)
    {
      if (!Router.ALLOWED_ROUTE_NAMES.includes(routeName))
      {
        return false;
      }

      const extraVerificationFunctionsOfRoute = extraVerificationFunctions[routeName];

      if (!_.isArray(extraVerificationFunctionsOfRoute))
      {
        return false;
      }

      for (const extraVerificationFunction of extraVerificationFunctionsOfRoute)
      {
        if (!_.isFunction(extraVerificationFunction))
        {
          return false;
        }
      }
    }

    return true;
  }

  /**** CrudController ****/
  /**
   * @param {Object} request
   * @returns {boolean}
   * @public
   */
  static isValidParameterRequest (request)
  {
    return _.isObject(request);
  }

  /**
   * @param {Object} response
   * @returns {boolean}
   * @public
   */
  static isValidParameterResponse (response)
  {
    return _.isObject(response);
  }

  /**
   * @param {Function} next
   * @returns {boolean}
   * @public
   */
  static isValidParameterNext (next)
  {
    return _.isFunction(next);
  }

  /**
   * todo a more detailed validation is needed.
   * @param {Object} hooks
   * @returns {boolean}
   * @public
   */
  static isValidParameterHooks (hooks)
  {
    return _.isPlainObject(hooks);
  }

  /**
   * @param {Object} request
   * @param {Object} response
   * @param {Function} next
   * @param {Object} hooks
   * @typedef {{[required]: Array<string>, [optional]: Array<string>} | string} AllowedProperties
   * @param {{[headers]: AllowedProperties, [pathParameters]: AllowedProperties, [queryString]: AllowedProperties, [body]: AllowedProperties}} allowedPropertiesForRequestElements
   * @returns {boolean}
   */
  static isValidRouteFacingControllerMethodParameters (request, response, next, hooks, allowedPropertiesForRequestElements)
  {
    return Validator.isValidParameterRequest(request) &&
           Validator.isValidParameterResponse(response) &&
           (!utility.isExist(next) || Validator.isValidParameterNext(next)) &&
           (!utility.isExist(hooks) || Validator.isValidParameterHooks(hooks)) &&
           (!utility.isExist(allowedPropertiesForRequestElements) || Validator.isValidParameterAllowedPropertiesForRequestElements(allowedPropertiesForRequestElements));
  }
}

module.exports = Validator;

const ApplicationService = require("../services/ApplicationService");
const Controller = require("../core/Controller");
const CrudController = require("../controllers/CrudController");
const Router = require("../core/Router");
const DataType = require("../core/DataType.json");
