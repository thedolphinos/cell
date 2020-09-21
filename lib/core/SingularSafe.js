"use strict";

const Safe = require("./Safe");

const key = "key";

/**
 * A special type of safe that only has 1 key which is stored internally.
 */
class SingularSafe extends Safe
{
  /**
   * Creates a singular safe instance.
   * Should be used as a super class.
   */
  constructor ()
  {
    super();
  }

  /**
   * Sets the specified value.
   *
   * @param {*} value
   */
  set (value)
  {
    super.set(key, value);
  }

  /**
   * Gets the value.
   *
   * @return {*}
   */
  get ()
  {
    return this._data[key];
  }
}

module.exports = SingularSafe;
