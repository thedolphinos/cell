const {InvalidArgumentsError} = require("@thedolphinos/error4js");
const _ = require("lodash");

const SingularSafe = require("../core/SingularSafe");

/**
 * Stores the errors of the framework.
 */
class ErrorSafe extends SingularSafe
{
  /**
   * Validates the specified value.
   *
   * @param {Array<string>} value
   * @return {Array<string>}
   */
  $hook_set_value (value)
  {
    if (!_.isPlainObject(value) ||
        _.isEmpty(value))
    {
      throw new InvalidArgumentsError();
    }

    return value;
  }
}

module.exports = Object.freeze(new ErrorSafe());
