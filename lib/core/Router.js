const {
  InvalidArgumentsError,
  StaticClassInstantiationError
} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");

const _ = require("lodash");
const express = require("express");

const ErrorSafe = require("../safes/ErrorSafe");
const AuthController = require("../controllers/AuthController");
const CrudController = require("../controllers/CrudController");

/**
 * Generates routes.
 *
 * @static
 */
class Router
{
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
   * @param {boolean} [options.caseSensitive] - Enables case sensitivity which means when true /xyz and /Xyz are treated differently.
   * @param {boolean} [options.mergeParams] - Preserves the route parameter values from the parent route. If the parent and the child routes have conflicting parameter names, the child route’s value take precedence.
   * @param {boolean} [options.strict] - Enables strict routing which means when true /xyz and /xyz/ are treated differently.
   * @return {express.Router} - The created router.
   * @public
   * @static
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
   * @param {Router.ROUTE_GENERATION_TYPE} routeGenerationType - If `STANDARD` is selected generates routes by using REST API design principals. If `POST_ONLY` is selected generates routes by using verbs with only POST.
   * @param {express.Router} router - Represents [Express router](https://expressjs.com/en/api.html#express.router).
   * @param {AuthController} [authController] - Represents authentication controller. If provided, the route uses the authentication controller's method `verifyPrivate`. If not provided, the route uses the controller's method `verifyPublic`.
   * @param {CrudController} crudController - Represents CRUD controller.
   * @param {{[READ]: boolean, [READ_ONE_BY_ID]: boolean, [CREATE_ONE]: boolean, [UPDATE_ONE_BY_ID_AND_VERSION]: boolean, [REPLACE_ONE_BY_ID_AND_VERSION]: boolean, [SOFT_DELETE_ONE_BY_ID_AND_VERSION]: boolean, [DELETE_ONE_BY_ID_AND_VERSION]: boolean}} routes - Represents enabled routes which contains route names as keys and enable/disable status as values.
   * @param {{[READ]: Array<Function>, [READ_ONE_BY_ID]: Array<Function>, [CREATE_ONE]: Array<Function>, [UPDATE_ONE_BY_ID_AND_VERSION]: Array<Function>, [REPLACE_ONE_BY_ID_AND_VERSION]: Array<Function>, [SOFT_DELETE_ONE_BY_ID_AND_VERSION]: Array<Function>, [DELETE_ONE_BY_ID_AND_VERSION]: Array<Function>}} [extraVerificationFunctions] - Represents extra verification functions names which contains route names as keys and array of functions as values. If provided, the corresponding routes use the corresponding functions after `verifyPrivate` or `verifyPublic`. If more than one function is provided, functions are used in the order in which they are provided.
   * @public
   * @static
   */
  static generateRoutes (routeGenerationType, router, authController, crudController, routes, extraVerificationFunctions = undefined)
  {
    if (!Router._isValidParameterRouter(router) ||
        (utility.isExist(authController) && !Router._isValidParameterAuthController(authController)) ||
        !Router._isValidParameterCrudController(crudController) ||
        !Router._isValidParameterRoutes(routes) ||
        (utility.isExist(extraVerificationFunctions) && !Router._isValidParameterExtraVerificationFunctions(extraVerificationFunctions)) ||
        !utility.isValidEnumValue(routeGenerationType, Router.ROUTE_GENERATION_TYPE))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    if (routeGenerationType === Router.ROUTE_GENERATION_TYPE.STANDARD)
    {
      // since both the routes `SOFT_DELETE_ONE_BY_ID_AND_VERSION` and `DELETE_ONE_BY_ID_AND_VERSION` use the same HTTP method and route paths, they cannot be used together.
      if (utility.isExist(routes.SOFT_DELETE_ONE_BY_ID_AND_VERSION) &&
          utility.isExist(routes.DELETE_ONE_BY_ID_AND_VERSION) &&
          routes.SOFT_DELETE_ONE_BY_ID_AND_VERSION === routes.DELETE_ONE_BY_ID_AND_VERSION)
      {
        throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
      }
    }

    for (const routeName in routes)
    {
      if (routes[routeName])
      {
        const crudMethodName = Router.ROUTE_NAME_2_CRUD_CONTROLLER_METHOD_NAME_MAP[routeName];
        let routePath, httpMethodName;

        switch (routeGenerationType)
        {
          case Router.ROUTE_GENERATION_TYPE.STANDARD:
          {
            routePath = Router.ROUTE_NAME_2_ROUTE_PATH_MAP[routeName];
            httpMethodName = Router.ROUTE_NAME_2_HTTP_METHOD_MAP[routeName];
            break;
          }
          case Router.ROUTE_GENERATION_TYPE.POST_ONLY:
          {
            routePath = crudMethodName;
            httpMethodName = "post";
            break;
          }
        }

        if (utility.isExist(authController))
        {
          router.route(routePath)[httpMethodName]((request, response, next) => authController.verifyPrivate(request, response, next));
        }
        else
        {
          router.route(routePath)[httpMethodName]((request, response, next) => crudController.verifyPublic(request, response, next));
        }

        if (utility.isExist(extraVerificationFunctions) && utility.isExist(extraVerificationFunctions[routeName]))
        {
          for (const extraVerificationFunction of extraVerificationFunctions[routeName])
          {
            router.route(routePath)[httpMethodName]((request, response, next) => extraVerificationFunction(request, response, next));
          }
        }

        router.route(routePath)[httpMethodName]((request, response) => crudController[crudMethodName](request, response));
      }
    }
  }

  /**** VALIDATE PARAMETERS ****/
  /**
   * Checks if the parameter `router` is valid.
   *
   * @param {express.Router} router
   * @private
   * @static
   */
  static _isValidParameterRouter (router)
  {
    return _.isFunction(router);
  }

  /**
   * Checks if the parameter `authController` is valid.
   *
   * @param {AuthController} authController
   * @private
   * @static
   */
  static _isValidParameterAuthController (authController)
  {
    return authController instanceof AuthController;
  }

  /**
   * Checks if the parameter `crudController` is valid.
   *
   * @param {CrudController} crudController
   * @private
   * @static
   */
  static _isValidParameterCrudController (crudController)
  {
    return crudController instanceof CrudController;
  }

  /**
   * Checks if the parameter `routes` is valid.
   *
   * @param {{[READ]: boolean, [READ_ONE_BY_ID]: boolean, [CREATE_ONE]: boolean, [UPDATE_ONE_BY_ID_AND_VERSION]: boolean, [REPLACE_ONE_BY_ID_AND_VERSION]: boolean, [SOFT_DELETE_ONE_BY_ID_AND_VERSION]: boolean, [DELETE_ONE_BY_ID_AND_VERSION]: boolean}} routes
   * @private
   * @static
   */
  static _isValidParameterRoutes (routes)
  {
    if (!_.isPlainObject(routes))
    {
      return false;
    }

    const routeNames = Object.keys(routes);

    for (const routeName of routeNames)
    {
      if (!Router.ROUTE_NAMES.includes(routeName))
      {
        return false;
      }

      const isRouteEnabled = routes[routeName];

      if (!_.isBoolean(isRouteEnabled))
      {
        return false;
      }
    }

    return true;
  }

  /**
   * Checks if the parameter `extraVerificationFunctions` is valid.
   *
   * @param {{[READ]: Array<Function>, [READ_ONE_BY_ID]: Array<Function>, [CREATE_ONE]: Array<Function>, [UPDATE_ONE_BY_ID_AND_VERSION]: Array<Function>, [REPLACE_ONE_BY_ID_AND_VERSION]: Array<Function>, [SOFT_DELETE_ONE_BY_ID_AND_VERSION]: Array<Function>, [DELETE_ONE_BY_ID_AND_VERSION]: Array<Function>}} extraVerificationFunctions
   * @private
   * @static
   */
  static _isValidParameterExtraVerificationFunctions (extraVerificationFunctions)
  {
    if (!_.isPlainObject(extraVerificationFunctions))
    {
      return false;
    }

    const routeNames = Object.keys(extraVerificationFunctions);

    for (const routeName of routeNames)
    {
      if (!Router.ROUTE_NAMES.includes(routeName))
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

  /**** VARIABLES ****/
  /**
   * Route generation type enum.
   *
   * @type {{POST_ONLY: string, STANDARD: string}}
   * @enum
   * @public
   * @static
   */
  static ROUTE_GENERATION_TYPE = {
    "STANDARD": "STANDARD",
    "POST_ONLY": "POST_ONLY"
  };

  /**
   * Route names that each corresponds to a CRUD controller method.
   *
   * @type {Array<string>}
   * @public
   * @static
   */
  static ROUTE_NAMES = [
    "READ",
    "READ_ONE_BY_ID",
    "CREATE_ONE",
    "UPDATE_ONE_BY_ID_AND_VERSION",
    "REPLACE_ONE_BY_ID_AND_VERSION",
    "SOFT_DELETE_ONE_BY_ID_AND_VERSION",
    "DELETE_ONE_BY_ID_AND_VERSION"
  ];

  /**
   * Maps route names to route paths.
   *
   * @type {{READ: string, READ_ONE_BY_ID: string, CREATE_ONE: string, UPDATE_ONE_BY_ID_AND_VERSION: string, REPLACE_ONE_BY_ID_AND_VERSION: string, SOFT_DELETE_ONE_BY_ID_AND_VERSION: string, DELETE_ONE_BY_ID_AND_VERSION: string}}
   * @public
   * @static
   */
  static ROUTE_NAME_2_ROUTE_PATH_MAP = {
    READ: "",
    READ_ONE_BY_ID: "/:_id",
    CREATE_ONE: "",
    UPDATE_ONE_BY_ID_AND_VERSION: "/:_id",
    REPLACE_ONE_BY_ID_AND_VERSION: "/:_id",
    SOFT_DELETE_ONE_BY_ID_AND_VERSION: "/:_id",
    DELETE_ONE_BY_ID_AND_VERSION: "/:_id"
  };

  /**
   * Maps route names to HTTP methods.
   *
   * @type {{READ: string, READ_ONE_BY_ID: string, CREATE_ONE: string, UPDATE_ONE_BY_ID_AND_VERSION: string, REPLACE_ONE_BY_ID_AND_VERSION: string, SOFT_DELETE_ONE_BY_ID_AND_VERSION: string, DELETE_ONE_BY_ID_AND_VERSION: string}}
   * @public
   * @static
   */
  static ROUTE_NAME_2_HTTP_METHOD_MAP = {
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
   * @public
   * @static
   */
  static ROUTE_NAME_2_CRUD_CONTROLLER_METHOD_NAME_MAP = {
    READ: "read",
    READ_ONE_BY_ID: "readOneById",
    CREATE_ONE: "createOne",
    UPDATE_ONE_BY_ID_AND_VERSION: "updateOneById",
    REPLACE_ONE_BY_ID_AND_VERSION: "replaceOneById",
    SOFT_DELETE_ONE_BY_ID_AND_VERSION: "softDeleteOneById",
    DELETE_ONE_BY_ID_AND_VERSION: "deleteOneById"
  };

  /**
   * Default options for router.
   *
   * @type {{caseSensitive: boolean, mergeParams: boolean, strict: boolean}}
   * @private
   * @static
   */
  static _DEFAULT_ROUTER_OPTIONS = {
    caseSensitive: true,
    mergeParams: true,
    strict: false
  };
}

module.exports = Router;
