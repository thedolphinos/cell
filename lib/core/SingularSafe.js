"use strict";

const Safe = require("./Safe");

const key = "key";

/**
 * A special type of safe that only has 1 key which is stored internally.
 *
 * @since 0.8.0
 */
class SingularSafe extends Safe
{
  /**
   * Creates a singular safe instance.
   * Should be used as a super class.
   *
   * @since 0.8.0
   */
  constructor ()
  {
    super();
  }

  /**
   * Sets the specified value.
   *
   * @since 0.8.0
   * @param {*} value
   */
  set (value)
  {
    super.set(key, value);
  }

  /**
   * Gets the value.
   *
   * @since 0.8.0
   * @return {*}
   */
  get ()
  {
    return this._data[key];
  }
}

module.exports = SingularSafe;
