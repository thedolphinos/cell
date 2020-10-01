"use strict";

const {InvalidArgumentsError, StaticClassInstantiationError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");
const express = require("express");

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
   */
  static generateRoutes (router, authController, controller, routes)
  {
    if (!_.isFunction(router) ||
        (utility.isExist(authController) && !(authController instanceof AuthController)) ||
        !(controller instanceof CrudController) ||
        !_.isPlainObject(routes))
    {
      throw new InvalidArgumentsError();
    }

    const routeNames = Object.keys(routes);

    for (let i = 0; i < routeNames.length; i++)
    {
      const routeName = routeNames[i];
      const routePath = routes[routeName];

      if (!utility.isExist(RouteHelper.ROUTE_NAME[routeName]) || !utility.isExist(routePath))
      {
        throw new InvalidArgumentsError();
      }
    }

    if (utility.isInitialized(routes.SOFT_DELETE_ONE_BY_ID_AND_VERSION) &&
        utility.isInitialized(routes.DELETE_ONE_BY_ID_AND_VERSION) &&
        routes.SOFT_DELETE_ONE_BY_ID_AND_VERSION === routes.DELETE_ONE_BY_ID_AND_VERSION)
    {
      throw new InvalidArgumentsError();
    }

    if (routeNames.includes(RouteHelper.ROUTE_NAME.READ))
    {
      if (utility.isExist(authController))
      {
        router.route(routes.READ).get((request, response, next) => authController.verify(request, response, next));
      }

      router.route(routes.READ).get((request, response) => controller.read(request, response));
    }

    if (routeNames.includes(RouteHelper.ROUTE_NAME.READ_ONE_BY_ID))
    {
      if (utility.isExist(authController))
      {
        router.route(routes.READ_ONE_BY_ID).get((request, response, next) => authController.verify(request, response, next));
      }

      router.route(routes.READ_ONE_BY_ID).get((request, response) => controller.readOneById(request, response));
    }

    if (routeNames.includes(RouteHelper.ROUTE_NAME.CREATE_ONE))
    {
      if (utility.isExist(authController))
      {
        router.route(routes.CREATE_ONE).post((request, response, next) => authController.verify(request, response, next));
      }

      router.route(routes.CREATE_ONE).post((request, response) => controller.createOne(request, response));
    }

    if (routeNames.includes(RouteHelper.ROUTE_NAME.UPDATE_ONE_BY_ID_AND_VERSION))
    {
      if (utility.isExist(authController))
      {
        router.route(routes.UPDATE_ONE_BY_ID_AND_VERSION).patch((request, response, next) => authController.verify(request, response, next));
      }

      router.route(routes.UPDATE_ONE_BY_ID_AND_VERSION).patch((request, response) => controller.updateOneByIdAndVersion(request, response));
    }

    if (routeNames.includes(RouteHelper.ROUTE_NAME.REPLACE_ONE_BY_ID_AND_VERSION))
    {
      if (utility.isExist(authController))
      {
        router.route(routes.REPLACE_ONE_BY_ID_AND_VERSION).put((request, response, next) => authController.verify(request, response, next));
      }

      router.route(routes.REPLACE_ONE_BY_ID_AND_VERSION).put((request, response) => controller.replaceOneByIdAndVersion(request, response));
    }

    if (routeNames.includes(RouteHelper.ROUTE_NAME.SOFT_DELETE_ONE_BY_ID_AND_VERSION))
    {
      if (utility.isExist(authController))
      {
        router.route(routes.SOFT_DELETE_ONE_BY_ID_AND_VERSION).delete((request, response, next) => authController.verify(request, response, next));
      }

      router.route(routes.SOFT_DELETE_ONE_BY_ID_AND_VERSION).delete((request, response) => controller.softDeleteOneByIdAndVersion(request, response));
    }

    if (routeNames.includes(RouteHelper.ROUTE_NAME.DELETE_ONE_BY_ID_AND_VERSION))
    {
      if (utility.isExist(authController))
      {
        router.route(routes.DELETE_ONE_BY_ID_AND_VERSION).delete((request, response, next) => authController.verify(request, response, next));
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
  }

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
