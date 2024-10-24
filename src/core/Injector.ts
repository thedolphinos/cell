import path from "node:path";
import fs from "node:fs";

import _ from "lodash";

import {isExist, isInitialized} from "@thedolphinos/utility4js";
import {DeveloperError, InvalidArgumentsError} from "@thedolphinos/error4js";

import Validator from "../helpers/Validator";
import ErrorSafe from "../safes/ErrorSafe";

export type C = any;

class Injector
{
    private readonly map: {
        [className: string]: {
            Class: C,
            bundles: Array<{
                instance: any,
                constructorParameters: Array<any>
            }>
        }
    };

    /**
     * Traverses the given directory and imports the including files.
     * Maps the Class names with the classes and waits for the instances to come.
     */
    constructor (directoryPath: string)
    {
        Validator.validateDirectoryPath(directoryPath);

        this.map = {};

        const exports = this.importDeep(directoryPath);

        for (const Class of exports)
        {
            const className = Class.name;

            if (!_.isString(className))
            {
                continue;
            }

            this.map[className] = {
                Class,
                bundles: []
            };
        }
    }

    /**
     * If the given path is a file, imports it.
     * If the given path is a directory, traverses the sub-paths. If the sub-path is a file, imports it; otherwise, calls itself.
     *
     * > File: [file]
     * > Directory: for each
     * ----> File: [_] + file
     * ----> Directory: [_] + recursive
     *
     * Returns exports of the imported files.
     */
    private importDeep (path_: string): Array<any>
    {
        if (!fs.existsSync(path_))
        {
            throw new InvalidArgumentsError(ErrorSafe.getData().DEV_1);
        }

        const pathInformation = fs.lstatSync(path_);

        if (pathInformation.isFile())
        {
            Validator.validateFilePath(path_);
            return [require(path.resolve(path_)).default];
        }
        else if (pathInformation.isDirectory())
        {
            Validator.validateDirectoryPath(path_);

            let exports: Array<any> = [];

            const subPaths = fs.readdirSync(path_);

            for (let subPath of subPaths)
            {
                subPath = path.join(path_, subPath);
                const subPathInformation = fs.lstatSync(subPath);

                if (subPathInformation.isFile())
                {
                    Validator.validateFilePath(subPath);
                    exports.push(require(path.resolve(subPath)).default);
                }
                else if (subPathInformation.isDirectory())
                {
                    Validator.validateDirectoryPath(subPath);
                    exports = _.concat(exports, this.importDeep(subPath));
                }
            }

            return exports;
        }
        else
        {
            throw new DeveloperError(ErrorSafe.getData().DEV_0);
        }
    }

    /**
     * Instantiates the class using its exports from the map.
     * But before, if the instance that is injecting the class has not already been injected, store its instance. When someone tries to inject, this stored instance will be ready to use.
     *
     * @param {string} className
     * @param {Array} constructorParameters
     * @param {Object} fromInstance
     * @param {Array} fromConstructorParameters
     * @returns {{injector: Injector, className: string, constructorParameters: Array}}
     */
    public inject (className: string, constructorParameters: Array<any>, fromInstance: any, fromConstructorParameters: Array<any>): C
    {
        if (!isExist(this.map[className]))
        {
            throw new DeveloperError(ErrorSafe.getData().DEV_0);
        }

        const fromClassName = fromInstance.constructor.name;

        // If the instance that is injecting the class has not already been injected, store its instance. When someone tries to inject, this stored instance will be ready to use.
        if (!isExist(this.getInstance(fromClassName, fromConstructorParameters)))
        {
            const fromBundle = {
                instance: fromInstance,
                constructorParameters: fromConstructorParameters
            };

            this.map[fromClassName].bundles.push(fromBundle);
        }

        return this.instantiate(this.map[className].Class, constructorParameters);
    }

    /**
     * Creates an instance of the specified class with the specified constructor parameters, if not instantiated as specified before.
     */
    private instantiate (Class: C, constructorParameters: Array<any>): C
    {
        const className = Class.name;
        let instance = this.getInstance(Class.name, constructorParameters);

        if (isExist(instance))
        {
            return instance;
        }

        instance = new Class(...constructorParameters);

        const bundle = {
            instance,
            constructorParameters
        };

        this.map[className].bundles.push(bundle);

        return instance;
    }

    private getInstance (className: string, constructorParameters: Array<any>): C
    {
        const {bundles} = this.map[className];

        if (!isInitialized(bundles))
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
}

export default Injector;
