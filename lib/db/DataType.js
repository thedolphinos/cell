"use strict";

const {StaticClassInstantiationError} = require("@thedolphinos/error4js");

/**
 * Contains data types.
 * See: https://docs.mongodb.com/manual/reference/bson-types/
 *
 * @since 0.7.0
 */
class DataType
{
  constructor ()
  {
    throw new StaticClassInstantiationError("DataType");
  }

  /**
   * @since 0.7.0
   * @returns {string}
   */
  static get Boolean ()
  {
    return "bool";
  }

  /**
   * @since 0.7.0
   * @returns {string}
   */
  static get Int32 ()
  {
    return "int";
  }

  /**
   * @since 0.7.0
   * @returns {string}
   */
  static get Int64 ()
  {
    return "long";
  }

  /**
   * @since 0.7.0
   * @returns {string}
   */
  static get Int128 ()
  {
    return "decimal";
  }

  /**
   * @since 0.7.0
   * @returns {string}
   */
  static get Double ()
  {
    return "double";
  }

  /**
   * @since 0.7.0
   * @returns {string}
   */
  static get String ()
  {
    return "string";
  }

  /**
   * @since 0.7.0
   * @returns {string}
   */
  static get ObjectId ()
  {
    return "objectId";
  }

  /**
   * @since 0.7.0
   * @returns {string}
   */
  static get Date ()
  {
    return "date";
  }

  /**
   * @since 0.7.0
   * @returns {string}
   */
  static get Object ()
  {
    return "object";
  }

  /**
   * @since 0.7.0
   * @returns {string}
   */
  static get Array ()
  {
    return "array";
  }
}

module.exports = DataType;
