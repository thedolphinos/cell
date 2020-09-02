"use strict";

const {DeveloperError, InvalidArgumentsError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");
const {Db, Collection} = require("mongodb");

const DataType = require("./DataType");

/**
 * Represents definition and logical structure of a database collection.
 * Should be used as a super class.
 *
 * @since 0.5.0
 */
class Schema
{
  /**
   * Creates a schema instance for the specified database and collection using the specified definition.
   * Must be used as a super class.
   * The sub class, must only be initialized in the related database operation. (e.g.`FooSchema` must only be initialized in `FooDbOperation`.)
   *
   * @since 0.5.0
   * @param {Db} db - The database of the schema.
   * @param {string} collectionName - The name of the collection which the schema corresponds.
   * @param {Object} [definition] - The definition of the schema. See: https://docs.mongodb.com/manual/reference/operator/query/jsonSchema/
   */
  constructor (db, collectionName, definition = null)
  {
    Schema._validateConstructorParameters(db, collectionName, definition);

    this._db = db;
    this._collectionName = collectionName;
    this._definition = definition;

    if (utility.isExist(definition))
    {
      this._enforceDefinition();
    }
  }

  /**
   * Gets the definition of the schema.
   *
   * @since 0.14.0
   * @return {Object}
   */
  get definition ()
  {
    return this._definition;
  }

  /**
   * Data types for definitions.
   *
   * @since 0.13.0
   * @type {DataType}
   */
  static DataType = DataType;

  /**
   * Definitions for common properties.
   *
   * @since 0.21.0
   * @type {{CommonRules: Object, CommonProperties: Object}}
   */
  static Definition = {
    CommonRules: Object.freeze({
                                 additionalProperties: false
                               }),
    CommonProperties: Object.freeze({
                                      _id: {
                                        bsonType: Schema.DataType.ObjectId
                                      },
                                      version: {
                                        bsonType: Schema.DataType.Int
                                      },
                                      isSoftDeleted: {
                                        bsonType: Schema.DataType.Boolean
                                      }
                                    }),
    CommonAuthProperties: Object.freeze({
                                          auth: {
                                            bsonType: Schema.DataType.Object,
                                            required: ["isBlocked", "numberOfFailedLoginAttempts"],
                                            properties: {
                                              isBlocked: {
                                                bsonType: Schema.DataType.Boolean
                                              },
                                              numberOfFailedLoginAttempts: {
                                                bsonType: Schema.DataType.Int,
                                                minimum: 0,
                                                maximum: process.env.MAX_INVALID_LOGIN_ATTEMPTS || 5
                                              },
                                              lastFailedLoginAttempt: {
                                                bsonType: Schema.DataType.Date
                                              },
                                              lastSuccessfulLogin: {
                                                bsonType: Schema.DataType.Date
                                              }
                                            }
                                          }
                                        })
  };

  /**
   * Fetches the collection related with the schema from the database.
   *
   * @since 0.7.0
   * @returns {Collection}
   */
  getCollection ()
  {
    return this._db.collection(this._collectionName);
  }

  /**
   * Enforces the definition on insert and update operations in the collection.
   * Since the method is called inside the constructor and constructors cannot be asynchronous, if update the definition, and if you do an operation on the collection that the schema is related right after the instantiation of the schema the reflection of the updates might be later than the operation which might seem you as a bug.
   *
   * @since 0.7.0
   * @returns {Promise<void>}
   * @private
   */
  async _enforceDefinition ()
  {
    try
    {
      await this._db.createCollection(this._collectionName, {
        validator: {
          $jsonSchema: this._definition
        }
      });
    }
    catch (error)
    {
      switch (error.code)
      {
        case 48:
          try
          {
            await this._db.command({collMod: this._collectionName, validator: {$jsonSchema: this._definition}});
          }
          catch (error)
          {
            switch (error.code)
            {
              case 9:
                throw new DeveloperError("Invalid schema definition");
              default:
                Logger.error(`MongoDB level error is occurred: (CODE ${error.code}) ${error.message}`);
            }
          }

          break;
        case 9:
          throw new DeveloperError("Invalid schema definition");
        default:
          Logger.error(`MongoDB level error is occurred: (CODE ${error.code}) ${error.message}`);
      }
    }
  }

  /**
   * Validates the parameters for the constructor method.
   *
   * @since 0.5.0
   * @param {Db} db
   * @param {string} collectionName
   * @param {Object} [definition]
   * @protected
   */
  static _validateConstructorParameters (db, collectionName, definition)
  {
    if (!(db instanceof Db) ||
        !_.isString(collectionName) ||
        utility.isExist(definition) && !_.isPlainObject(definition))
    {
      throw new InvalidArgumentsError();
    }
  }
}

module.exports = Schema;
