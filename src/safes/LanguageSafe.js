const {InvalidArgumentsError} = require("@thedolphinos/error4js");
const _ = require("lodash");

const SingularSafe = require("../core/SingularSafe");
const ErrorSafe = require("./ErrorSafe");

/**
 * Stores the languages of the framework.
 */
class LanguageSafe extends SingularSafe
{
    /**
     * Validates the specified value.
     *
     * @param {Array<string>} value
     * @return {Array<string>}
     */
    $hook_set_value (value)
    {
        if (!_.isArray(value) ||
            _.isEmpty(value))
        {
            throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
        }

        for (let i = 0; i < value.length; i++)
        {
            if (!_.isString(value[i]))
            {
                throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
            }
        }

        return value;
    }
}

module.exports = Object.freeze(new LanguageSafe());
