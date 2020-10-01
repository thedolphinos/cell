"use strict";

const Safe = require("./Safe");

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
    super.set(SingularSafe.KEY, value);
  }

  /**
   * Gets the value.
   *
   * @return {*}
   */
  get ()
  {
    return this._data[SingularSafe.KEY];
  }

  /* VARIABLES */
  static KEY = "key";
}

module.exports = SingularSafe;
