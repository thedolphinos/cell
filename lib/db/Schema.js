const {
  DeveloperError,
  InvalidArgumentsError
} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");

const _ = require("lodash");
const {Collection} = require("mongodb");

const Logger = require("../core/Logger");
const ErrorSafe = require("../safes/ErrorSafe");
const DbSafe = require("../safes/DbSafe");
const LanguageSafe = require("../safes/LanguageSafe");
const BsonType = require("./BsonType");

/**
 * Represents definition and logical structure of a database collection.
 * Should be used as a super Class.
 */
class Schema
{
  /**
   * Maps special forbidden for personas to values.
   *
   * @type {{ALL: string}}
   * @public
   */
  static SPECIAL_FORBIDDEN_FOR_PERSONA = {
    "ALL": "*"
  };

  /**
   * Creates a schema instance for the specified database and collection using the specified definition.
   * Must be used as a super Class.
   * The sub Class, must only be initialized in the related database operation. (e.g.`FooSchema` must only be initialized in `FooDbOperation`.)
   *
   * @param {string} dbName - The database name of the schema.
   * @param {string} collectionName - The name of the collection which the schema corresponds.
   * @param {Object} [definition] - The definition of the schema. See: https://docs.mongodb.com/manual/reference/operator/query/jsonSchema/
   * @param {Object} [options] - The options.
   * @param {boolean} [options.isAddCommonProperties] - Controls adding the common properties (_id, version, isSoftDeleted) to the definition. Default is `false`.
   * @param {boolean} [options.isHistoryEnabled] - Indicates if the schema is version based or not. Default is `false`.
   * @param {boolean} [options.isValidationEnabled] - Indicates if `definition` will be enforced or not. Default is `true`.
   */
  constructor (dbName, collectionName, definition = undefined, options = undefined)
  {
    options = utility.init(options, {bsonType: BsonType.Object});
    options.isAddCommonProperties = utility.init(options.isAddCommonProperties, false);
    options.isHistoryEnabled = utility.init(options.isHistoryEnabled, false);
    options.isValidationEnabled = utility.init(options.isValidationEnabled, true);
    this._validateConstructorParams(dbName, collectionName, definition, options);

    this._dbName = dbName;
    this._collectionName = collectionName;
    this._definition = definition;
    this._isAddCommonProperties = options.isAddCommonProperties;
    this._isHistoryEnabled = options.isHistoryEnabled;

    this._db = DbSafe.get(dbName);
    this._collection = this._db.collection(collectionName);

    if (this._isAddCommonProperties)
    {
      this._definition.properties = utility.init(this._definition.properties, {});
      this._definition.required = utility.init(this._definition.required, []);

      if (!utility.isExist(this._definition.properties._id))
      {
        this._definition.properties._id = {bsonType: BsonType.ObjectId};
        this._definition.required.push("_id");
      }

      if (!utility.isExist(this._definition.properties.version))
      {
        this._definition.properties.version = {bsonType: BsonType.Int};
        this._definition.required.push("version");
      }

      if (!utility.isExist(this._definition.properties.isSoftDeleted))
      {
        this._definition.properties.isSoftDeleted = {
          bsonType: BsonType.Boolean,
          forbiddenForPersonas: [Schema.SPECIAL_FORBIDDEN_FOR_PERSONA.ALL]
        };
        this._definition.required.push("isSoftDeleted");
      }

      this._collection.createIndex({isSoftDeleted: 1});
    }

    if (options.isHistoryEnabled)
    {
      this._definition.properties = utility.init(this._definition.properties, {});
      this._definition.required = utility.init(this._definition.required, []);

      this._definition.properties._root = {
        bsonType: BsonType.ObjectId,
        forbiddenForPersonas: [Schema.SPECIAL_FORBIDDEN_FOR_PERSONA.ALL]
      };
      this._definition.required.push("_root");

      this._definition.properties.isRecent = {
        bsonType: BsonType.Boolean,
        forbiddenForPersonas: [Schema.SPECIAL_FORBIDDEN_FOR_PERSONA.ALL]
      };
      this._definition.required.push("isRecent");

      this._rootSchema = new Schema(
        dbName,
        `root${collectionName.charAt(0).toUpperCase()}${collectionName.substring(1)}`,
        {
          bsonType: BsonType.Object,
          additionalProperties: false,
          forbiddenForPersonas: Schema.SPECIAL_FORBIDDEN_FOR_PERSONA.ALL
        },
        {
          isAddCommonProperties: true,
          isHistoryEnabled: false,
          isValidationEnabled: true
        }
      );

      this._collection.createIndex({isRecent: 1});
      this._collection.createIndex({_root: 1, version: 1}, {unique: true});
    }

    this._createCollection(options.isValidationEnabled);
  }

  /**
   * @return {Object}
   */
  get definition ()
  {
    return this._definition;
  }

  /**
   * @return {boolean}
   */
  get isHistoryEnabled ()
  {
    return this._isHistoryEnabled;
  }

  /**
   * @return {Schema}
   */
  get rootSchema ()
  {
    return this._rootSchema;
  }

  /**
   * Definitions for common properties.
   *
   * @type {{CommonRules: Object, CommonProperties: Object, CommonAuthProperties: Object}}
   */
  static Definition = {
    CommonRules: {
      additionalProperties: false
    },

    CommonProperties: {
      _id: {
        bsonType: BsonType.ObjectId
      },
      version: {
        bsonType: BsonType.Int
      },
      isSoftDeleted: {
        bsonType: BsonType.Boolean
      },
      createdAt: {
        bsonType: BsonType.Date
      }
    },

    CommonAuthProperties: {
      auth: {
        bsonType: BsonType.Object,
        properties: {
          isBlocked: {
            bsonType: BsonType.Boolean
          },
          numberOfFailedLoginAttempts: {
            bsonType: BsonType.Int,
            minimum: 0
          },
          numberOfFailedChangePasswordAttempts: {
            bsonType: BsonType.Int,
            minimum: 0
          },
          lastFailedLoginAttempt: {
            bsonType: BsonType.Date
          },
          lastFailedChangePasswordAttempt: {
            bsonType: BsonType.Date
          },
          lastSuccessfulLogin: {
            bsonType: BsonType.Date
          },
          lastSuccessfulChangePassword: {
            bsonType: BsonType.Date
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
    return this._collection;
  }

  /**
   * Creates the collection in DB.
   *
   * @param {boolean} isValidationEnabled
   * @returns {Promise<void>}
   * @private
   */
  async _createCollection (isValidationEnabled)
  {
    const collMod = this._collectionName;
    const validator = isValidationEnabled ? {$jsonSchema: this._generateJsonSchema()} : {};
    const validationLevel = isValidationEnabled ? "moderate" : "off";

    try
    {
      await this._db.createCollection(collMod, {validator, validationLevel}); // since the method is called inside the constructor and constructors cannot be asynchronous, if update the definition, and if you do an operation on the collection that the schema is related right after the instantiation of the schema the reflection of the updates might be later than the operation which might seem you as a bug.
    }
    catch (error)
    {
      switch (error.code)
      {
        case 48:
        {
          try
          {
            await this._db.command({collMod, validator, validationLevel});
          }
          catch (error)
          {
            switch (error.code)
            {
              case 9:
              {
                throw new DeveloperError(ErrorSafe.get().DB_INVALID_SCHEMA);
              }
              default:
              {
                Logger.error(`MongoDB level error is occurred: (CODE ${error.code}) ${error.message}`);
              }
            }
          }

          break;
        }
        case 9:
        {
          throw new DeveloperError(ErrorSafe.get().DB_INVALID_SCHEMA);
        }
        default:
        {
          Logger.error(`MongoDB level error is occurred: (CODE ${error.code}) ${error.message}`);
        }
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
   *   forbiddenForPersonas - Provides persona based restriction to the properties.
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

      this._validateAndCleanDefinitionForMultilingualPropertyIndicator(definition);
      this._validateAndCleanDefinitionForForbiddenPropertyIndicator(definition);

      switch (Schema.identifyBsonType(definition))
      {
        case BsonType.Object:
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
        case BsonType.Array:
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
   * Validates and removes multilingual property indicator from the specified definition for MongoDB's JSON schema.
   *
   * !!! Works on reference.
   *
   * @param {Object} definition
   * @private
   */
  _validateAndCleanDefinitionForMultilingualPropertyIndicator (definition)
  {
    if (!_.isPlainObject(definition))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    if (utility.isExist(definition.isMultilingual))
    {
      if (!_.isBoolean(definition.isMultilingual))
      {
        throw new DeveloperError(ErrorSafe.get().DB_INVALID_SCHEMA);
      }

      delete definition.isMultilingual;
    }
  }

  /**
   * Validates and removes forbidden property indicator from the specified definition for MongoDB's JSON schema.
   *
   * !!! Works on reference.
   *
   * @param {Object} definition
   * @private
   */
  _validateAndCleanDefinitionForForbiddenPropertyIndicator (definition)
  {
    if (!_.isPlainObject(definition))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    if (utility.isExist(definition.forbiddenForPersonas))
    {
      if (_.isString(definition.forbiddenForPersonas))
      {
        if (!_.isEqual(definition.forbiddenForPersonas, Schema.SPECIAL_FORBIDDEN_FOR_PERSONA.ALL))
        {
          throw new DeveloperError(ErrorSafe.get().DB_INVALID_SCHEMA);
        }
      }
      else if (_.isArray(definition.forbiddenForPersonas))
      {
        for (const persona of definition.forbiddenForPersonas)
        {
          if (!_.isString(persona))
          {
            throw new DeveloperError(ErrorSafe.get().DB_INVALID_SCHEMA);
          }
        }
      }
      else
      {
        throw new DeveloperError(ErrorSafe.get().DB_INVALID_SCHEMA);
      }

      delete definition.forbiddenForPersonas;
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
    definition.bsonType = BsonType.Object;
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
   * Validates the parameters of the constructor method.
   *
   * @param {string} dbName
   * @param {string} collectionName
   * @param {Object} [definition]
   * @param {Object} [options]
   * @param {boolean} [options.isAddCommonProperties]
   * @param {boolean} [options.isHistoryEnabled]
   * @param {boolean} [options.isValidationEnabled]
   * @protected
   */
  _validateConstructorParams (dbName, collectionName, definition = undefined, options = undefined)
  {
    if (!_.isString(dbName) ||
        !_.isString(collectionName) ||
        (utility.isExist(definition) && !_.isPlainObject(definition)) ||
        (utility.isExist(options) && !_.isPlainObject(options)) ||
        (utility.isExist(options.isAddCommonProperties) && !_.isBoolean(options.isAddCommonProperties)) ||
        (utility.isExist(options.isHistoryEnabled) && !_.isBoolean(options.isHistoryEnabled)) ||
        (utility.isExist(options.isValidationEnabled) && !_.isBoolean(options.isValidationEnabled)))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }
  }
}

module.exports = Schema;
