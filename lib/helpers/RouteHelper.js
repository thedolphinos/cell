"use strict";

const {InvalidArgumentsError, StaticClassInstantiationError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");
const express = require("express");

const AuthController = require("../controllers/AuthController");
const Controller = require("../controllers/CrudController");

/**
 * Route names that each corresponds to a CRUD controller method.
 *
 * @since 0.11.0
 * @type {Readonly<{Object}>}
 */
const ROUTE_NAME = Object.freeze({
                                   READ: "READ",
                                   READ_ONE_BY_ID: "READ_ONE_BY_ID",
                                   CREATE_ONE: "CREATE_ONE",
                                   UPDATE_ONE_BY_ID: "UPDATE_ONE_BY_ID",
                                   DELETE_ONE_BY_ID: "DELETE_ONE_BY_ID"
                                 });

/**
 * Default options for router.
 *
 * @since 0.10.0
 * @type {Readonly<{Object}>}
 */
const DEFAULT_ROUTER_OPTIONS = Object.freeze({
                                               caseSensitive: true,
                                               mergeParams: true,
                                               strict: false
                                             });

/**
 * Contains helper methods for routes.
 *
 * @since 0.10.0
 */
class RouteHelper
{
  /**
   * Static classes must not be instantiated.
   *
   * @since 0.10.0
   */
  constructor ()
  {
    throw new StaticClassInstantiationError("RouteHelper");
  }

  /**
   * Creates a router with the specified configurations.
   *
   * @since 0.10.0
   * @param {Object} config - See: https://expressjs.com/en/api.html
   * @return {express.Router}
   */
  static createRouter (config = DEFAULT_ROUTER_OPTIONS)
  {
    if (!_.isPlainObject(config))
    {
      throw new InvalidArgumentsError;
    }

    return express.Router(config);
  }

  /**
   * Fetches route names that each corresponds to a CRUD controller method.
   *
   * @since 0.11.0
   * @return {Readonly<{Object}>}
   */
  static getRouteNames ()
  {
    return ROUTE_NAME;
  }

  /**
   * Generates routes for CRUD controller.
   *
   * @param {express.Router} router
   * @param {AuthController} authController
   * @param {Controller} controller
   * @param {Array} routeNames
   */
  static generateRoutes (router, authController, controller, routeNames)
  {
    if (!_.isFunction(router) ||
        (utility.isExist(authController) && !(authController instanceof AuthController)) ||
        !(controller instanceof Controller) ||
        !_.isArray(routeNames))
    {
      throw new Error("Invalid function parameters.");
    }

    for (let i = 0; i < routeNames.length; i++)
    {
      const routeName = routeNames[i];

      if (!utility.isExist(ROUTE_NAME[routeName]))
      {
        throw new Error("Invalid function parameters.");
      }
    }

    if (routeNames.includes(ROUTE_NAME.READ))
    {
      if (utility.isExist(authController))
      {
        router.route("/").get((request, response, next) => authController.verify(request, response, next));
      }

      router.route("/").get((request, response) => controller.read(request, response));
    }

    if (routeNames.includes(ROUTE_NAME.READ_ONE_BY_ID))
    {
      if (utility.isExist(authController))
      {
        router.route("/:id").get((request, response, next) => authController.verify(request, response, next));
      }

      router.route("/:id").get((request, response) => controller.readById(request, response));
    }

    if (routeNames.includes(ROUTE_NAME.CREATE_ONE))
    {
      if (utility.isExist(authController))
      {
        router.route("/").post((request, response, next) => authController.verify(request, response, next));
      }

      router.route("/").post((request, response) => controller.create(request, response));
    }

    if (routeNames.includes(ROUTE_NAME.UPDATE_ONE_BY_ID))
    {
      if (utility.isExist(authController))
      {
        router.route("/:id").patch((request, response, next) => authController.verify(request, response, next));
      }

      router.route("/:id").patch((request, response) => controller.updateById(request, response));
    }

    if (routeNames.includes(ROUTE_NAME.DELETE_ONE_BY_ID))
    {
      if (utility.isExist(authController))
      {
        router.route("/:id").delete((request, response, next) => authController.verify(request, response, next));
      }

      router.route("/:id").delete((request, response) => controller.deleteById(request, response));
    }
  }
}

module.exports = RouteHelper;
