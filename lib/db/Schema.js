"use strict";

const {InvalidArgumentsError} = require("@thedolphinos/error4js");
const _ = require("lodash");

class Schema
{
  /**
   * Creates a Schema instance.
   * Should be used as a super class.
   *
   * @since 0.5.0
   * @param {string} name
   */
  constructor (name)
  {
    Schema._validateConstructorParameters(name);

    this._name = name;
  }

  /**
   * @since 0.5.0
   * @return {string}
   */
  get name ()
  {
    return this._name;
  }

  /**
   * @since 0.5.0
   * @param {string} name
   * @protected
   */
  static _validateConstructorParameters (name)
  {
    if (!_.isString(name))
    {
      throw new InvalidArgumentsError();
    }
  }
}

module.exports = Schema;
