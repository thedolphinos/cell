"use strict";

const fs = require("fs");
const {InvalidArgumentsError} = require("@thedolphinos/error4js");
const _ = require("lodash");

class Interceptor
{
  /**
   * Creates an interceptor instance.
   *
   * @since 0.3.0
   * @param {string} path
   */
  constructor (path)
  {
    Interceptor._validateConstructorParameters(path);

    this._exports = require(path);
  }

  /**
   * Executes the exports of the interceptor with the given arguments if any.
   *
   * @since 0.3.0
   * @param {any} args
   * @return {Promise<void>}
   */
  async intercept (...args)
  {
    await this._exports(...args);
  }

  /**
   * @since 0.3.0
   * @param {string} path
   * @private
   */
  static _validateConstructorParameters (path)
  {
    if (!_.isString(path) || !fs.lstatSync(path).isFile(path))
    {
      throw new InvalidArgumentsError();
    }

    const exports = require(path);

    if (!_.isFunction(exports))
    {
      throw new InvalidArgumentsError();
    }
  }
}

module.exports = Interceptor;
