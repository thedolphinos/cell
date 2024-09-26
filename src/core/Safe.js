const {InvalidArgumentsError} = require("@thedolphinos/error4js");

const _ = require("lodash");

const ErrorSafe = require("../safes/ErrorSafe");

/**
 * Contains the data storing logic of the framework.
 */
class Safe
{
    /**
     * Creates an safe instance.
     * Should be used as a super Class.
     */
    constructor ()
    {
        this._data = {};
    }

    /**
     * Sets the specified value as the value of the specified key.
     *
     * @param {string} key
     * @param {*} value
     */
    set (key, value)
    {
        if (!_.isString(key))
        {
            throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
        }

        value = this.$hook_set_value(value);
        this._data[key] = value;
    }

    /**
     * Hooks to the value for the method `set`.
     *
     * @param {*} value
     * @return {*}
     */
    $hook_set_value (value)
    {
        return value;
    }

    /**
     * Gets the value of the specified key.
     *
     * @param {string} key
     * @return {*}
     */
    get (key)
    {
        if (!_.isString(key))
        {
            throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
        }

        return this._data[key];
    }
}

module.exports = Safe;
