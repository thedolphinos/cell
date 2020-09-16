"use strict";

const {DeveloperError, InvalidArgumentsError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");
const {Collection} = require("mongodb");

const Logger = require("../core/Logger");
const DbSafe = require("../safes/DbSafe");
const LanguageSafe = require("../safes/LanguageSafe");
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
   * @param {string} dbName - The database name of the schema.
   * @param {string} collectionName - The name of the collection which the schema corresponds.
   * @param {Object} [definition] - The definition of the schema. See: https://docs.mongodb.com/manual/reference/operator/query/jsonSchema/
   */
  constructor (dbName, collectionName, definition = null)
  {
    this._validateConstructorParameters(dbName, collectionName, definition);

    this._db = DbSafe.get(dbName);
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
   * Controller operations.
   *
   * @since 0.39.0
   * @type {Readonly<{Object}>}
   */
  static CONTROLLER_OPERATION = Object.freeze({
                                                createOne: "createOne",
                                                partialUpdateOneByIdAndVersion: "partialUpdateOneByIdAndVersion"
                                              });

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
                                        bsonType: Schema.DataType.ObjectId,
                                        controller: {
                                          createOne: false,
                                          partialUpdateOneByIdAndVersion: false
                                        }
                                      },
                                      version: {
                                        bsonType: Schema.DataType.Int,
                                        controller: {
                                          createOne: false,
                                          partialUpdateOneByIdAndVersion: false
                                        }
                                      },
                                      isSoftDeleted: {
                                        bsonType: Schema.DataType.Boolean,
                                        controller: {
                                          createOne: false,
                                          partialUpdateOneByIdAndVersion: false
                                        }
                                      }
                                    }),

    CommonAuthProperties: Object.freeze({
                                          auth: {
                                            bsonType: Schema.DataType.Object,
                                            controller: {
                                              createOne: false,
                                              partialUpdateOneByIdAndVersion: false
                                            },
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
    const jsonSchema = this._generateJsonSchema();

    try
    {
      await this._db.createCollection(this._collectionName, {
        validator: {
          $jsonSchema: jsonSchema
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
            await this._db.command({collMod: this._collectionName, validator: {$jsonSchema: jsonSchema}});
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
   * Generates MongoDB's JSON schema using definition.
   *
   * @since 0.36.0
   * @return {Object}
   * @private
   */
  _generateJsonSchema ()
  {
    const definition = _.cloneDeep(this._definition);
    this._cleanDefinition(definition);
    return definition;
  }

  /**
   * Shapes the definition to MongoDB's JSON schema.
   * Removes the framework specific keys from definition.
   *
   * The framework specific keys:
   *   isMultilingual - Provides multilingual support for the following properties according to the languages in the language safe.
   *   controller - Provides controller level authorization for schema properties.
   *
   * !!! Works on reference.
   *
   * @since 0.36.0
   * @param {Object} definition
   * @private
   */
  _cleanDefinition (definition)
  {
    if (!_.isPlainObject(definition))
    {
      throw new InvalidArgumentsError();
    }

    if (utility.isInitialized(definition))
    {
      const isMultilingual = definition.isMultilingual || false;

      delete definition.isMultilingual;
      delete definition.controller;

      switch (Schema.identifyBsonType(definition))
      {
        case Schema.DataType.Object:
          if (isMultilingual)
          {
            this._makeDefinitionMultilingual(definition);
          }

          for (const property in definition.properties)
          {
            const subDefinition = definition.properties[property];
            this._cleanDefinition(subDefinition);
          }

          break;
        case Schema.DataType.Array:
          this._cleanDefinition(definition.items);
          break;
        default:
          if (isMultilingual)
          {
            this._makeDefinitionMultilingual(definition);
          }
      }
    }
  }

  /**
   * Makes definitions multilingual.
   *
   * !!! Works on reference.
   *
   * @since 0.53.0
   * @param definition
   * @private
   */
  _makeDefinitionMultilingual (definition)
  {
    if (!_.isPlainObject(definition))
    {
      throw new InvalidArgumentsError();
    }

    const languages = LanguageSafe.get();

    if (!utility.isInitialized(languages))
    {
      throw new DeveloperError("In order to make schema multilingual, you must place your languages to language safe.");
    }

    // clone definition
    const definitionClone = {};

    for (const key in definition)
    {
      definitionClone[key] = _.cloneDeep(definition[key]); // clone all definition keys.
      delete definition[key]; // delete all property references.
    }

    // place each language under the definition.
    definition.bsonType = Schema.DataType.Object;
    definition.properties = {};

    for (const language of languages)
    {
      definition.properties[language] = definitionClone;
    }
  }

  /**
   * Identifies the BSON type of a definition.
   *
   * @since 0.52.0
   * @param {Object} definition
   * @return {string} - The identified BSON type.
   * @example
   * // returns "int"
   * bsonType: "int"
   *
   * // returns "int"
   * bsonType: ["int" null]
   *
   * // returns null
   * bsonType: ["int", "double"]
   */
  static identifyBsonType (definition)
  {
    if (!_.isPlainObject(definition))
    {
      throw new InvalidArgumentsError();
    }

    let bsonType = definition.bsonType;

    // the property can have more than 1 BSON type.
    if (_.isArray(bsonType))
    {
      let identifiedBsonType;

      for (const key of bsonType)
      {
        // if the property has a non-null BSON type.
        if (!utility.isExist(key))
        {
          // if the property has more than 1 non-null BSON type, it is not possible to identify a single BSON type.
          if (utility.isInitialized(identifiedBsonType))
          {
            identifiedBsonType = null;
            break;
          }

          identifiedBsonType = key;
        }
      }

      bsonType = identifiedBsonType;
    }

    return bsonType;
  }

  /**
   * Validates the parameters for the constructor method.
   *
   * @since 0.5.0
   * @param {string} dbName
   * @param {string} collectionName
   * @param {Object} [definition]
   * @protected
   */
  _validateConstructorParameters (dbName, collectionName, definition)
  {
    if (!_.isString(dbName) ||
        !_.isString(collectionName) ||
        utility.isExist(definition) && !_.isPlainObject(definition))
    {
      throw new InvalidArgumentsError();
    }
  }
}

module.exports = Schema;
