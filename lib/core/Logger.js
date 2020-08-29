"use strict";

const {InvalidArgumentsError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");

/**
 * Contains the logging logic of the framework.
 *
 * @since 0.2.0
 */
class Logger
{
  /**
   * Logs the specified message as an info message.
   *
   * @since 0.2.0
   * @param {string} message
   */
  info (message)
  {
    if (!_.isString(message))
    {
      throw new InvalidArgumentsError();
    }

    console.log(message);
  }

  /**
   * Logs the specified message as a warning message.
   *
   * @since 0.2.0
   * @param {string} message
   */
  warning (message)
  {
    if (!_.isString(message))
    {
      throw new InvalidArgumentsError();
    }

    console.warn(message);
  }

  /**
   * Logs the specified message as an error message.
   *
   * @since 0.2.0
   * @param {string} message
   * @param {any} [error]
   */
  error (message, error)
  {
    if (!_.isString(message))
    {
      throw new InvalidArgumentsError();
    }

    console.error(message);

    if (utility.isExist(error))
    {
      console.error(error);
    }
  }
}

module.exports = Object.freeze(new Logger());
