"use strict";

const {InvalidArgumentsError, BadRequestError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");
const {ObjectId} = require("mongodb");

const Schema = require("../db/Schema");
const DbOperation = require("../db/DbOperation");
const Service = require("../core/Service");
const ApplicationService = require("../services/ApplicationService");

/**
 * Contains the service CRUD logic of the framework in controller level.
 *
 * @since 0.22.0
 */
class CrudControllerService extends Service
{
  /**
   * Creates a controller service instance for the specified schema, database operation, or application service.
   * If a schema or database operation is provided, creates an application operation.
   *
   * @since 0.22.0
   * @param {Schema | DbOperation | ApplicationService} schema_dbOperation_applicationService
   */
  constructor (schema_dbOperation_applicationService)
  {
    super();

    if (schema_dbOperation_applicationService instanceof Schema ||
        schema_dbOperation_applicationService instanceof DbOperation)
    {
      this._applicationService = new ApplicationService(schema_dbOperation_applicationService);
    }
    else if (schema_dbOperation_applicationService instanceof ApplicationService)
    {
      this._applicationService = schema_dbOperation_applicationService;
    }
    else
    {
      throw new InvalidArgumentsError();
    }
  }

  /**
   * Gets the related application service.
   *
   * @return {ApplicationService}
   */
  get applicationService ()
  {
    return this._applicationService;
  }

  /**
   * Fetches the matching documents with the specified query and options.
   *
   * @since 0.22.0
   * @param {Object} query
   * @param {Object} [options]
   * @returns {Promise<Array>} - The fetched documents.
   */
  async read (query, options = {})
  {
    if (!_.isPlainObject(query) ||
        !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    query = await this._hook_read_query(query);
    options = await this._hook_read_options(options);

    return await this._applicationService.read(query, options);
  }

  /**
   * Fetches the matching document with the specified ID and options.
   *
   * @since 0.22.0
   * @param {string | ObjectId} _id
   * @param {Object} [options]
   * @returns {Promise<Object>} - The fetched document.
   */
  async readOneById (_id, options = {})
  {
    if (!_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    _id = this._validateAndConvertObjectIdCandidate(_id);

    await this._hook_readOneById_id(_id);
    options = await this._hook_readOneById_options(options);

    return await this._applicationService.readOneById(_id, options);
  }

  /**
   * Creates a document with the specified document candidate and options.
   *
   * @since 0.22.0
   * @param {Object} documentCandidate
   * @param {Object} [options]
   * @returns {Promise<Object>} - The created document.
   */
  async createOne (documentCandidate, options = {})
  {
    if (!_.isPlainObject(documentCandidate) ||
        !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    documentCandidate = this._authorizeDocumentCandidate(documentCandidate, this.applicationService.dbOperation.schema.definition, Schema.CONTROLLER_OPERATION.createOne);
    documentCandidate = this._validateAndConvertDocumentCandidate(documentCandidate, this.applicationService.dbOperation.schema.definition);

    documentCandidate = await this._hook_createOne_documentCandidate(documentCandidate);
    options = await this._hook_createOne_options(options);

    return await this._applicationService.createOne(documentCandidate, options);
  }

  /**
   * Partially updates the matching document with the specified ID, version, document candidate, and options.
   *
   * @since 0.22.0
   * @param {string | ObjectId} _id
   * @param {string | number} version
   * @param {Object} documentCandidate
   * @param {Object} options
   * @return {Promise<Object>}
   */
  async partialUpdateOneByIdAndVersion (_id, version, documentCandidate, options = {})
  {
    if (!_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    _id = this._validateAndConvertObjectIdCandidate(_id);
    version = this._validateAndConvertVersion(version);
    documentCandidate = this._validateAndConvertDocumentCandidate(documentCandidate, this.applicationService.dbOperation.schema.definition);

    await this._hook_partialUpdateOneByIdAndVersion_id_version(_id, version);
    documentCandidate = await this._hook_partialUpdateOneByIdAndVersion_documentCandidate(documentCandidate);
    options = await this._hook_partialUpdateOneByIdAndVersion_options(options);

    return await this._applicationService.partialUpdateOneByIdAndVersion(_id, version, documentCandidate, options);
  }

  /**
   * Soft deletes the matching document with the specified ID, version, and options.
   * Uses transactions. If a session is not provided externally, creates one internally.
   *
   * @since 0.22.0
   * @param {string | ObjectId} _id
   * @param {string | number} version
   * @param {Object} [options]
   * @returns {Promise<Object>} - The soft deleted document.
   */
  async softDeleteOneByIdAndVersion (_id, version, options = {})
  {
    if (!_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    _id = this._validateAndConvertObjectIdCandidate(_id);
    version = this._validateAndConvertVersion(version);

    await this._hook_softDeleteOneByIdAndVersion_id_version(_id, version);
    options = await this._hook_softDeleteOneByIdAndVersion_options(options);

    return await this._applicationService.softDeleteOneByIdAndVersion(_id, version, options);
  }

  /**
   * Deletes the matching document with the specified ID, version, and options.
   *
   * @since 0.22.0
   * @param {string | ObjectId} _id
   * @param {string | number} version
   * @param {Object} [options]
   * @returns {Promise<Object>} - The deleted document.
   */
  async deleteOneByIdAndVersion (_id, version, options = {})
  {
    if (!_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    _id = this._validateAndConvertObjectIdCandidate(_id);
    version = this._validateAndConvertVersion(version);

    await this._hook_deleteOneByIdAndVersion_id_version(_id, version);
    options = await this._hook_deleteOneByIdAndVersion_options(options);

    return await this._applicationService.deleteOneByIdAndVersion(_id, version, options);
  }

  /**
   * Authorizes document candidate for the specified operation according to the specified schema definition.
   *
   * @since 0.39.0
   * @param {*} candidate - Either the whole document candidate or in recursive calls a sub part of it.
   * @param {Object} schemaDefinition - The specified candidate's schema definition.
   * @param operation - The caller method name.
   * @private
   */
  _authorizeDocumentCandidate (candidate, schemaDefinition, operation)
  {
    if (!_.isPlainObject(schemaDefinition) ||
        !_.isString(operation))
    {
      throw new InvalidArgumentsError();
    }

    if (utility.isInitialized(schemaDefinition))
    {
      throw new BadRequestError(); // while the schema definition is not initialized, the client sent the candidate.
    }

    /* if the function is run, this means even if the candidate is null the key of the candidate is exist. so authorization must be applied using the specified schema definition. */
    let isCandidateAllowed = utility.isInitialized(schemaDefinition.controller[operation]) ? schemaDefinition.controller[operation] : true; // if nothing is specified in the schema definition, the property is allowed by default.

    if (!isCandidateAllowed)
    {
      throw new BadRequestError(); // while the candidate was marked as not allowed in the schema definition, the client sent the candidate.
    }

    let bsonType = schemaDefinition.bsonType;

    // the property can have more than 1 data type.
    if (_.isArray(bsonType))
    {
      let selectedBsonType;

      for (let i = 0; i < bsonType.length; i++)
      {
        // if the property has a non-null data type.
        if (bsonType[i] !== null)
        {
          // if the property has more than 1 non-null data type, it is not possible to validate and convert the candidate.
          if (utility.isInitialized(selectedBsonType))
          {
            selectedBsonType = ""; // to select default case.
            break;
          }

          selectedBsonType = bsonType[i];
        }
      }

      bsonType = selectedBsonType;
    }

    switch (bsonType)
    {
      case Schema.DataType.Object:
        if (!_.isPlainObject(candidate))
        {
          throw new BadRequestError(); // while the candidate is defined as an object in the schema definition, the client sent something else.
        }

        const keys = Object.keys(candidate);

        for (let i = 0; i < keys.length; i++)
        {
          const key = keys[i];
          const subCandidate = candidate[key];

          if (!utility.isExist(schemaDefinition.properties[key]))
          {
            throw new BadRequestError(); // the client sent a candidate which is not defined in the schema.
          }

          this._authorizeDocumentCandidate(subCandidate, schemaDefinition.properties[key], operation);
        }

        break;
      case Schema.DataType.Array:
        if (!_.isArray(candidate))
        {
          throw new BadRequestError(); // while the candidate is defined as an array in the schema definition, the client sent something else.
        }

        for (let i = 0; i < candidate.length; i++)
        {
          const item = candidate[i];

          this._authorizeDocumentCandidate(item, schemaDefinition.items, operation);
        }

        break;
    }
  }

  /* HOOKS */
  /**
   * Hooks query for the method `read`.
   *
   * @since 0.22.0
   * @param {Object} query
   * @return {Promise<Object>} - Query.
   * @protected
   */
  async _hook_read_query (query)
  {
    if (!_.isPlainObject(query))
    {
      throw new InvalidArgumentsError();
    }

    return query;
  }

  /**
   * Hooks to options for the method `read`.
   *
   * @since 0.22.0
   * @param {Object} options
   * @protected
   */
  async _hook_read_options (options)
  {
    if (!_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    return options;
  }

  /**
   * Hooks ID for the method `readOneById`.
   *
   * @since 0.22.0
   * @param {ObjectId} _id
   * @return {Promise<void>}
   * @protected
   */
  async _hook_readOneById_id (_id)
  {
    if (!utility.isObjectId(_id))
    {
      throw new InvalidArgumentsError();
    }
  }

  /**
   * Hooks to options for the method `readOneById`.
   *
   * @since 0.22.0
   * @param {Object} options
   * @protected
   */
  async _hook_readOneById_options (options)
  {
    if (!_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    return options;
  }

  /**
   * Hooks document candidate for the method `createOne`.
   *
   * @since 0.22.0
   * @param {Object} documentCandidate
   * @return {Promise<Object>} - Document candidate.
   * @protected
   */
  async _hook_createOne_documentCandidate (documentCandidate)
  {
    if (!_.isPlainObject(documentCandidate))
    {
      throw new InvalidArgumentsError();
    }

    return documentCandidate;
  }

  /**
   * Hooks to options for the method `createOne`.
   *
   * @since 0.22.0
   * @param {Object} options
   * @protected
   */
  async _hook_createOne_options (options)
  {
    if (!_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    return options;
  }

  /**
   * Hooks ID and version for the method `partialUpdateOneByIdAndVersion`.
   *
   * @since 0.22.0
   * @param {ObjectId} _id
   * @param {number} version
   * @return {Promise<void>}
   * @protected
   */
  async _hook_partialUpdateOneByIdAndVersion_id_version (_id, version)
  {
    if (!utility.isObjectId(_id) ||
        !(utility.isValidNumber(version)))
    {
      throw new InvalidArgumentsError();
    }
  }

  /**
   * Hooks document candidate for the method `partialUpdateOneByIdAndVersion`.
   *
   * @since 0.22.0
   * @param {Object} documentCandidate
   * @return {Promise<Object>} - Document candidate.
   * @protected
   */
  async _hook_partialUpdateOneByIdAndVersion_documentCandidate (documentCandidate)
  {
    if (!_.isPlainObject(documentCandidate))
    {
      throw new InvalidArgumentsError();
    }

    return documentCandidate;
  }

  /**
   * Hooks to options for the method `partialUpdateOneByIdAndVersion`.
   *
   * @since 0.22.0
   * @param {Object} options
   * @protected
   */
  async _hook_partialUpdateOneByIdAndVersion_options (options)
  {
    if (!_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    return options;
  }

  /**
   * Hooks ID and version for the method `softDeleteOneByIdAndVersion`.
   *
   * @since 0.22.0
   * @param {ObjectId} _id
   * @param {number} version
   * @return {Promise<void>}
   * @protected
   */
  async _hook_softDeleteOneByIdAndVersion_id_version (_id, version)
  {
    if (!utility.isObjectId(_id) ||
        !(utility.isValidNumber(version)))
    {
      throw new InvalidArgumentsError();
    }
  }

  /**
   * Hooks to options for the method `softDeleteOneByIdAndVersion`.
   *
   * @since 0.22.0
   * @param {Object} options
   * @protected
   */
  async _hook_softDeleteOneByIdAndVersion_options (options)
  {
    if (!_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    return options;
  }

  /**
   * Hooks ID and version for the method `deleteOneByIdAndVersion`.
   *
   * @since 0.22.0
   * @param {ObjectId} _id
   * @param {number} version
   * @return {Promise<void>}
   * @protected
   */
  async _hook_deleteOneByIdAndVersion_id_version (_id, version)
  {
    if (!utility.isObjectId(_id) ||
        !(utility.isValidNumber(version)))
    {
      throw new InvalidArgumentsError();
    }
  }

  /**
   * Hooks to options for the method `deleteOneByIdAndVersion`.
   *
   * @since 0.22.0
   * @param {Object} options
   * @protected
   */
  async _hook_deleteOneByIdAndVersion_options (options)
  {
    if (!_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    return options;
  }
}

module.exports = CrudControllerService;
