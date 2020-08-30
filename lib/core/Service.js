"use strict";

const {InvalidArgumentsError, BadRequestError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");
const {ClientSession, Int32, Double, ObjectId} = require("mongodb");

const DbConnectionSafe = require("../safes/DbConnectionSafe");
const Schema = require("../db/Schema");

/**
 * Contains the service logic of the framework.
 * Must be used as a super class.
 *
 * @since 0.14.0
 */
class Service
{
  /**
   * Starts a client session.
   *
   * @since 0.22.0
   * @return {ClientSession}
   * @protected
   */
  _startSession ()
  {
    return DbConnectionSafe.get().mongoClient.startSession();
  }

  /**
   * Validates the specified candidate and converts it to the matching data type if possible.
   *
   * @since 0.14.0
   * @param {*} candidate - Either the whole document candidate or in recursive calls a sub part of it.
   * @param {Object} schemaDefinition - The specified candidate's schema definition.
   * @param {Object | Array} generatedCandidate - The generated document candidate. In recursive calls, the related part of it is passed by reference.
   * @return {Object | Array} - Processed candidate in the appropriate data type for database.
   * @protected
   */
  _validateAndConvertDocumentCandidate (candidate, schemaDefinition, generatedCandidate = null)
  {
    if (!_.isPlainObject(schemaDefinition) ||
        (utility.isExist(generatedCandidate) && !_.isPlainObject(generatedCandidate) && !_.isArray(generatedCandidate)))
    {
      throw new InvalidArgumentsError();
    }

    // the property can have more than 1 data type. processing is not possible.
    if (_.isArray(schemaDefinition.bsonType))
    {
      return candidate;
    }

    switch (schemaDefinition.bsonType)
    {
      case Schema.DataType.Boolean:
        return this._validateAndConvertBooleanCandidate(candidate);
      case Schema.DataType.Int:
        return this._validateAndConvertIntCandidate(candidate);
      case Schema.DataType.Double:
        return this._validateAndConvertDoubleCandidate(candidate);
      case Schema.DataType.String:
        return this._validateAndConvertStringCandidate(candidate);
      case Schema.DataType.ObjectId:
        return this._validateAndConvertObjectIdCandidate(candidate);
      case Schema.DataType.Date:
        return this._validateAndConvertDateCandidate(candidate);
      case Schema.DataType.Object:
        return this._validateAndConvertObjectCandidate(candidate, schemaDefinition, generatedCandidate);
      case Schema.DataType.Array:
        return this._validateAndConvertArrayCandidate(candidate, schemaDefinition, generatedCandidate);
      default:
        throw new InvalidArgumentsError();
    }
  }

  /**
   * Validates the specified candidate and converts it to boolean if possible.
   *
   * @since 0.14.0
   * @param {string | boolean} candidate
   * @return {boolean}
   * @protected
   */
  _validateAndConvertBooleanCandidate (candidate)
  {
    if (!utility.isExist(candidate))
    {
      return null;
    }

    if (!_.isString(candidate) && !_.isBoolean(candidate))
    {
      throw new BadRequestError();
    }

    if (_.isString(candidate))
    {
      if (candidate === "true")
      {
        candidate = true;
      }
      else if (candidate === "false")
      {
        candidate = false;
      }
    }

    if (!_.isBoolean(candidate))
    {
      throw new BadRequestError();
    }

    return candidate;
  }

  /**
   * Validates the specified candidate and converts it to 32-bit integer number if possible.
   *
   * @since 0.14.0
   * @param {string | number} candidate
   * @return {Int32}
   * @protected
   */
  _validateAndConvertIntCandidate (candidate)
  {
    if (!utility.isExist(candidate))
    {
      return null;
    }

    if (candidate instanceof Int32)
    {
      return candidate;
    }

    if (!_.isString(candidate) && !utility.isValidNumber(candidate))
    {
      throw new BadRequestError();
    }

    candidate = new Int32(candidate);

    if (!utility.isValidNumber(candidate.value) || candidate.value % 1 !== 0)
    {
      throw new BadRequestError();
    }

    return candidate;
  }

  /**
   * Validates the specified candidate and converts it to 64-bit floating point number if possible.
   *
   * @since 0.14.0
   * @param {string | number} candidate
   * @return {Double}
   * @protected
   */
  _validateAndConvertDoubleCandidate (candidate)
  {
    if (!utility.isExist(candidate))
    {
      return null;
    }

    if (candidate instanceof Double)
    {
      return candidate;
    }

    if (!_.isString(candidate) && !utility.isValidNumber(candidate))
    {
      throw new BadRequestError();
    }

    candidate = new Double(candidate);

    if (!utility.isValidNumber(candidate.value))
    {
      throw new BadRequestError();
    }

    return candidate;
  }

  /**
   * Validates the specified candidate.
   *
   * @since 0.14.0
   * @param {string} candidate
   * @return {string}
   * @protected
   */
  _validateAndConvertStringCandidate (candidate)
  {
    if (!utility.isExist(candidate))
    {
      return null;
    }

    if (!_.isString(candidate))
    {
      throw new BadRequestError();
    }

    return candidate;
  }

  /**
   * Validates the specified candidate and converts it to object ID if possible.
   *
   * @since 0.14.0
   * @param {string | ObjectId} candidate
   * @return {ObjectId}
   * @protected
   */
  _validateAndConvertObjectIdCandidate (candidate)
  {
    if (!utility.isExist(candidate))
    {
      return null;
    }

    if (candidate instanceof ObjectId)
    {
      return candidate;
    }

    if (!_.isString(candidate) && !utility.isObjectId(candidate))
    {
      throw new BadRequestError();
    }

    if (_.isString(candidate))
    {
      const newValue = new ObjectId(candidate);

      if (newValue.toString() !== candidate)
      {
        throw new BadRequestError();
      }

      candidate = newValue;
    }

    return candidate;
  }

  /**
   * Validates the specified candidate and converts it to date object if possible.
   *
   * @since 0.14.0
   * @param {string | Date} candidate
   * @return {Date}
   * @protected
   */
  _validateAndConvertDateCandidate (candidate)
  {
    if (!utility.isExist(candidate))
    {
      return null;
    }

    if (!_.isString(candidate) && !utility.isValidDate(candidate))
    {
      throw new BadRequestError();
    }

    if (_.isString(candidate))
    {
      candidate = new Date(candidate);
    }

    return candidate;
  }

  /**
   * Validates the specified candidate deeply.
   *
   * @since 0.14.0
   * @param {Object} candidate
   * @param {Object} schemaDefinition
   * @param {Object} [generatedCandidate]
   * @return {Object}
   * @protected
   */
  _validateAndConvertObjectCandidate (candidate, schemaDefinition, generatedCandidate = null)
  {
    if (!utility.isExist(candidate))
    {
      return null;
    }

    if (!_.isPlainObject(candidate) ||
        !_.isPlainObject(schemaDefinition) ||
        (utility.isExist(generatedCandidate) && !_.isPlainObject(generatedCandidate)))
    {
      throw new InvalidArgumentsError();
    }

    if (!utility.isExist(generatedCandidate))
    {
      generatedCandidate = {};
    }

    const keys = Object.keys(candidate);

    for (let i = 0; i < keys.length; i++)
    {
      const key = keys[i];
      const value = candidate[key];

      if (!utility.isExist(schemaDefinition.properties[key]))
      {
        throw new BadRequestError();
      }

      switch (schemaDefinition.properties[key].bsonType)
      {
        case Schema.DataType.Boolean:
          generatedCandidate[key] = this._validateAndConvertBooleanCandidate(value);
          break;
        case Schema.DataType.Int:
          generatedCandidate[key] = this._validateAndConvertIntCandidate(value);
          break;
        case Schema.DataType.Double:
          generatedCandidate[key] = this._validateAndConvertDoubleCandidate(value);
          break;
        case Schema.DataType.String:
          generatedCandidate[key] = this._validateAndConvertStringCandidate(value);
          break;
        case Schema.DataType.ObjectId:
          generatedCandidate[key] = this._validateAndConvertObjectIdCandidate(value);
          break;
        case Schema.DataType.Date:
          generatedCandidate[key] = this._validateAndConvertDateCandidate(value);
          break;
        case Schema.DataType.Object:
          generatedCandidate[key] = this._validateAndConvertDocumentCandidate(value, schemaDefinition.properties[key], generatedCandidate[key]);
          break;
        case Schema.DataType.Array:
          generatedCandidate[key] = this._validateAndConvertArrayCandidate(value, schemaDefinition.properties[key], generatedCandidate[key]);
          break;
        default:
          generatedCandidate[key] = value; // if BSON type is not specified, leave value as is.
      }
    }

    return generatedCandidate;
  }

  /**
   * Validates the specified candidate deeply.
   *
   * @since 0.14.0
   * @param {Array} candidate
   * @param {Object} schemaDefinition
   * @param {Array} [generatedCandidate]
   * @return {Array}
   * @protected
   */
  _validateAndConvertArrayCandidate (candidate, schemaDefinition, generatedCandidate = null)
  {
    if (!utility.isExist(candidate))
    {
      return null;
    }

    if (!_.isArray(candidate) ||
        !_.isPlainObject(schemaDefinition) ||
        (utility.isExist(generatedCandidate) && !_.isArray(generatedCandidate)))
    {
      throw new InvalidArgumentsError();
    }

    if (!utility.isExist(generatedCandidate))
    {
      generatedCandidate = [];
    }

    for (let i = 0; i < candidate.length; i++)
    {
      const value = candidate[i];

      switch (schemaDefinition.items.bsonType)
      {
        case Schema.DataType.Boolean:
          generatedCandidate.push(this._validateAndConvertBooleanCandidate(value));
          break;
        case Schema.DataType.Int:
          generatedCandidate.push(this._validateAndConvertIntCandidate(value));
          break;
        case Schema.DataType.Double:
          generatedCandidate.push(this._validateAndConvertDoubleCandidate(value));
          break;
        case Schema.DataType.String:
          generatedCandidate.push(this._validateAndConvertStringCandidate(value));
          break;
        case Schema.DataType.ObjectId:
          generatedCandidate.push(this._validateAndConvertObjectIdCandidate(value));
          break;
        case Schema.DataType.Date:
          generatedCandidate.push(this._validateAndConvertDateCandidate(value));
          break;
        case Schema.DataType.Object:
          generatedCandidate.push({}); // an empty object should be pushed in order to pass by reference.
          this._validateAndConvertDocumentCandidate(value, schemaDefinition.items, generatedCandidate[generatedCandidate.length - 1]);
          break;
        case Schema.DataType.Array:
          generatedCandidate.push([]); // an empty array should be pushed in order to pass by reference.
          this._validateAndConvertDocumentCandidate(value, schemaDefinition.items, generatedCandidate[generatedCandidate.length - 1]);
          break;
        default:
          generatedCandidate.push(value); // if BSON type is not specified, leave value as is.
      }
    }

    return generatedCandidate;
  }

  /**
   * Validates the specified version and converts it to integer number if possible.
   *
   * @since 0.14.0
   * @param {string | number} version
   * @return {number}
   * @protected
   */
  _validateAndConvertVersion (version)
  {
    if (!_.isString(version) && !utility.isValidNumber(version))
    {
      throw new BadRequestError();
    }

    version = _.toNumber(version);

    if (!utility.isValidNumber(version) || version % 1 !== 0)
    {
      throw new BadRequestError();
    }

    return version;
  }
}

module.exports = Service;
