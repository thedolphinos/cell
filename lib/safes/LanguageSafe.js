"use strict";

const {InvalidArgumentsError} = require("@thedolphinos/error4js");
const _ = require("lodash");

const SingularSafe = require("../core/SingularSafe");

/**
 * Stores the languages of the framework.
 *
 * @since 0.52.0
 */
class LanguageSafe extends SingularSafe
{
  /**
   * Validates the specified value.
   *
   * @since 0.52.0
   * @param {Array<string>} value
   * @return {Array<string>}
   */
  $hook_set_value (value)
  {
    if (!_.isArray(value) ||
        _.isEmpty(value))
    {
      throw new InvalidArgumentsError();
    }

    for (let i = 0; i < value.length; i++)
    {
      if (!_.isString(value[i]))
      {
        throw new InvalidArgumentsError();
      }
    }

    return value;
  }
}

module.exports = Object.freeze(new LanguageSafe());