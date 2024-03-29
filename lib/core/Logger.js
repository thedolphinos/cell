const {InvalidArgumentsError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");

const _ = require("lodash");

const ErrorSafe = require("../safes/ErrorSafe");

/**
 * Contains the logging logic of the framework.
 */
class Logger
{
  /**
   * Logs the specified message as an info message.
   *
   * @param {string} message
   */
  info (message)
  {
    if (!_.isString(message))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    console.log(message);
  }

  /**
   * Logs the specified message as a warning message.
   *
   * @param {string} message
   */
  warning (message)
  {
    if (!_.isString(message))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    console.warn(message);
  }

  /**
   * Logs the specified message as an error message.
   *
   * @param {string} message
   * @param {*} [error]
   */
  error (message, error)
  {
    if (!_.isString(message))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    console.error(message);

    if (utility.isExist(error) && utility.isExist(error.callStack))
    {
      console.error(error.callStack);
    }
    else
    {
      if (utility.isExist(error))
      {
        console.error(error);
      }
    }
  }
}

module.exports = Object.freeze(new Logger());
