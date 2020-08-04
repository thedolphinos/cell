"use strict";

const InvalidArgumentsError = require("@thedolphinos/error4js").InvalidArgumentsError;
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");
const mongodb = require("mongodb");

class Db
{
  /**
   * Creates a Db instance.
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
   * Fetches the collection from Db.
   *
   * @since 0.4.0
   * @param {string} name
   * @return {any}
   */
  getCollection (name)
  {
    if (!_.isString(name))
    {
      throw new InvalidArgumentsError();
    }

    return this._db.collection(name);
  }
}

module.exports = Db;
