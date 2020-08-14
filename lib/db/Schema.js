"use strict";

const {InvalidArgumentsError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");
const mongodb = require("mongodb");

const Db = require("./Db");

class Schema
{
  /**
   * Creates a schema instance for the specified database and collection using the specified schema definition.
   * Must be used as a super class.
   * The sub class, must only be initialized in the related database service. (e.g.`FooSchema` must only be initialized in `FooDbService`.)
   *
   * @since 0.5.0
   * @param {Db} db - The instance of the database which the schema corresponds
   * @param {string} collectionName - The name of the collection which the schema corresponds.
   * @param {Object} [schemaDefinition] - The definition the schema. See: https://docs.mongodb.com/manual/reference/operator/query/jsonSchema/
   */
  constructor (db, collectionName, schemaDefinition = null)
  {
    Schema._validateConstructorParameters(db, collectionName, schemaDefinition);

    this._db = db;
    this._collectionName = collectionName;
    this._schemaDefinition = schemaDefinition;

    if (utility.isExist(schemaDefinition))
    {
      this._enforceSchemaDefinition();
    }
  }

  /**
   * Fetches the collection related with the schema from the database.
   *
   * @since 0.7.0
   * @returns {mongodb.Collection}
   */
  getCollection ()
  {
    return this._db.getNativeOps().collection(this._collectionName);
  }

  /**
   * Enforces the schema definition on insert and update operations in the collection.
   * Since the method is called inside the constructor and constructors cannot be asynchronous, if update the schema definition, and if you do an operation on the collection that the schema is related right after the instantiation of the schema the reflection of the updates might be later than the operation which might seem you as a bug.
   *
   * @since 0.7.0
   * @returns {Promise<void>}
   * @private
   */
  async _enforceSchemaDefinition ()
  {
    try
    {
      await this._db.getNativeOps().createCollection(this._collectionName, {
        validator: {
          $jsonSchema: this._schemaDefinition
        }
      });
    }
    catch (error)
    {
      await this._db.getNativeOps().command({collMod: this._collectionName, validator: {$jsonSchema: this._schemaDefinition}});
    }
  }

  /**
   * @since 0.5.0
   * @param {Db} db
   * @param {string} collectionName
   * @param {Object} [jsonSchemaDefinition]
   * @protected
   */
  static _validateConstructorParameters (db, collectionName, jsonSchemaDefinition)
  {
    if (!utility.isExist(db) || !(db instanceof Db) ||
        !_.isString(collectionName) ||
        utility.isExist(jsonSchemaDefinition) && !_.isPlainObject(jsonSchemaDefinition))
    {
      throw new InvalidArgumentsError();
    }
  }
}

module.exports = Schema;
