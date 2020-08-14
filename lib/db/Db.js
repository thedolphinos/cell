"use strict";

const InvalidArgumentsError = require("@thedolphinos/error4js").InvalidArgumentsError;
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");
const mongodb = require("mongodb");

class Db
{
  /**
   * Creates a database instance.
   *
   * @since 0.4.0
   * @param {mongodb.Db} db
   */
  constructor (db)
  {
    if (!utility.isExist(db) || db.constructor !== mongodb.Db)
    {
      throw new InvalidArgumentsError();
    }

    this._db = db;
  }

  /**
   * Fetches the native MongoDB operations of the database.
   *
   * @since 0.7.0
   * @return {mongodb.Db}
   */
  getNativeOps ()
  {
    return this._db;
  }
}

module.exports = Db;
