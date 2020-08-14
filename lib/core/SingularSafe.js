"use strict";

const Safe = require("./Safe");

class SingularSafe extends Safe
{
  /**
   * Creates a singular safe instance, which only has 1 key.
   * Should be used as a super class.
   *
   * @since 0.8.0
   */
  constructor ()
  {
    super();
  }

  /**
   * Sets `value` as the value.
   *
   * @since 0.8.0
   * @param {any} value
   */
  set (value)
  {
    super.set("key", value);
  }

  /**
   * Gets the value.
   *
   * @since 0.8.0
   * @return {any}
   */
  get ()
  {
    return this._data["key"];
  }
}

module.exports = SingularSafe;
