const path = require("path");
const fs = require("fs");
const _ = require("lodash");

const {DeveloperError, InvalidArgumentsError, StaticClassInstantiationError} = require("@thedolphinos/error4js");

/**
 * Contains the injection logic of the framework.
 */
class Injector
{
  constructor ()
  {
    throw new StaticClassInstantiationError("Injector");
  }

  static _MAP = {};

  /**
   * Traverses the given directory and imports the including files. Maps the exports to the export names.
   *
   * @param {string} directoryPath
   */
  static build (directoryPath)
  {
    if (!_.isString(directoryPath) ||
        !fs.existsSync(directoryPath) ||
        !fs.lstatSync(directoryPath).isDirectory())
    {
      throw new InvalidArgumentsError();
    }

    const exports = Injector.import(directoryPath);

    for (const export_ of exports)
    {
      if (!_.isString(export_.name))
      {
        continue;
      }

      Injector._MAP[export_.name] = export_;
    }
  }

  /**
   * If the given path is a file, imports.
   * If the given path is a directory, traverses the sub paths and calls itself for each.
   * #recursive
   *
   * @param {string} path_
   * @returns {Array} - Exports of the imported files.
   */
  static import (path_)
  {
    if (!_.isString(path_) ||
        !fs.existsSync(path_))
    {
      throw new InvalidArgumentsError();
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
          exports = _.concat(exports, Injector.import(subPath));
        }
      }

      return exports;
    }
    else
    {
      throw new DeveloperError();
    }
  }

  /**
   * Gets the corresponding export of the specified export name from the map.
   *
   * @param {string} exportName
   * @return {*} - Export.
   */
  static get (exportName)
  {
    if (!_.isString(exportName))
    {
      throw new InvalidArgumentsError();
    }

    return Injector._MAP[exportName];
  }
}

module.exports = Injector;
