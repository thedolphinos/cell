"use strict";

const {DocumentNotFoundError, MoreThan1DocumentFoundError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");

const ApplicationService = require("./ApplicationService");

/**
 * Contains the service CRUD logic of the framework in application level.
 *
 * @since 0.22.0
 */
class CrudApplicationService extends ApplicationService
{
  /**
   * Creates a CRUD application service instance for the specified schema or database operation.
   *
   * @since 0.22.0
   * @param {Schema | DbOperation} schema_dbOperation
   */
  constructor (schema_dbOperation)
  {
    super(schema_dbOperation);
  }

  /**
   * @since 0.22.0
   */
  async _hookResultOfReadOne (document)
  {
    document = await super._hookResultOfReadOne(document);

    if (!utility.isExist(document))
    {
      throw new DocumentNotFoundError();
    }

    return document;
  }

  /**
   * @since 0.22.0
   */
  async _hookReadResultOfUpdateOne (documents)
  {
    documents = await super._hookReadResultOfUpdateOne(documents);

    switch (documents.length)
    {
      case 0:
        throw new DocumentNotFoundError();
      case 1:
        break;
      default:
        throw new MoreThan1DocumentFoundError();
    }

    return documents;
  }

  /**
   * @since 0.22.0
   */
  async _hookReadResultOfDeleteOne (documents)
  {
    documents = await super._hookReadResultOfUpdateOne(documents);

    switch (documents.length)
    {
      case 0:
        throw new DocumentNotFoundError();
      case 1:
        break;
      default:
        throw new MoreThan1DocumentFoundError();
    }

    return documents;
  }
}

module.exports = CrudApplicationService;
