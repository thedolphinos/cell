const path = require("path");
const fs = require("fs");
const _ = require("lodash");

const utility = require("@thedolphinos/utility4js");
const {DeveloperError, InvalidArgumentsError} = require("@thedolphinos/error4js");

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
      if (!_.isString(Class.name))
      {
        continue;
      }

      this._MAP[Class.name] = {
        Class,
        instances: [] // contains {self, constructorParameters}
      };
    }
  }

  /**
   * Prepares the corresponding Class to the injection process of the service.
   *
   * @param className
   * @param constructorParameters
   * @returns {{injector: Injector, className: string, constructorParameters: Array}}
   */
  inject (className, constructorParameters)
  {
    if (!_.isString(className) ||
        !_.isArray(constructorParameters))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    if (!utility.isExist(this._MAP[className]))
    {
      throw new DeveloperError(ErrorSafe.get().DEV_0);
    }

    return {
      injector: this,
      className,
      constructorParameters
    };
  }

  /**
   * Gets the instance of the classed instantiated with the specified constructor parameters, if any.
   *
   * @param {string} className
   * @param {Array} constructorParameters
   * @returns {Class}
   */
  getInstance (className, constructorParameters)
  {
    if (!_.isString(className) ||
        !_.isArray(constructorParameters))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    if (!utility.isExist(this._MAP[className]))
    {
      throw new DeveloperError(ErrorSafe.get().DEV_0);
    }

    if (utility.isInitialized(constructorParameters))
    {
      delete constructorParameters[0].from;
      delete constructorParameters[0].fromConstructorParameters;
    }

    if (!utility.isInitialized(constructorParameters[0]))
    {
      constructorParameters.splice(0, 1);
    }

    for (const instance of this._MAP[className].instances)
    {
      if (_.isEqual(instance.constructorParameters, constructorParameters))
      {
        return instance.self;
      }
    }
  }

  /**
   * Creates an instance of the corresponding class with the specified constructor parameters.
   *
   * @param {string} className
   * @param {Array} constructorParameters
   * @param {Class} from
   * @param {Array} fromConstructorParameters
   * @returns {Class}
   */
  instantiate (className, constructorParameters, from, fromConstructorParameters)
  {
    if (!_.isString(className) ||
        !_.isArray(constructorParameters) ||
        !_.isObject(from) ||
        !_.isArray(constructorParameters))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    if (!utility.isExist(this._MAP[className]))
    {
      throw new DeveloperError(ErrorSafe.get().DEV_0);
    }

    const formerlyInstantiatedInstance = this.getInstance(className, constructorParameters);

    if (utility.isExist(formerlyInstantiatedInstance))
    {
      return formerlyInstantiatedInstance;
    }

    const untouchedConstructorParameters = _.cloneDeep(constructorParameters);

    if (!utility.isInitialized(constructorParameters))
    {
      constructorParameters = [{}];
    }

    constructorParameters[0].from = from;
    constructorParameters[0].fromConstructorParameters = fromConstructorParameters;

    const instance = {
      self: new this._MAP[className].Class(...constructorParameters),
      constructorParameters: untouchedConstructorParameters
    };

    this._MAP[className].instances.push(instance);

    return instance.self;
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
