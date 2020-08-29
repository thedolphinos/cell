"use strict";

const {InvalidArgumentsError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");
const {ObjectId} = require("mongodb");

const Schema = require("../db/Schema");
const DbOperation = require("../db/DbOperation");
const Service = require("../core/Service");
const CrudApplicationService = require("../services/CrudApplicationService");

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
   * @param {Schema | DbOperation | CrudApplicationService} schema_dbOperation_applicationService
   */
  constructor (schema_dbOperation_applicationService)
  {
    super();

    if (schema_dbOperation_applicationService instanceof Schema ||
        schema_dbOperation_applicationService instanceof DbOperation)
    {
      this._applicationService = new CrudApplicationService(schema_dbOperation_applicationService);
    }
    else if (schema_dbOperation_applicationService instanceof CrudApplicationService)
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
   * @return {CrudApplicationService}
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

    query = await this._hookQueryOfRead(query);
    options = await this._hookOptionsOfRead(options);

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

    await this._hookIdOfReadOneById(_id);
    options = await this._hookOptionsOfReadOneById(options);

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

    documentCandidate = this._validateAndConvertDocumentCandidate(documentCandidate, this.applicationService.dbOperation.schema.definition);

    documentCandidate = await this._hookDocumentCandidateOfCreateOne(documentCandidate);
    options = await this._hookOptionsOfCreateOne(options);

    return await this._applicationService.createOne(documentCandidate, options);
  }

  /**
   * Updates the matching document with the specified ID, version, document candidate, and options.
   *
   * @since 0.22.0
   * @param {string | ObjectId} _id
   * @param {string | number} version
   * @param {Object} documentCandidate
   * @param {Object} options
   * @return {Promise<Object>}
   */
  async updateOneByIdAndVersion (_id, version, documentCandidate, options = {})
  {
    if (!_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    _id = this._validateAndConvertObjectIdCandidate(_id);
    version = this._validateAndConvertVersion(version);
    documentCandidate = this._validateAndConvertDocumentCandidate(documentCandidate, this.applicationService.dbOperation.schema.definition);

    await this._hookIdAndVersionOfUpdateOneByIdAndVersion(_id, version);
    documentCandidate = await this._hookDocumentCandidateOfUpdateOneByIdAndVersion(documentCandidate);
    options = await this._hookOptionsOfUpdateOneByIdAndVersion(options);

    return await this._applicationService.updateOneByIdAndVersion(_id, version, documentCandidate, options);
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

    await this._hookIdAndVersionOfSoftDeleteOneByIdAndVersion(_id, version);
    options = await this._hookOptionsOfSoftDeleteOneByIdAndVersion(options);

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

    await this._hookIdAndVersionOfDeleteOneByIdAndVersion(_id, version);
    options = await this._hookOptionsOfDeleteOneByIdAndVersion(options);

    return await this._applicationService.deleteOneByIdAndVersion(_id, version, options);
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
  async _hookQueryOfRead (query)
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
  async _hookOptionsOfRead (options)
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
  async _hookIdOfReadOneById (_id)
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
  async _hookOptionsOfReadOneById (options)
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
  async _hookDocumentCandidateOfCreateOne (documentCandidate)
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
  async _hookOptionsOfCreateOne (options)
  {
    if (!_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    return options;
  }

  /**
   * Hooks ID and version for the method `updateOneByIdAndVersion`.
   *
   * @since 0.22.0
   * @param {ObjectId} _id
   * @param {number} version
   * @return {Promise<void>}
   * @protected
   */
  async _hookIdAndVersionOfUpdateOneByIdAndVersion (_id, version)
  {
    if (!utility.isObjectId(_id) ||
        !(utility.isValidNumber(version)))
    {
      throw new InvalidArgumentsError();
    }
  }

  /**
   * Hooks document candidate for the method `updateOneByIdAndVersion`.
   *
   * @since 0.22.0
   * @param {Object} documentCandidate
   * @return {Promise<Object>} - Document candidate.
   * @protected
   */
  async _hookDocumentCandidateOfUpdateOneByIdAndVersion (documentCandidate)
  {
    if (!_.isPlainObject(documentCandidate))
    {
      throw new InvalidArgumentsError();
    }

    return documentCandidate;
  }

  /**
   * Hooks to options for the method `updateOneByIdAndVersion`.
   *
   * @since 0.22.0
   * @param {Object} options
   * @protected
   */
  async _hookOptionsOfUpdateOneByIdAndVersion (options)
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
  async _hookIdAndVersionOfSoftDeleteOneByIdAndVersion (_id, version)
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
  async _hookOptionsOfSoftDeleteOneByIdAndVersion (options)
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
  async _hookIdAndVersionOfDeleteOneByIdAndVersion (_id, version)
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
  async _hookOptionsOfDeleteOneByIdAndVersion (options)
  {
    if (!_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }

    return options;
  }
}

module.exports = CrudControllerService;
