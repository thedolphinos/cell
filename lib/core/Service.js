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
   * @param {Object | Array} convertedCandidate - The converted document candidate. In recursive calls, the related part of it is passed by reference.
   * @return {Object | Array} - Processed candidate in the appropriate data type for database.
   * @protected
   */
  _validateAndConvertDocumentCandidate (candidate, schemaDefinition, convertedCandidate = null)
  {
    if (!_.isPlainObject(schemaDefinition) ||
        (utility.isExist(convertedCandidate) && !_.isPlainObject(convertedCandidate) && !_.isArray(convertedCandidate)))
    {
      throw new InvalidArgumentsError();
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
            return candidate;
          }

          selectedBsonType = bsonType[i];
        }
      }

      bsonType = selectedBsonType;
    }

    switch (bsonType)
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
        return this._validateAndConvertObjectCandidate(candidate, schemaDefinition, convertedCandidate);
      case Schema.DataType.Array:
        return this._validateAndConvertArrayCandidate(candidate, schemaDefinition, convertedCandidate);
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
      let newValue;

      try
      {
        newValue = new ObjectId(candidate);
      }
      catch (error)
      {
        throw new BadRequestError();
      }

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
   * @param {Object} [convertedCandidate]
   * @return {Object}
   * @protected
   */
  _validateAndConvertObjectCandidate (candidate, schemaDefinition, convertedCandidate = null)
  {
    if (!utility.isExist(candidate))
    {
      return null;
    }

    if (!_.isPlainObject(candidate) ||
        !_.isPlainObject(schemaDefinition) ||
        (utility.isExist(convertedCandidate) && !_.isPlainObject(convertedCandidate)))
    {
      throw new InvalidArgumentsError();
    }

    if (!utility.isExist(convertedCandidate))
    {
      convertedCandidate = {};
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
          convertedCandidate[key] = this._validateAndConvertBooleanCandidate(value);
          break;
        case Schema.DataType.Int:
          convertedCandidate[key] = this._validateAndConvertIntCandidate(value);
          break;
        case Schema.DataType.Double:
          convertedCandidate[key] = this._validateAndConvertDoubleCandidate(value);
          break;
        case Schema.DataType.String:
          convertedCandidate[key] = this._validateAndConvertStringCandidate(value);
          break;
        case Schema.DataType.ObjectId:
          convertedCandidate[key] = this._validateAndConvertObjectIdCandidate(value);
          break;
        case Schema.DataType.Date:
          convertedCandidate[key] = this._validateAndConvertDateCandidate(value);
          break;
        case Schema.DataType.Object:
          convertedCandidate[key] = this._validateAndConvertDocumentCandidate(value, schemaDefinition.properties[key], convertedCandidate[key]);
          break;
        case Schema.DataType.Array:
          convertedCandidate[key] = this._validateAndConvertArrayCandidate(value, schemaDefinition.properties[key], convertedCandidate[key]);
          break;
        default:
          convertedCandidate[key] = value; // if BSON type is not specified, leave value as is.
      }
    }

    return convertedCandidate;
  }

  /**
   * Validates the specified candidate deeply.
   *
   * @since 0.14.0
   * @param {Array} candidate
   * @param {Object} schemaDefinition
   * @param {Array} [convertedCandidate]
   * @return {Array}
   * @protected
   */
  _validateAndConvertArrayCandidate (candidate, schemaDefinition, convertedCandidate = null)
  {
    if (!utility.isExist(candidate))
    {
      return null;
    }

    if (!_.isArray(candidate) ||
        !_.isPlainObject(schemaDefinition) ||
        (utility.isExist(convertedCandidate) && !_.isArray(convertedCandidate)))
    {
      throw new InvalidArgumentsError();
    }

    if (!utility.isExist(convertedCandidate))
    {
      convertedCandidate = [];
    }

    for (let i = 0; i < candidate.length; i++)
    {
      const value = candidate[i];

      switch (schemaDefinition.items.bsonType)
      {
        case Schema.DataType.Boolean:
          convertedCandidate.push(this._validateAndConvertBooleanCandidate(value));
          break;
        case Schema.DataType.Int:
          convertedCandidate.push(this._validateAndConvertIntCandidate(value));
          break;
        case Schema.DataType.Double:
          convertedCandidate.push(this._validateAndConvertDoubleCandidate(value));
          break;
        case Schema.DataType.String:
          convertedCandidate.push(this._validateAndConvertStringCandidate(value));
          break;
        case Schema.DataType.ObjectId:
          convertedCandidate.push(this._validateAndConvertObjectIdCandidate(value));
          break;
        case Schema.DataType.Date:
          convertedCandidate.push(this._validateAndConvertDateCandidate(value));
          break;
        case Schema.DataType.Object:
          convertedCandidate.push({}); // an empty object should be pushed in order to pass by reference.
          this._validateAndConvertDocumentCandidate(value, schemaDefinition.items, convertedCandidate[convertedCandidate.length - 1]);
          break;
        case Schema.DataType.Array:
          convertedCandidate.push([]); // an empty array should be pushed in order to pass by reference.
          this._validateAndConvertDocumentCandidate(value, schemaDefinition.items, convertedCandidate[convertedCandidate.length - 1]);
          break;
        default:
          convertedCandidate.push(value); // if BSON type is not specified, leave value as is.
      }
    }

    return convertedCandidate;
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
