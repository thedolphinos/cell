const fs = require("fs");
const {InvalidArgumentsError} = require("@thedolphinos/error4js");
const _ = require("lodash");

const ErrorSafe = require("../safes/ErrorSafe");

/**
 * Contains the interception logic of the framework.
 */
class Interceptor
{
  /**
   * Creates an interceptor instance.
   *
   * @param {string} path
   */
  constructor (path)
  {
    this._validateConstructorParams(path);

    this._exports = require(path);
  }

  /**
   * Executes the exports of the interceptor with the given arguments if any.
   *
   * @param {*} args
   * @return {Promise<void>}
   */
  async intercept (...args)
  {
    await this._exports(...args);
  }

  /**
   * Validates the parameters of the constructor method.
   *
   * @param {string} path
   * @private
   */
  _validateConstructorParams (path)
  {
    if (!_.isString(path) || !fs.lstatSync(path).isFile(path))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    const exports = require(path);

    if (!_.isFunction(exports))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }
  }
}

module.exports = Interceptor;
