const {DeveloperError, InvalidArgumentsError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");
const {Collection} = require("mongodb");

const Logger = require("../core/Logger");
const DbSafe = require("../safes/DbSafe");
const ErrorSafe = require("../safes/ErrorSafe");
const LanguageSafe = require("../safes/LanguageSafe");
const DataType = require("./DataType");

/**
 * Represents definition and logical structure of a database collection.
 * Should be used as a super Class.
 */
class Schema
{
  /**
   * Creates a schema instance for the specified database and collection using the specified definition.
   * Must be used as a super Class.
   * The sub Class, must only be initialized in the related database operation. (e.g.`FooSchema` must only be initialized in `FooDbOperation`.)
   *
   * @param {string} dbName - The database name of the schema.
   * @param {string} collectionName - The name of the collection which the schema corresponds.
   * @param {Object} [definition] - The definition of the schema. See: https://docs.mongodb.com/manual/reference/operator/query/jsonSchema/
   * @param {boolean} [isEnforceDefinition] - Indicates if `definition` will be enforced or not. Default is `true`. If provided, `definition` also must be provided.
   */
  constructor (dbName, collectionName, definition = undefined, isEnforceDefinition = undefined)
  {
    this._validateConstructorParams(dbName, collectionName, definition, isEnforceDefinition);
    isEnforceDefinition = utility.init(isEnforceDefinition, true);

    this._db = DbSafe.get(dbName);
    this._dbName = dbName;
    this._collectionName = collectionName;
    this._definition = definition;

    if (utility.isExist(definition) && isEnforceDefinition)
    {
      this._enforceDefinition();
    }
  }

  /**
   * @return {Object}
   */
  get definition ()
  {
    return this._definition;
  }

  /**
   * Data types for definitions.
   *
   * @type {DataType}
   */
  static DataType = DataType;

  static CONTROLLER_OPERATION = {
    read: "read",
    createOne: "createOne",
    updateOneByIdAndVersion: "updateOneByIdAndVersion",
    replaceOneByIdAndVersion: "replaceOneByIdAndVersion"
  };

  /**
   * Definitions for common properties.
   *
   * @type {{CommonRules: Object, CommonProperties: Object}}
   */
  static Definition = {
    CommonRules: {
      additionalProperties: false
    },

    CommonProperties: {
      _id: {
        bsonType: Schema.DataType.ObjectId,
        controller: {
          createOne: false,
          updateOneByIdAndVersion: false
        }
      },
      version: {
        bsonType: Schema.DataType.Int,
        controller: {
          createOne: false,
          updateOneByIdAndVersion: false
        }
      },
      isSoftDeleted: {
        bsonType: Schema.DataType.Boolean,
        controller: {
          createOne: false,
          updateOneByIdAndVersion: false
        }
      },
      createdAt: {
        bsonType: Schema.DataType.Date,
        controller: {
          createOne: false,
          updateOneByIdAndVersion: false
        }
      }
    },

    CommonAuthProperties: {
      auth: {
        bsonType: Schema.DataType.Object,
        controller: {
          createOne: false,
          updateOneByIdAndVersion: false
        },
        properties: {
          isBlocked: {
            bsonType: Schema.DataType.Boolean
          },
          numberOfFailedLoginAttempts: {
            bsonType: Schema.DataType.Int,
            minimum: 0
          },
          numberOfFailedChangePasswordAttempts: {
            bsonType: Schema.DataType.Int,
            minimum: 0
          },
          lastFailedLoginAttempt: {
            bsonType: Schema.DataType.Date
          },
          lastFailedChangePasswordAttempt: {
            bsonType: Schema.DataType.Date
          },
          lastSuccessfulLogin: {
            bsonType: Schema.DataType.Date
          },
          lastSuccessfulChangePassword: {
            bsonType: Schema.DataType.Date
          }
        }
      }
    }
  };

  /**
   * Fetches the collection related with the schema from the database.
   *
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
                throw new DeveloperError(ErrorSafe.get().DB_INVALID_SCHEMA);
              default:
                Logger.error(`MongoDB level error is occurred: (CODE ${error.code}) ${error.message}`);
            }
          }

          break;
        case 9:
          throw new DeveloperError(ErrorSafe.get().DB_INVALID_SCHEMA);
        default:
          Logger.error(`MongoDB level error is occurred: (CODE ${error.code}) ${error.message}`);
      }
    }
  }

  /**
   * Generates MongoDB's JSON schema using definition.
   *
   * @return {Object}
   * @private
   */
  _generateJsonSchema ()
  {
    const definition = _.cloneDeep(this._definition);
    this._validateAndCleanDefinition(definition);
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
   * @param {Object} definition
   * @private
   */
  _validateAndCleanDefinition (definition)
  {
    if (!_.isPlainObject(definition))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    if (utility.isInitialized(definition))
    {
      const isMultilingual = definition.isMultilingual || false;

      this._validateAndCleanDefinitionForControllerOperation(definition);
      this._validateAndCleanDefinitionForMultilingualIndicator(definition);

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
            this._validateAndCleanDefinition(subDefinition);
          }

          break;
        case Schema.DataType.Array:
          this._validateAndCleanDefinition(definition.items);
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
   * Validates and removes controller operation from the specified definition for MongoDB's JSON schema.
   *
   * !!! Works on reference.
   *
   * @param {Object} definition
   * @private
   */
  _validateAndCleanDefinitionForControllerOperation (definition)
  {
    if (!_.isPlainObject(definition))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    if (utility.isExist(definition.controller))
    {
      const allowedControllerOperations = Object.keys(Schema.CONTROLLER_OPERATION);

      for (const controllerOperation in definition.controller)
      {
        if (!allowedControllerOperations.includes(controllerOperation))
        {
          throw new DeveloperError(ErrorSafe.get().SCHEMA_CUSTOM_INVALID_CONTROLLER_OP, this._dbName, this._collectionName, controllerOperation);
        }

        if (!_.isBoolean(definition.controller[controllerOperation]))
        {
          throw new DeveloperError(ErrorSafe.get().SCHEMA_CUSTOM_INVALID_CONTROLLER_OP_VALUE, this._dbName, this._collectionName, controllerOperation, definition.controller[controllerOperation]);
        }
      }

      delete definition.controller;
    }
  }

  /**
   * Validates and removes multilingual indicator from the specified definition for MongoDB's JSON schema.
   *
   * !!! Works on reference.
   *
   * @param {Object} definition
   * @private
   */
  _validateAndCleanDefinitionForMultilingualIndicator (definition)
  {
    if (!_.isPlainObject(definition))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    if (utility.isExist(definition.isMultilingual))
    {
      if (!_.isBoolean(definition.isMultilingual))
      {
        throw new DeveloperError(ErrorSafe.get().SCHEMA_CUSTOM_INVALID_CONTROLLER_OP_VALUE);
      }

      delete definition.isMultilingual;
    }
  }

  /**
   * Makes definitions multilingual.
   *
   * !!! Works on reference.
   *
   * @param definition
   * @private
   */
  _makeDefinitionMultilingual (definition)
  {
    if (!_.isPlainObject(definition))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    const languages = LanguageSafe.get();

    if (!utility.isInitialized(languages))
    {
      throw new DeveloperError(ErrorSafe.get().LANGUAGE_SAFE);
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
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
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
   * @param {string} dbName
   * @param {string} collectionName
   * @param {Object} [definition]
   * @param {boolean} [isEnforceDefinition]
   * @protected
   */
  _validateConstructorParams (dbName, collectionName, definition = undefined, isEnforceDefinition = undefined)
  {
    if (!_.isString(dbName) ||
        !_.isString(collectionName) ||
        (utility.isExist(definition) && !_.isPlainObject(definition)) ||
        (utility.isExist(isEnforceDefinition) && !_.isBoolean(isEnforceDefinition)) ||
        (utility.isExist(isEnforceDefinition) && !utility.isExist(definition)))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }
  }
}

module.exports = Schema;
