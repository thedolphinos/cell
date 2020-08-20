"use strict";

const {InvalidArgumentsError, StaticClassInstantiationError} = require("@thedolphinos/error4js");
const _ = require("lodash");
const express = require("express");

const DEFAULT_ROUTER_CONFIG = Object.freeze({
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
    throw new StaticClassInstantiationError("ControllerHelper");
  }

  /**
   * Creates a router with the specified configurations.
   *
   * @since 0.10.0
   * @param {Object} config - See: https://expressjs.com/en/api.html
   * @return {express.Router}
   */
  static createRouter (config = DEFAULT_ROUTER_CONFIG)
  {
    if (!_.isPlainObject(config))
    {
      throw new InvalidArgumentsError;
    }

    return express.Router(config);
  }
}

module.exports = RouteHelper;
