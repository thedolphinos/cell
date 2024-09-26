const path = require("path");
const fs = require("fs");

const {
    DeveloperError,
    InvalidArgumentsError
} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");

const _ = require("lodash");

const ErrorSafe = require("../safes/ErrorSafe");

/**
 * Contains the injection logic of the framework.
 */
class Injector
{
    /**
     * Traverses the given directory and imports the including files. Maps the Class names with the classes and the instances of the Class.
     *
     * @param {string} directoryPath
     */
    constructor (directoryPath)
    {
        if (!_.isString(directoryPath) ||
            !fs.existsSync(directoryPath) ||
            !fs.lstatSync(directoryPath).isDirectory())
        {
            throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
        }

        this._MAP = {};

        const exports = this._import(directoryPath);

        for (const Class of exports)
        {
            const className = Class.name;

            if (!_.isString(className))
            {
                continue;
            }

            this._MAP[className] = {
                Class,
                bundles: [] // contains {instance, constructorParameters}
            };
        }
    }

    /**
     * Prepares the corresponding Class to the injection process of the service.
     *
     * @param {string} className
     * @param {Array} constructorParameters
     * @param {Object} fromInstance
     * @param {Array} fromConstructorParameters
     * @returns {{injector: Injector, className: string, constructorParameters: Array}}
     */
    inject (className, constructorParameters, fromInstance, fromConstructorParameters)
    {
        if (!_.isString(className) ||
            !_.isArray(constructorParameters) ||
            !_.isObject(fromInstance) ||
            !_.isArray(fromConstructorParameters))
        {
            throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
        }

        if (!utility.isExist(this._MAP[className]))
        {
            throw new DeveloperError(ErrorSafe.get().DEV_0);
        }

        const fromClassName = fromInstance.constructor.name;

        if (!utility.isExist(this.getInstance(fromClassName, fromConstructorParameters)))
        {
            const fromBundle = {
                instance: fromInstance,
                constructorParameters: fromConstructorParameters
            };

            this._MAP[fromClassName].bundles.push(fromBundle);
        }

        return this.instantiate(this._MAP[className].Class, constructorParameters);
    }

    /**
     * Creates an instance of the specified class with the specified constructor parameters, if not instantiated as specified before.
     *
     * @param {Object} Class
     * @param {Array} constructorParameters
     * @returns {Class}
     */
    instantiate (Class, constructorParameters)
    {
        if (!_.isObject(Class) ||
            !_.isArray(constructorParameters))
        {
            throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
        }

        const className = Class.name;
        let instance = this.getInstance(Class.name, constructorParameters);

        if (utility.isExist(instance))
        {
            return instance;
        }

        instance = new Class(...constructorParameters);

        const bundle = {
            instance,
            constructorParameters
        };

        this._MAP[className].bundles.push(bundle);

        return instance;
    }

    /**
     * Gets the instance of the specified class which is instantiated with the specified consturctor parameters, if any.
     *
     * @param {string} className
     * @param {Array} constructorParameters
     * @returns {Object}
     */
    getInstance (className, constructorParameters)
    {
        if (!_.isString(className) ||
            !_.isArray(constructorParameters))
        {
            throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
        }

        const {bundles} = this._MAP[className];

        if (!utility.isInitialized(bundles))
        {
            return null;
        }

        for (const bundle of bundles)
        {
            if (_.isEqual(bundle.constructorParameters, constructorParameters))
            {
                return bundle.instance;
            }
        }

        return null;
    }

    /**
     * If the given path is a file, imports.
     * If the given path is a directory, traverses the sub paths and calls itself for each.
     * #recursive
     *
     * @param {string} path_
     * @returns {Array} - Exports of the imported files.
     */
    _import (path_)
    {
        if (!_.isString(path_) ||
            !fs.existsSync(path_))
        {
            throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
        }

        const pathInformation = fs.lstatSync(path_);

        if (pathInformation.isFile())
        {
            fs.accessSync(path_, fs.constants.F_OK | fs.constants.R_OK);

            return [require(path.resolve(path_))];
        }
        else if (pathInformation.isDirectory())
        {
            let exports = [];

            const subPaths = fs.readdirSync(path_);

            for (let subPath of subPaths)
            {
                subPath = path.join(path_, subPath);
                const subPathInformation = fs.lstatSync(subPath);

                if (subPathInformation.isFile())
                {
                    fs.accessSync(subPath, fs.constants.F_OK | fs.constants.R_OK);
                    exports.push(require(path.resolve(subPath)));
                }
                else if (subPathInformation.isDirectory())
                {
                    exports = _.concat(exports, this._import(subPath));
                }
            }

            return exports;
        }
        else
        {
            throw new DeveloperError(ErrorSafe.get().DEV_0);
        }
    }
}

module.exports = Injector;
