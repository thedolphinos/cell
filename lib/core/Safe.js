"use strict";

const {InvalidArgumentsError} = require("@thedolphinos/error4js");
const _ = require("lodash");

class Safe
{
  /**
   * Creates a Safe instance.
   * Should be used as a super class.
   *
   * @since 0.4.0
   */
  constructor ()
  {
    this._data = {};
  }

  /**
   * Sets `value` as the value of `key`.
   *
   * @since 0.4.0
   * @param {string} key
   * @param {any} value
   */
  set (key, value)
  {
    if (!_.isString(key))
    {
      throw new InvalidArgumentsError();
    }

    this._data[key] = value;
  }

  /**
   * Gets the value of `key`.
   *
   * @since 0.4.0
   * @param {string} key
   * @return {any}
   */
  get (key)
  {
    if (!_.isString(key))
    {
      throw new InvalidArgumentsError();
    }

    return this._data[key];
  }
}

module.exports = Safe;
