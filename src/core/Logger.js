const _ = require("lodash");

const {InvalidArgumentsError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");

const ErrorSafe = require("../safes/ErrorSafe");

class Logger
{
    static #level;

    static setLevel (level)
    {
        Logger.#level = level;
    }

    static info (message, level = 9)
    {
        Logger.#validateParameterMessage(message);
        Logger.#validateParameterLevel(level);

        if (level <= Logger.#level)
        {
            console.info(`${utility.toUTCDateString()}: ${message}`);
        }
    }

    static warning (message, level = 9)
    {
        Logger.#validateParameterMessage(message);
        Logger.#validateParameterLevel(level);

        if (level <= Logger.#level)
        {
            console.warn(`${utility.toUTCDateString()}: ${message}`);
        }
    }

    static error (message, level = 9)
    {
        Logger.#validateParameterMessage(message);
        Logger.#validateParameterLevel(level);

        if (level <= Logger.#level)
        {
            console.error(`${utility.toUTCDateString()}: ${message}`);
        }
    }

    static #validateParameterMessage (message)
    {
        if (!_.isString(message))
        {
            throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
        }
    }

    static #validateParameterLevel (level)
    {
        if (!(utility.isValidNumber(level) && level >= 0))
        {
            throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
        }
    }
}

module.exports = Logger;
