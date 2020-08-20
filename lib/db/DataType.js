"use strict";

const {StaticClassInstantiationError} = require("@thedolphinos/error4js");

/**
 * Contains data types for schema definitions.
 * Must not be accessed directly. Must be accessed using schema.
 * See: https://docs.mongodb.com/manual/reference/bson-types/
 *
 * @since 0.7.0
 */
class DataType
{
  /**
   * Static classes must not be instantiated.
   *
   * @since 0.7.0
   */
  constructor ()
  {
    throw new StaticClassInstantiationError("DataType");
  }

  /**
   * Gets the BSON type alias of boolean.
   *
   * @since 0.7.0
   * @returns {string}
   */
  static get Boolean ()
  {
    return "bool";
  }

  /**
   * Gets the BSON type alias of 32-bit integer number.
   *
   * @since 0.7.0
   * @returns {string}
   */
  static get Int ()
  {
    return "int";
  }

  /**
   * Gets the BSON type alias of 64-bit integer number.
   *
   * @since 0.7.0
   * @returns {string}
   */
  static get Int64 ()
  {
    return "long";
  }

  /**
   * Gets the BSON type alias of 64-bit IEEE 754-2008 binary floating point number.
   *
   * @since 0.7.0
   * @returns {string}
   */
  static get Double ()
  {
    return "double";
  }

  /**
   * Gets the BSON type alias of 64-bit IEEE 754-2008 binary floating point number.
   *
   * @since 0.7.0
   * @returns {string}
   */
  static get Double128 ()
  {
    return "decimal";
  }

  /**
   * Gets the BSON type alias of UTF-8 encoded string.
   *
   * @since 0.7.0
   * @returns {string}
   */
  static get String ()
  {
    return "string";
  }

  /**
   * Gets the BSON type alias of small, likely unique, fast to generate, and ordered IDs.
   * It is 12 bytes in length,
   *   - a 4-byte timestamp value, representing the ObjectId’s creation, measured in seconds since the Unix epoch
   *   - a 5-byte random value
   *   - a 3-byte incrementing counter, initialized to a random value
   *
   * @since 0.7.0
   * @returns {string}
   */
  static get ObjectId ()
  {
    return "objectId";
  }

  /**
   * Gets the BSON type alias of 64-bit integer number, representing Epoch time.
   *
   * @since 0.7.0
   * @returns {string}
   */
  static get Date ()
  {
    return "date";
  }

  /**
   * Gets the BSON type alias of object.
   *
   * @since 0.7.0
   * @returns {string}
   */
  static get Object ()
  {
    return "object";
  }

  /**
   * Gets the BSON type alias of array.
   *
   * @since 0.7.0
   * @returns {string}
   */
  static get Array ()
  {
    return "array";
  }
}

module.exports = DataType;
