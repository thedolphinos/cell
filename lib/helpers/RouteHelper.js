const {InvalidArgumentsError, StaticClassInstantiationError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");
const express = require("express");

const ErrorSafe = require("../safes/ErrorSafe");
const AuthController = require("../controllers/AuthController");
const CrudController = require("../controllers/CrudController");

/**
 * Contains helper methods for routes.
 */
class RouteHelper
{
  /**
   * Static classes must not be instantiated.
   */
  constructor ()
  {
    throw new StaticClassInstantiationError("RouteHelper");
  }

  /**
   * Creates a router with the specified configurations.
   *
   * @param {Object} config - See: https://expressjs.com/en/api.html
   * @return {express.Router}
   */
  static createRouter (config = RouteHelper.DEFAULT_ROUTER_OPTIONS)
  {
    if (!_.isPlainObject(config))
    {
      throw new InvalidArgumentsError;
    }

    return express.Router(config);
  }

  /**
   * Generates routes for CRUD controller.
   *
   * @param {express.Router} router
   * @param {AuthController} authController
   * @param {CrudController} controller
   * @param {Object} routes
   * @param {string} [routes.READ]
   * @param {string} [routes.READ_ONE_BY_ID]
   * @param {string} [routes.CREATE_ONE]
   * @param {string} [routes.UPDATE_ONE_BY_ID_AND_VERSION]
   * @param {string} [routes.SOFT_DELETE_ONE_BY_ID_AND_VERSION]
   * @param {string} [routes.DELETE_ONE_BY_ID_AND_VERSION]
   * @param {Object} [extraVerificationFunctionNames]
   */
  static generateRoutes (router, authController, controller, routes, extraVerificationFunctionNames)
  {
    if (!_.isFunction(router) ||
        (utility.isExist(authController) && !(authController instanceof AuthController)) ||
        !(controller instanceof CrudController) ||
        !_.isPlainObject(routes) ||
        (utility.isExist(extraVerificationFunctionNames) && !_.isPlainObject(extraVerificationFunctionNames)))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    const routeNames = Object.keys(routes);

    for (let i = 0; i < routeNames.length; i++)
    {
      const routeName = routeNames[i];
      const routePath = routes[routeName];

      if (!utility.isExist(RouteHelper.ROUTE_NAME[routeName]) || !utility.isExist(routePath))
      {
        throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
      }
    }

    if (utility.isInitialized(routes.SOFT_DELETE_ONE_BY_ID_AND_VERSION) &&
        utility.isInitialized(routes.DELETE_ONE_BY_ID_AND_VERSION) &&
        routes.SOFT_DELETE_ONE_BY_ID_AND_VERSION === routes.DELETE_ONE_BY_ID_AND_VERSION)
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    if (routeNames.includes(RouteHelper.ROUTE_NAME.READ))
    {
      if (utility.isExist(authController))
      {
        router.route(routes.READ).get((request, response, next) => authController.verifyPrivate(request, response, next));

        if (utility.isExist(extraVerificationFunctionNames) && utility.isExist(extraVerificationFunctionNames.READ))
        {
          if (!_.isArray(extraVerificationFunctionNames.READ))
          {
            throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
          }

          for (const extraVerificationFunctionName of extraVerificationFunctionNames.READ)
          {
            if (!_.isFunction(authController[extraVerificationFunctionName]))
            {
              throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
            }

            router.route(routes.READ).get((request, response, next) => authController[extraVerificationFunctionName](request, response, next));
          }
        }
      }
      else
      {
        router.route(routes.READ).get((request, response, next) => controller.verifyPublic(request, response, next));
      }

      router.route(routes.READ).get((request, response) => controller.read(request, response));
    }

    if (routeNames.includes(RouteHelper.ROUTE_NAME.READ_ONE_BY_ID))
    {
      if (utility.isExist(authController))
      {
        router.route(routes.READ_ONE_BY_ID).get((request, response, next) => authController.verifyPrivate(request, response, next));

        if (utility.isExist(extraVerificationFunctionNames) && utility.isExist(extraVerificationFunctionNames.READ_ONE_BY_ID))
        {
          if (!_.isArray(extraVerificationFunctionNames.READ_ONE_BY_ID))
          {
            throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
          }

          for (const extraVerificationFunctionName of extraVerificationFunctionNames.READ_ONE_BY_ID)
          {
            if (!_.isFunction(authController[extraVerificationFunctionName]))
            {
              throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
            }

            router.route(routes.READ_ONE_BY_ID).get((request, response, next) => authController[extraVerificationFunctionName](request, response, next));
          }
        }
      }
      else
      {
        router.route(routes.READ_ONE_BY_ID).get((request, response, next) => controller.verifyPublic(request, response, next));
      }

      router.route(routes.READ_ONE_BY_ID).get((request, response) => controller.readOneById(request, response));
    }

    if (routeNames.includes(RouteHelper.ROUTE_NAME.CREATE_ONE))
    {
      if (utility.isExist(authController))
      {
        router.route(routes.CREATE_ONE).post((request, response, next) => authController.verifyPrivate(request, response, next));

        if (utility.isExist(extraVerificationFunctionNames) && utility.isExist(extraVerificationFunctionNames.CREATE_ONE))
        {
          if (!_.isArray(extraVerificationFunctionNames.CREATE_ONE))
          {
            throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
          }

          for (const extraVerificationFunctionName of extraVerificationFunctionNames.CREATE_ONE)
          {
            if (!_.isFunction(authController[extraVerificationFunctionName]))
            {
              throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
            }

            router.route(routes.CREATE_ONE).post((request, response, next) => authController[extraVerificationFunctionName](request, response, next));
          }
        }
      }
      else
      {
        router.route(routes.CREATE_ONE).post((request, response, next) => controller.verifyPublic(request, response, next));
      }

      router.route(routes.CREATE_ONE).post((request, response) => controller.createOne(request, response));
    }

    if (routeNames.includes(RouteHelper.ROUTE_NAME.UPDATE_ONE_BY_ID_AND_VERSION))
    {
      if (utility.isExist(authController))
      {
        router.route(routes.UPDATE_ONE_BY_ID_AND_VERSION).patch((request, response, next) => authController.verifyPrivate(request, response, next));

        if (utility.isExist(extraVerificationFunctionNames) && utility.isExist(extraVerificationFunctionNames.UPDATE_ONE_BY_ID_AND_VERSION))
        {
          if (!_.isArray(extraVerificationFunctionNames.UPDATE_ONE_BY_ID_AND_VERSION))
          {
            throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
          }

          for (const extraVerificationFunctionName of extraVerificationFunctionNames.UPDATE_ONE_BY_ID_AND_VERSION)
          {
            if (!_.isFunction(authController[extraVerificationFunctionName]))
            {
              throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
            }

            router.route(routes.UPDATE_ONE_BY_ID_AND_VERSION).patch((request, response, next) => authController[extraVerificationFunctionName](request, response, next));
          }
        }
      }
      else
      {
        router.route(routes.UPDATE_ONE_BY_ID_AND_VERSION).patch((request, response, next) => controller.verifyPublic(request, response, next));
      }

      router.route(routes.UPDATE_ONE_BY_ID_AND_VERSION).patch((request, response) => controller.updateOneByIdAndVersion(request, response));
    }

    if (routeNames.includes(RouteHelper.ROUTE_NAME.REPLACE_ONE_BY_ID_AND_VERSION))
    {
      if (utility.isExist(authController))
      {
        router.route(routes.REPLACE_ONE_BY_ID_AND_VERSION).put((request, response, next) => authController.verifyPrivate(request, response, next));

        if (utility.isExist(extraVerificationFunctionNames) && utility.isExist(extraVerificationFunctionNames.REPLACE_ONE_BY_ID_AND_VERSION))
        {
          if (!_.isArray(extraVerificationFunctionNames.REPLACE_ONE_BY_ID_AND_VERSION))
          {
            throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
          }

          for (const extraVerificationFunctionName of extraVerificationFunctionNames.REPLACE_ONE_BY_ID_AND_VERSION)
          {
            if (!_.isFunction(authController[extraVerificationFunctionName]))
            {
              throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
            }

            router.route(routes.REPLACE_ONE_BY_ID_AND_VERSION).put((request, response, next) => authController[extraVerificationFunctionName](request, response, next));
          }
        }
      }
      else
      {
        router.route(routes.REPLACE_ONE_BY_ID_AND_VERSION).put((request, response, next) => controller.verifyPublic(request, response, next));
      }

      router.route(routes.REPLACE_ONE_BY_ID_AND_VERSION).put((request, response) => controller.replaceOneByIdAndVersion(request, response));
    }

    if (routeNames.includes(RouteHelper.ROUTE_NAME.SOFT_DELETE_ONE_BY_ID_AND_VERSION))
    {
      if (utility.isExist(authController))
      {
        router.route(routes.SOFT_DELETE_ONE_BY_ID_AND_VERSION).delete((request, response, next) => authController.verifyPrivate(request, response, next));

        if (utility.isExist(extraVerificationFunctionNames) && utility.isExist(extraVerificationFunctionNames.SOFT_DELETE_ONE_BY_ID_AND_VERSION))
        {
          if (!_.isArray(extraVerificationFunctionNames.SOFT_DELETE_ONE_BY_ID_AND_VERSION))
          {
            throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
          }

          for (const extraVerificationFunctionName of extraVerificationFunctionNames.SOFT_DELETE_ONE_BY_ID_AND_VERSION)
          {
            if (!_.isFunction(authController[extraVerificationFunctionName]))
            {
              throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
            }

            router.route(routes.SOFT_DELETE_ONE_BY_ID_AND_VERSION).delete((request, response, next) => authController[extraVerificationFunctionName](request, response, next));
          }
        }
      }
      else
      {
        router.route(routes.SOFT_DELETE_ONE_BY_ID_AND_VERSION).delete((request, response, next) => controller.verifyPublic(request, response, next));
      }

      router.route(routes.SOFT_DELETE_ONE_BY_ID_AND_VERSION).delete((request, response) => controller.softDeleteOneByIdAndVersion(request, response));
    }

    if (routeNames.includes(RouteHelper.ROUTE_NAME.DELETE_ONE_BY_ID_AND_VERSION))
    {
      if (utility.isExist(authController))
      {
        router.route(routes.DELETE_ONE_BY_ID_AND_VERSION).delete((request, response, next) => authController.verifyPrivate(request, response, next));

        if (utility.isExist(extraVerificationFunctionNames) && utility.isExist(extraVerificationFunctionNames.DELETE_ONE_BY_ID_AND_VERSION))
        {
          if (!_.isArray(extraVerificationFunctionNames.DELETE_ONE_BY_ID_AND_VERSION))
          {
            throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
          }

          for (const extraVerificationFunctionName of extraVerificationFunctionNames.DELETE_ONE_BY_ID_AND_VERSION)
          {
            if (!_.isFunction(authController[extraVerificationFunctionName]))
            {
              throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
            }

            router.route(routes.DELETE_ONE_BY_ID_AND_VERSION).delete((request, response, next) => authController[extraVerificationFunctionName](request, response, next));
          }
        }
      }
      else
      {
        router.route(routes.DELETE_ONE_BY_ID_AND_VERSION).delete((request, response, next) => controller.verifyPublic(request, response, next));
      }

      router.route(routes.DELETE_ONE_BY_ID_AND_VERSION).delete((request, response) => controller.deleteOneByIdAndVersion(request, response));
    }
  }

  /* VARIABLES */
  /**
   * Route names that each corresponds to a CRUD controller method.
   */
  static ROUTE_NAME = {
    READ: "READ",
    READ_ONE_BY_ID: "READ_ONE_BY_ID",
    CREATE_ONE: "CREATE_ONE",
    UPDATE_ONE_BY_ID_AND_VERSION: "UPDATE_ONE_BY_ID_AND_VERSION",
    REPLACE_ONE_BY_ID_AND_VERSION: "REPLACE_ONE_BY_ID_AND_VERSION",
    SOFT_DELETE_ONE_BY_ID_AND_VERSION: "SOFT_DELETE_ONE_BY_ID_AND_VERSION",
    DELETE_ONE_BY_ID_AND_VERSION: "DELETE_ONE_BY_ID_AND_VERSION"
  };

  /**
   * Default route paths that each corresponds to a route name.
   */
  static DEFAULT_ROUTE_PATHS = {
    READ: "",
    READ_ONE_BY_ID: "/:_id",
    CREATE_ONE: "",
    UPDATE_ONE_BY_ID_AND_VERSION: "/:_id",
    REPLACE_ONE_BY_ID_AND_VERSION: "/:_id",
    SOFT_DELETE_ONE_BY_ID_AND_VERSION: "/:_id",
    DELETE_ONE_BY_ID_AND_VERSION: "/:_id"
  };

  /**
   * Default options for router.
   */
  static DEFAULT_ROUTER_OPTIONS = {
    caseSensitive: true,
    mergeParams: true,
    strict: false
  };
}

module.exports = RouteHelper;
