const {
  InvalidArgumentsError,
  StaticClassInstantiationError
} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");

const _ = require("lodash");
const express = require("express");

const ErrorSafe = require("../safes/ErrorSafe");
const Controller = require("../core/Controller");
const Validator = require("../helpers/Validator");

/**
 * Responsible from API routes.
 */
class Router
{
  /**
   * Represents allowed route names.
   *
   * @type {Array<string>}
   * @public
   */
  static ALLOWED_ROUTE_NAMES = [
    "READ",
    "READ_ONE_BY_ID",
    "CREATE_ONE",
    "UPDATE_ONE_BY_ID_AND_VERSION",
    "REPLACE_ONE_BY_ID_AND_VERSION",
    "SOFT_DELETE_ONE_BY_ID_AND_VERSION",
    "DELETE_ONE_BY_ID_AND_VERSION"
  ];

  /**
   * Represents default options for router.
   *
   * @type {{caseSensitive: boolean, mergeParams: boolean, strict: boolean}}
   * @private
   */
  static _DEFAULT_ROUTER_OPTIONS = {
    caseSensitive: true,
    mergeParams: true,
    strict: false
  };

  /**
   * Maps route names to REST route paths.
   *
   * @type {{READ: string, READ_ONE_BY_ID: string, CREATE_ONE: string, UPDATE_ONE_BY_ID_AND_VERSION: string, REPLACE_ONE_BY_ID_AND_VERSION: string, SOFT_DELETE_ONE_BY_ID_AND_VERSION: string, DELETE_ONE_BY_ID_AND_VERSION: string}}
   * @private
   */
  static _REST_ROUTE_PATH = {
    READ: "",
    READ_ONE_BY_ID: "/:_id",
    CREATE_ONE: "",
    UPDATE_ONE_BY_ID_AND_VERSION: "/:_id",
    REPLACE_ONE_BY_ID_AND_VERSION: "/:_id",
    SOFT_DELETE_ONE_BY_ID_AND_VERSION: "/:_id",
    DELETE_ONE_BY_ID_AND_VERSION: "/:_id"
  };

  /**
   * Maps route names to REST HTTP methods names.
   *
   * @type {{READ: string, READ_ONE_BY_ID: string, CREATE_ONE: string, UPDATE_ONE_BY_ID_AND_VERSION: string, REPLACE_ONE_BY_ID_AND_VERSION: string, SOFT_DELETE_ONE_BY_ID_AND_VERSION: string, DELETE_ONE_BY_ID_AND_VERSION: string}}
   * @private
   */
  static _REST_HTTP_METHOD_NAME = {
    READ: "get",
    READ_ONE_BY_ID: "get",
    CREATE_ONE: "post",
    UPDATE_ONE_BY_ID_AND_VERSION: "patch",
    REPLACE_ONE_BY_ID_AND_VERSION: "put",
    SOFT_DELETE_ONE_BY_ID_AND_VERSION: "delete",
    DELETE_ONE_BY_ID_AND_VERSION: "delete"
  };

  /**
   * Maps route names to CRUD controller method names.
   *
   * @type {{READ: string, READ_ONE_BY_ID: string, CREATE_ONE: string, UPDATE_ONE_BY_ID_AND_VERSION: string, REPLACE_ONE_BY_ID_AND_VERSION: string, SOFT_DELETE_ONE_BY_ID_AND_VERSION: string, DELETE_ONE_BY_ID_AND_VERSION: string}}
   * @private
   */
  static _CRUD_CONTROLLER_METHOD_NAME = {
    READ: "read",
    READ_ONE_BY_ID: "readOneById",
    CREATE_ONE: "createOne",
    UPDATE_ONE_BY_ID_AND_VERSION: "updateOneById",
    REPLACE_ONE_BY_ID_AND_VERSION: "replaceOneById",
    SOFT_DELETE_ONE_BY_ID_AND_VERSION: "softDeleteOneById",
    DELETE_ONE_BY_ID_AND_VERSION: "deleteOneById"
  };

  /**
   * Static classes must not be instantiated.
   */
  constructor ()
  {
    throw new StaticClassInstantiationError("Router");
  }

  /**
   * Creates an [Express router](https://expressjs.com/en/api.html#express.router) with the specified options.
   *
   * @param {Object} [options] - Specifies the behavior of the router.
   * @param {boolean} [options.caseSensitive] - Enables case sensitivity. Default is `true`. (e.g. If `true`, route `/xyz` and `/Xyz` are treated differently.)
   * @param {boolean} [options.mergeParams] - Preserves the route parameter values from the parent route. If the parent and the child routes have conflicting parameter names, the child route’s value take precedence. Default is `true`.
   * @param {boolean} [options.strict] - Enables strict routing. Default is `false`. (e.g. If `true`, `/xyz` and `/xyz/` are treated differently.)
   * @return {express.Router} - The created router.
   * @public
   */
  static createRouter (options = undefined)
  {
    options = utility.init(options, Router._DEFAULT_ROUTER_OPTIONS);

    if (!_.isPlainObject(options))
    {
      throw new InvalidArgumentsError;
    }

    return express.Router(options);
  }

  /**
   * Generates routes for CRUD controller.
   *
   * @param {express.Router} router - Represents [Express router](https://expressjs.com/en/api.html#express.router).
   * @param {{[READ]: RouteDefinition, [READ_ONE_BY_ID]: RouteDefinition, [CREATE_ONE]: RouteDefinition, [UPDATE_ONE_BY_ID_AND_VERSION]: RouteDefinition, [REPLACE_ONE_BY_ID_AND_VERSION]: RouteDefinition, [SOFT_DELETE_ONE_BY_ID_AND_VERSION]: RouteDefinition, [DELETE_ONE_BY_ID_AND_VERSION]: RouteDefinition}} routesDefinitions - Represents route definitions where each contains enabled status and allowed properties for request elements.
   * @param {CrudController} crudController - Represents CRUD controller.
   * @param {Function} verify - Represents verification function (`verifyPublic` or `verifyPrivate`) of an AUTH controller.
   * @typedef {{[required]: Array<string>, [optional]: Array<string>} | string} AllowedProperties
   * @typedef {{[headers]: AllowedProperties, [pathParameters]: AllowedProperties, [queryString]: AllowedProperties, [body]: AllowedProperties}} AllowedPropertiesForRequestElements
   * @typedef {{[isEnabled]: boolean, [allowedPropertiesForRequestElements]: AllowedPropertiesForRequestElements}} RouteDefinition
   * @param {{[READ]: Array<Function>, [READ_ONE_BY_ID]: Array<Function>, [CREATE_ONE]: Array<Function>, [UPDATE_ONE_BY_ID_AND_VERSION]: Array<Function>, [REPLACE_ONE_BY_ID_AND_VERSION]: Array<Function>, [SOFT_DELETE_ONE_BY_ID_AND_VERSION]: Array<Function>, [DELETE_ONE_BY_ID_AND_VERSION]: Array<Function>}} [extraVerificationFunctions] - Represents extra verification functions names which contains route names as keys and array of functions as values. If provided, the corresponding routes use the corresponding functions after `verify`. If more than one function is provided, functions are used in the order in which they are provided.
   * @public
   */
  static generateRoutes (router, routesDefinitions, crudController, verify, extraVerificationFunctions = undefined)
  {
    if (!_.isFunction(router) ||
        !Validator.isValidParameterRoutesDefinitions(routesDefinitions) ||
        !Validator.isValidParameterCrudController(crudController) ||
        !_.isFunction(verify) ||
        (utility.isExist(extraVerificationFunctions) && !Validator.isValidParameterExtraVerificationFunctions(extraVerificationFunctions)))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    const apiType = crudController.apiType;

    if (apiType === Controller.API_TYPE.REST)
    {
      // since both the routes `SOFT_DELETE_ONE_BY_ID_AND_VERSION` and `DELETE_ONE_BY_ID_AND_VERSION` use the same HTTP method and route paths, they cannot be used together.
      if (utility.isExist(routesDefinitions.SOFT_DELETE_ONE_BY_ID_AND_VERSION) &&
          utility.isExist(routesDefinitions.DELETE_ONE_BY_ID_AND_VERSION) &&
          routesDefinitions.SOFT_DELETE_ONE_BY_ID_AND_VERSION.isEnabled && routesDefinitions.DELETE_ONE_BY_ID_AND_VERSION.isEnabled)
      {
        throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
      }
    }

    for (const routeName in routesDefinitions)
    {
      const routeDefinition = routesDefinitions[routeName];

      if (routeDefinition.isEnabled)
      {
        const crudControllerMethodName = Router._CRUD_CONTROLLER_METHOD_NAME[routeName];
        let routePath, httpMethodName;

        switch (apiType)
        {
          case Controller.API_TYPE.REST:
          {
            routePath = Router._REST_ROUTE_PATH[routeName];
            httpMethodName = Router._REST_HTTP_METHOD_NAME[routeName];
            break;
          }
          case Controller.API_TYPE.NON_REST:
          {
            routePath = crudControllerMethodName;
            httpMethodName = "post";
            break;
          }
        }

        router.route(routePath)[httpMethodName]((request, response, next) => verify(request, response, next));

        if (utility.isExist(extraVerificationFunctions) && utility.isExist(extraVerificationFunctions[routeName]))
        {
          for (const extraVerificationFunction of extraVerificationFunctions[routeName])
          {
            router.route(routePath)[httpMethodName]((request, response, next) => extraVerificationFunction(request, response, next));
          }
        }

        router.route(routePath)[httpMethodName]((request, response, next) => crudController[crudControllerMethodName](request, response, next, null, routeDefinition.allowedPropertiesForRequestElements));
      }
    }
  }
}

module.exports = Router;
