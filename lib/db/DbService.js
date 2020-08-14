"use strict";

const {InvalidArgumentsError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const mongodb = require("mongodb");

const Schema = require("./Schema");

class DbService
{
  /**
   * Creates a database service instance for the specified schema.
   * Should be used as a super class.
   *
   * @since 0.5.0
   * @param {Schema} schema
   */
  constructor (schema)
  {
    DbService._validateConstructorParameters(schema);

    this._schema = schema;
  }

  /**
   * Fetches the native MongoDB operations of the collection.
   *
   * @since 0.5.0
   * @return {mongodb.Collection}
   */
  getNativeOps ()
  {
    return this._schema.getCollection();
  }

  /**
   * @since 0.5.0
   * @param {Schema} schema
   * @protected
   */
  static _validateConstructorParameters (schema)
  {
    if (!utility.isExist(schema) || !(schema instanceof Schema))
    {
      throw new InvalidArgumentsError();
    }
  }
}

module.exports = DbService;
