"use strict";

const {InvalidArgumentsError} = require("@thedolphinos/error4js");
const _ = require("lodash");

class Logger
{
  /**
   * Logs `message` as an info message.
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
   * Logs `message` as a warning message.
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
   * Logs `message` as an error message.
   *
   * @since 0.2.0
   * @param {string} message
   */
  error (message)
  {
    if (!_.isString(message))
    {
      throw new InvalidArgumentsError();
    }

    console.error(message);
  }
}

const LOGGER = Object.freeze(new Logger());

module.exports = LOGGER;
