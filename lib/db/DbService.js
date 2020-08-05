"use strict";

const {InvalidArgumentsError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const mongodb = require("mongodb");

const Schema = require("./Schema");
const Db = require("./Db");

class DbService
{
  /**
   * Creates a Db service instance for a schema.
   * Should be used as a super class.
   *
   * @since 0.5.0
   * @param {Db} db
   * @param {Schema} schema
   */
  constructor (db, schema)
  {
    DbService._validateConstructorParameters(db, schema);

    this._collection = db.getCollection(schema.name);
  }

  /**
   * Fetches the native MongoDB operations of the collection.
   *
   * @since 0.5.0
   * @return {mongodb.Collection}
   */
  getNativeOps ()
  {
    return this._collection;
  }

  /**
   * @since 0.5.0
   * @param {Db} db
   * @param {Schema} schema
   * @protected
   */
  static _validateConstructorParameters (db, schema)
  {
    if (!utility.isExist(db) || !(db instanceof Db) ||
        !utility.isExist(schema) || !(schema instanceof Schema))
    {
      throw new InvalidArgumentsError();
    }
  }
}

module.exports = DbService;
