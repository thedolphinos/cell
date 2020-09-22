"use strict";

const {InvalidArgumentsError, BadRequestError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");
const {Int32, Double, ObjectId} = require("mongodb");

const LanguageSafe = require("../safes/LanguageSafe");
const Schema = require("../db/Schema");

/**
 * Contains the service logic of the framework.
 * Must be used as a super class.
 */
class Service
{
  /**
   * Creates an service instance for the specified layer.
   *
   * @param {_LAYER} layer
   */
  constructor (layer)
  {
    if (!_.isString(layer) || !utility.isExist(Service._LAYER[layer]))
    {
      throw new InvalidArgumentsError();
    }

    this._layer = layer;
  }

  /**
   * @protected
   */
  static _LAYER = Object.freeze({
                                  CONTROLLER: "CONTROLLER",
                                  APPLICATION: "APPLICATION",
                                  DB: "DB"
                                });

  _isLanguageAvailable (language)
  {
    if (!_.isString(language))
    {
      throw new InvalidArgumentsError();
    }

    return LanguageSafe.get().includes(language);
  }

  /* VALIDATE AND CONVERT */
  /**
   * Validates the specified version and converts it to integer number if possible.
   *
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

  /**
   * Validates the specified candidate and converts it to the matching data type if possible.
   *
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

    switch (Schema.identifyBsonType(schemaDefinition))
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
   * @param {string | boolean} candidate
   * @return {boolean}
   * @private
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
   * @param {string | number} candidate
   * @return {Int32 | number}
   * @private
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
    const primitive = candidate.value;

    if (!utility.isValidNumber(primitive) || primitive % 1 !== 0)
    {
      throw new BadRequestError();
    }

    switch (this._layer)
    {
      case Service._LAYER.CONTROLLER:
      case Service._LAYER.APPLICATION:
        return primitive;
      case Service._LAYER.DB:
        return candidate;
    }
  }

  /**
   * Validates the specified candidate and converts it to 64-bit floating point number if possible.
   *
   * @param {string | number} candidate
   * @return {Double | number}
   * @private
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
    const primitive = candidate.value;

    if (!utility.isValidNumber(primitive))
    {
      throw new BadRequestError();
    }

    switch (this._layer)
    {
      case Service._LAYER.CONTROLLER:
      case Service._LAYER.APPLICATION:
        return primitive;
      case Service._LAYER.DB:
        return candidate;
    }
  }

  /**
   * Validates the specified candidate.
   *
   * @param {string} candidate
   * @return {string}
   * @private
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
   * @param {string | ObjectId} candidate
   * @return {ObjectId}
   * @private
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
   * @param {string | Date} candidate
   * @return {Date}
   * @private
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
   * @param {Object} candidate
   * @param {Object} schemaDefinition
   * @param {Object} [convertedCandidate]
   * @return {Object}
   * @private
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

    if (schemaDefinition.isMultilingual)
    {
      this._validateMultilingualCandidate(candidate, schemaDefinition, convertedCandidate);
    }
    else
    {
      for (const key in candidate)
      {
        const subCandidate = candidate[key];
        const subCandidateDefinition = schemaDefinition.properties[key];

        if (!utility.isExist(subCandidateDefinition))
        {
          throw new BadRequestError();
        }

        if (subCandidateDefinition.isMultilingual)
        {
          if (!utility.isExist(convertedCandidate[key]))
          {
            convertedCandidate[key] = {};
          }

          this._validateMultilingualCandidate(subCandidate, subCandidateDefinition, convertedCandidate[key]);
        }
        else
        {
          switch (Schema.identifyBsonType(subCandidateDefinition))
          {
            case Schema.DataType.Boolean:
              convertedCandidate[key] = this._validateAndConvertBooleanCandidate(subCandidate);
              break;
            case Schema.DataType.Int:
              convertedCandidate[key] = this._validateAndConvertIntCandidate(subCandidate);
              break;
            case Schema.DataType.Double:
              convertedCandidate[key] = this._validateAndConvertDoubleCandidate(subCandidate);
              break;
            case Schema.DataType.String:
              convertedCandidate[key] = this._validateAndConvertStringCandidate(subCandidate);
              break;
            case Schema.DataType.ObjectId:
              convertedCandidate[key] = this._validateAndConvertObjectIdCandidate(subCandidate);
              break;
            case Schema.DataType.Date:
              convertedCandidate[key] = this._validateAndConvertDateCandidate(subCandidate);
              break;
            case Schema.DataType.Object:
              convertedCandidate[key] = this._validateAndConvertObjectCandidate(subCandidate, subCandidateDefinition, convertedCandidate[key]);
              break;
            case Schema.DataType.Array:
              convertedCandidate[key] = this._validateAndConvertArrayCandidate(subCandidate, subCandidateDefinition, convertedCandidate[key]);
              break;
            default:
              convertedCandidate[key] = subCandidate; // if BSON type is not specified, leave value as is.
          }
        }
      }
    }

    return convertedCandidate;
  }

  /**
   * Validates the specified multilingual candidate deeply.
   *
   * !!! Works on reference.
   *
   * @param {Object} candidate
   * @param {Object} definition
   * @param {Object} convertedCandidate
   * @private
   */
  _validateMultilingualCandidate (candidate, definition, convertedCandidate)
  {
    if (!_.isPlainObject(candidate) ||
        !_.isPlainObject(definition) ||
        !_.isPlainObject(convertedCandidate))
    {
      throw new InvalidArgumentsError();
    }

    for (const language in candidate)
    {
      if (!LanguageSafe.get().includes(language))
      {
        throw new BadRequestError(`Either you did not send a language identifier to a multilingual field or you have sent an identifier which is not available.`);
      }

      convertedCandidate[language] = {};

      switch (Schema.identifyBsonType(definition))
      {
        case Schema.DataType.Object:
          const languageCandidate = candidate[language];

          for (const key in languageCandidate)
          {
            const subCandidate = languageCandidate[key];
            const subDefinition = definition.properties[key];

            if (!utility.isExist(subDefinition))
            {
              throw new BadRequestError();
            }

            switch (Schema.identifyBsonType(subDefinition))
            {
              case Schema.DataType.Boolean:
                convertedCandidate[language][key] = this._validateAndConvertBooleanCandidate(subCandidate);
                break;
              case Schema.DataType.Int:
                convertedCandidate[language][key] = this._validateAndConvertIntCandidate(subCandidate);
                break;
              case Schema.DataType.Double:
                convertedCandidate[language][key] = this._validateAndConvertDoubleCandidate(subCandidate);
                break;
              case Schema.DataType.String:
                convertedCandidate[language][key] = this._validateAndConvertStringCandidate(subCandidate);
                break;
              case Schema.DataType.ObjectId:
                convertedCandidate[language][key] = this._validateAndConvertObjectIdCandidate(subCandidate);
                break;
              case Schema.DataType.Date:
                convertedCandidate[language][key] = this._validateAndConvertDateCandidate(subCandidate);
                break;
              case Schema.DataType.Object:
                convertedCandidate[language][key] = this._validateAndConvertObjectCandidate(subCandidate, subDefinition, convertedCandidate[language][key]);
                break;
              case Schema.DataType.Array:
                convertedCandidate[language][key] = this._validateAndConvertArrayCandidate(subCandidate, subDefinition, convertedCandidate[language][key]);
                break;
              default:
                convertedCandidate[language][key] = subCandidate; // if BSON type is not specified, leave value as is.
            }
          }

          break;
        default:
          const value = candidate[language];

          switch (Schema.identifyBsonType(definition))
          {
            case Schema.DataType.Boolean:
              convertedCandidate[language] = this._validateAndConvertBooleanCandidate(value);
              break;
            case Schema.DataType.Int:
              convertedCandidate[language] = this._validateAndConvertIntCandidate(value);
              break;
            case Schema.DataType.Double:
              convertedCandidate[language] = this._validateAndConvertDoubleCandidate(value);
              break;
            case Schema.DataType.String:
              convertedCandidate[language] = this._validateAndConvertStringCandidate(value);
              break;
            case Schema.DataType.ObjectId:
              convertedCandidate[language] = this._validateAndConvertObjectIdCandidate(value);
              break;
            case Schema.DataType.Date:
              convertedCandidate[language] = this._validateAndConvertDateCandidate(value);
              break;
            case Schema.DataType.Object:
              convertedCandidate[language] = this._validateAndConvertObjectCandidate(value, definition, convertedCandidate[language]);
              break;
            case Schema.DataType.Array:
              convertedCandidate[language] = this._validateAndConvertArrayCandidate(value, definition, convertedCandidate[language]);
              break;
            default:
              convertedCandidate[language] = value; // if BSON type is not specified, leave value as is.
          }
      }
    }
  }

  /**
   * Validates the specified candidate deeply.
   *
   * @param {Array} candidate
   * @param {Object} schemaDefinition
   * @param {Array} [convertedCandidate]
   * @return {Array}
   * @private
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

  /* VALIDATE PARAMS */
  /**
   * Validates the specified query parameter.
   *
   * @param {Object} query
   * @protected
   */
  _validateParamQuery (query)
  {
    if (!_.isPlainObject(query))
    {
      throw new InvalidArgumentsError();
    }
  }

  /**
   * Validates the specified options parameter.
   *
   * @param {Object} options
   * @protected
   */
  _validateParamOptions (options)
  {
    if (!_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
    }
  }

  /**
   * Validates the specified document candidate parameter.
   *
   * @param {Object} documentCandidate
   * @protected
   */
  _validateParamDocumentCandidate (documentCandidate)
  {
    if (!_.isPlainObject(documentCandidate))
    {
      throw new InvalidArgumentsError();
    }
  }

  /**
   * Validates the specified session parameter.
   *
   * @param {Object} session
   * @protected
   */
  _validateParamSession (session)
  {
    if (utility.isExist(session) && !_.isObject(session))
    {
      throw new InvalidArgumentsError();
    }
  }

  /**
   * Validates the specified hooks parameter.
   *
   * @param {Object} hooks
   * @protected
   */
  _validateParamHooks (hooks)
  {
    if (!_.isPlainObject(hooks))
    {
      throw new InvalidArgumentsError();
    }
  }
}

module.exports = Service;
