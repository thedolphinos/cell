const {InvalidArgumentsError, BadRequestError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");
const {
    Int32,
    Double,
    ObjectId
} = require("mongodb");

const ErrorSafe = require("../safes/ErrorSafe");
const LanguageSafe = require("../safes/LanguageSafe");
const BsonType = require("../db/BsonType");
const Schema = require("../db/Schema");

/**
 * Contains the service logic of the framework.
 * Must be used as a super class.
 */
class Service
{
    static LAYER = {
        CONTROLLER: "CONTROLLER",
        APPLICATION: "APPLICATION",
        DB: "DB"
    };

    static isLanguageAvailable (language)
    {
        if (!_.isString(language))
        {
            throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
        }

        return LanguageSafe.get().includes(language);
    }

    /* VALIDATE AND CONVERT */
    /**
     * Validates the specified version and converts it to integer number if possible.
     *
     * @param {string | number} version
     * @return {number}
     */
    static validateAndConvertVersion (version)
    {
        if (!_.isString(version) && !utility.isValidNumber(version))
        {
            throw new BadRequestError(ErrorSafe.get().HTTP_21);
        }

        version = _.toNumber(version);

        if (!utility.isValidNumber(version) || version % 1 !== 0)
        {
            throw new BadRequestError(ErrorSafe.get().HTTP_21);
        }

        return version;
    }

    /**
     * Validates the specified candidate and converts it to the matching data type if possible.
     *
     * @param {*} candidate - Either the whole candidate or in recursive calls a sub part of it.
     * @param {Object} schemaDefinition - The specified candidate's schema definition.
     * @param {Object | Array} convertedCandidate - The converted candidate. In recursive calls, the related part of it is passed by reference.
     * @param {string} [layer]
     * @return {Object | Array} - Processed candidate in the appropriate data type for database.
     */
    static validateAndConvertCandidate (candidate, schemaDefinition, convertedCandidate = undefined, layer = undefined)
    {
        if (!_.isPlainObject(schemaDefinition) ||
            (utility.isExist(convertedCandidate) && !_.isPlainObject(convertedCandidate) && !_.isArray(convertedCandidate)))
        {
            throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
        }

        switch (Schema.identifyBsonType(schemaDefinition))
        {
            case BsonType.Boolean:
                return Service.validateAndConvertBooleanCandidate(candidate);
            case BsonType.Int:
                return Service.validateAndConvertIntCandidate(candidate, layer);
            case BsonType.Double:
                return Service.validateAndConvertDoubleCandidate(candidate, layer);
            case BsonType.String:
                return Service.validateAndConvertStringCandidate(candidate);
            case BsonType.ObjectId:
                return Service.validateAndConvertObjectIdCandidate(candidate);
            case BsonType.Date:
                return Service.validateAndConvertDateCandidate(candidate);
            case BsonType.Object:
                return Service.validateAndConvertObjectCandidate(candidate, schemaDefinition, convertedCandidate, layer);
            case BsonType.Array:
                return Service.validateAndConvertArrayCandidate(candidate, schemaDefinition, convertedCandidate, layer);
            default:
                throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
        }
    }

    /**
     * Validates the specified candidate and converts it to boolean if possible.
     *
     * @param {string | boolean} candidate
     * @return {boolean}
     */
    static validateAndConvertBooleanCandidate (candidate)
    {
        if (!utility.isExist(candidate))
        {
            return null;
        }

        if (!_.isString(candidate) && !_.isBoolean(candidate))
        {
            throw new BadRequestError(ErrorSafe.get().HTTP_21);
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
            throw new BadRequestError(ErrorSafe.get().HTTP_21);
        }

        return candidate;
    }

    /**
     * Validates the specified candidate and converts it to 32-bit integer number if possible.
     *
     * @param {string | number} candidate
     * @param {string} [layer]
     * @return {Int32 | number}
     */
    static validateAndConvertIntCandidate (candidate, layer = undefined)
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
            throw new BadRequestError(ErrorSafe.get().HTTP_21);
        }

        candidate = new Int32(candidate);
        const primitive = _.toNumber(candidate.value);

        if (!utility.isValidNumber(primitive) || primitive % 1 !== 0)
        {
            throw new BadRequestError(ErrorSafe.get().HTTP_21);
        }

        switch (layer)
        {
            case Service.LAYER.CONTROLLER:
            case Service.LAYER.APPLICATION:
                return primitive;
            case Service.LAYER.DB:
                return candidate;
            default:
                return primitive;
        }
    }

    /**
     * Validates the specified candidate and converts it to 64-bit floating point number if possible.
     *
     * @param {string | number} candidate
     * @param {string} [layer]
     * @return {Double | number}
     */
    static validateAndConvertDoubleCandidate (candidate, layer = undefined)
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
            throw new BadRequestError(ErrorSafe.get().HTTP_21);
        }

        candidate = new Double(candidate);
        const primitive = _.toNumber(candidate.value);

        if (!utility.isValidNumber(primitive))
        {
            throw new BadRequestError(ErrorSafe.get().HTTP_21);
        }

        switch (layer)
        {
            case Service.LAYER.CONTROLLER:
            case Service.LAYER.APPLICATION:
                return primitive;
            case Service.LAYER.DB:
                return candidate;
            default:
                return primitive;
        }
    }

    /**
     * Validates the specified candidate.
     *
     * @param {string} candidate
     * @return {string}
     */
    static validateAndConvertStringCandidate (candidate)
    {
        if (!utility.isExist(candidate))
        {
            return null;
        }

        const value = _.isPlainObject(candidate) && utility.isExist(candidate.$regex)
                      ? candidate.$regex
                      : candidate;

        if (!_.isString(value))
        {
            throw new BadRequestError(ErrorSafe.get().HTTP_21);
        }

        return candidate;
    }

    /**
     * Validates the specified candidate and converts it to object ID if possible.
     *
     * @param {string | ObjectId} candidate
     * @return {ObjectId}
     */
    static validateAndConvertObjectIdCandidate (candidate)
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
            throw new BadRequestError(ErrorSafe.get().HTTP_21);
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
                throw new BadRequestError(ErrorSafe.get().HTTP_21);
            }

            if (newValue.toString() !== candidate)
            {
                throw new BadRequestError(ErrorSafe.get().HTTP_21);
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
     */
    static validateAndConvertDateCandidate (candidate)
    {
        if (!utility.isExist(candidate))
        {
            return null;
        }

        if (!_.isString(candidate) && !utility.isValidDate(candidate))
        {
            throw new BadRequestError(ErrorSafe.get().HTTP_21);
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
     */
    static validateAndConvertObjectCandidate (candidate, schemaDefinition, convertedCandidate = undefined, layer = undefined)
    {
        if (!utility.isExist(candidate))
        {
            return null;
        }

        if (!_.isPlainObject(candidate) ||
            !_.isPlainObject(schemaDefinition) ||
            (utility.isExist(convertedCandidate) && !_.isPlainObject(convertedCandidate)))
        {
            throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
        }

        if (!utility.isExist(convertedCandidate))
        {
            convertedCandidate = {};
        }

        if (schemaDefinition.isMultilingual)
        {
            Service.validateMultilingualCandidate(candidate, schemaDefinition, convertedCandidate, layer);
        }
        else
        {
            for (const key in candidate)
            {
                const subCandidate = candidate[key];
                let subCandidateDefinition;

                try
                {
                    subCandidateDefinition = schemaDefinition.properties[key];
                }
                catch (error)
                {
                    // schema definition may not have properties which is fine in some layers.
                }

                if (!utility.isExist(subCandidateDefinition))
                {
                    switch (layer)
                    {
                        case Service.LAYER.CONTROLLER:
                            throw new BadRequestError(ErrorSafe.get().HTTP_21); // the client sent a property which is not in the schema definition.
                        case Service.LAYER.APPLICATION:
                            continue;
                        case Service.LAYER.DB:
                            continue;
                        default:
                            continue;
                    }
                }

                if (subCandidateDefinition.isMultilingual)
                {
                    if (!utility.isExist(convertedCandidate[key]))
                    {
                        convertedCandidate[key] = {};
                    }

                    Service.validateMultilingualCandidate(subCandidate, subCandidateDefinition, convertedCandidate[key], layer);
                }
                else
                {
                    switch (Schema.identifyBsonType(subCandidateDefinition))
                    {
                        case BsonType.Boolean:
                            convertedCandidate[key] = Service.validateAndConvertBooleanCandidate(subCandidate);
                            break;
                        case BsonType.Int:
                            convertedCandidate[key] = Service.validateAndConvertIntCandidate(subCandidate, layer);
                            break;
                        case BsonType.Double:
                            convertedCandidate[key] = Service.validateAndConvertDoubleCandidate(subCandidate, layer);
                            break;
                        case BsonType.String:
                            convertedCandidate[key] = Service.validateAndConvertStringCandidate(subCandidate);
                            break;
                        case BsonType.ObjectId:
                            convertedCandidate[key] = Service.validateAndConvertObjectIdCandidate(subCandidate);
                            break;
                        case BsonType.Date:
                            convertedCandidate[key] = Service.validateAndConvertDateCandidate(subCandidate);
                            break;
                        case BsonType.Object:
                            convertedCandidate[key] = Service.validateAndConvertObjectCandidate(subCandidate, subCandidateDefinition, convertedCandidate[key], layer);
                            break;
                        case BsonType.Array:
                            convertedCandidate[key] = Service.validateAndConvertArrayCandidate(subCandidate, subCandidateDefinition, convertedCandidate[key], layer);
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
     * @param {string} [layer]
     */
    static validateMultilingualCandidate (candidate, definition, convertedCandidate, layer = undefined)
    {
        if (!_.isPlainObject(candidate) ||
            !_.isPlainObject(definition) ||
            !_.isPlainObject(convertedCandidate))
        {
            throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
        }

        for (const language in candidate)
        {
            if (!LanguageSafe.get().includes(language))
            {
                throw new BadRequestError(ErrorSafe.get().LANGUAGE);
            }

            convertedCandidate[language] = {};

            switch (Schema.identifyBsonType(definition))
            {
                case BsonType.Object:
                    const languageCandidate = candidate[language];

                    for (const key in languageCandidate)
                    {
                        const subCandidate = languageCandidate[key];
                        const subDefinition = definition.properties[key];

                        if (!utility.isExist(subDefinition))
                        {
                            switch (layer)
                            {
                                case Service.LAYER.CONTROLLER:
                                    throw new BadRequestError(ErrorSafe.get().HTTP_21); // the client sent a property which is not in the schema definition.
                                case Service.LAYER.APPLICATION:
                                    break;
                                case Service.LAYER.DB:
                                    break;
                            }
                        }

                        switch (Schema.identifyBsonType(subDefinition))
                        {
                            case BsonType.Boolean:
                                convertedCandidate[language][key] = Service.validateAndConvertBooleanCandidate(subCandidate);
                                break;
                            case BsonType.Int:
                                convertedCandidate[language][key] = Service.validateAndConvertIntCandidate(subCandidate, layer);
                                break;
                            case BsonType.Double:
                                convertedCandidate[language][key] = Service.validateAndConvertDoubleCandidate(subCandidate, layer);
                                break;
                            case BsonType.String:
                                convertedCandidate[language][key] = Service.validateAndConvertStringCandidate(subCandidate);
                                break;
                            case BsonType.ObjectId:
                                convertedCandidate[language][key] = Service.validateAndConvertObjectIdCandidate(subCandidate);
                                break;
                            case BsonType.Date:
                                convertedCandidate[language][key] = Service.validateAndConvertDateCandidate(subCandidate);
                                break;
                            case BsonType.Object:
                                convertedCandidate[language][key] = Service.validateAndConvertObjectCandidate(subCandidate, subDefinition, convertedCandidate[language][key], layer);
                                break;
                            case BsonType.Array:
                                convertedCandidate[language][key] = Service.validateAndConvertArrayCandidate(subCandidate, subDefinition, convertedCandidate[language][key], layer);
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
                        case BsonType.Boolean:
                            convertedCandidate[language] = Service.validateAndConvertBooleanCandidate(value);
                            break;
                        case BsonType.Int:
                            convertedCandidate[language] = Service.validateAndConvertIntCandidate(value, layer);
                            break;
                        case BsonType.Double:
                            convertedCandidate[language] = Service.validateAndConvertDoubleCandidate(value, layer);
                            break;
                        case BsonType.String:
                            convertedCandidate[language] = Service.validateAndConvertStringCandidate(value);
                            break;
                        case BsonType.ObjectId:
                            convertedCandidate[language] = Service.validateAndConvertObjectIdCandidate(value);
                            break;
                        case BsonType.Date:
                            convertedCandidate[language] = Service.validateAndConvertDateCandidate(value);
                            break;
                        case BsonType.Object:
                            convertedCandidate[language] = Service.validateAndConvertObjectCandidate(value, definition, convertedCandidate[language], layer);
                            break;
                        case BsonType.Array:
                            convertedCandidate[language] = Service.validateAndConvertArrayCandidate(value, definition, convertedCandidate[language], layer);
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
     * @param {string} [layer]
     * @return {Array}
     */
    static validateAndConvertArrayCandidate (candidate, schemaDefinition, convertedCandidate = undefined, layer = undefined)
    {
        if (!utility.isExist(candidate))
        {
            return null;
        }

        if ((!_.isArray(candidate) && !_.isPlainObject(candidate)) ||
            !_.isPlainObject(schemaDefinition) ||
            (utility.isExist(convertedCandidate) && !_.isArray(convertedCandidate)))
        {
            throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
        }

        if (!utility.isExist(convertedCandidate))
        {
            convertedCandidate = [];
        }

        if (_.isArray(candidate))
        {
            for (let i = 0; i < candidate.length; i++)
            {
                const value = candidate[i];

                switch (schemaDefinition.items.bsonType)
                {
                    case BsonType.Boolean:
                        convertedCandidate.push(Service.validateAndConvertBooleanCandidate(value));
                        break;
                    case BsonType.Int:
                        convertedCandidate.push(Service.validateAndConvertIntCandidate(value, layer));
                        break;
                    case BsonType.Double:
                        convertedCandidate.push(Service.validateAndConvertDoubleCandidate(value, layer));
                        break;
                    case BsonType.String:
                        convertedCandidate.push(Service.validateAndConvertStringCandidate(value));
                        break;
                    case BsonType.ObjectId:
                        convertedCandidate.push(Service.validateAndConvertObjectIdCandidate(value));
                        break;
                    case BsonType.Date:
                        convertedCandidate.push(Service.validateAndConvertDateCandidate(value));
                        break;
                    case BsonType.Object:
                        convertedCandidate.push({}); // an empty object should be pushed in order to pass by reference.
                        Service.validateAndConvertCandidate(value, schemaDefinition.items, convertedCandidate[convertedCandidate.length - 1], layer);
                        break;
                    case BsonType.Array:
                        convertedCandidate.push([]); // an empty array should be pushed in order to pass by reference.
                        Service.validateAndConvertCandidate(value, schemaDefinition.items, convertedCandidate[convertedCandidate.length - 1], layer);
                        break;
                    default:
                        convertedCandidate.push(value); // if BSON type is not specified, leave value as is.
                }
            }
        }
        else if (_.isPlainObject(candidate)) // it can be an object in regex based reads
        {
            convertedCandidate = {}; // it should be object instead of array since it is regex based.
            Service.validateAndConvertCandidate(candidate, schemaDefinition.items, convertedCandidate, layer);
        }

        return convertedCandidate;
    }

    /* FORBIDDEN PROPERTIES */
    /**
     * Removes the forbidden properties from the specified document according to the specified persona.
     *
     * @param {Object} document
     * @param {string} persona
     */
    removeForbiddenProperties (document, persona = undefined)
    {
        if (!_.isPlainObject(document) ||
            (utility.isExist(persona) && !_.isString(persona)))
        {
            throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
        }

        if (!utility.isExist(persona))
        {
            persona = this._persona;
        }

        if (utility.isExist(this.schema?.definition) &&
            utility.isExist(persona))
        {
            this.removeForbiddenPropertiesForObject(document, this.schema.definition, persona);
        }
    }

    /**
     * Removes the forbidden properties from the specified object according to the specified definition and persona.
     *
     * @param {Object} object
     * @param {Object} definition
     * @param {string} persona
     */
    removeForbiddenPropertiesForObject (object, definition, persona)
    {
        if (!_.isPlainObject(object) ||
            !_.isPlainObject(definition) ||
            !_.isString(persona))
        {
            throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
        }

        const isForbiddenEntirely = this.isRemovable(definition, persona);

        for (const key in object)
        {
            const property = object[key];
            let propertyDefinition = definition.properties[key];
            let isRemoved = false;

            if (utility.isExist(propertyDefinition)) // it is possible that the document may have a property which is not defined in the schema or defined previously and removed
            {
                if (this.isRemovable(propertyDefinition, persona) || isForbiddenEntirely)
                {
                    isRemoved = true;
                    delete object[key];
                }

                switch (Schema.identifyBsonType(propertyDefinition))
                {
                    case BsonType.Boolean:
                    case BsonType.Int:
                    case BsonType.Double:
                    case BsonType.String:
                    case BsonType.ObjectId:
                    case BsonType.Date:
                    {
                        // already removed
                        break;
                    }
                    case BsonType.Object:
                    {
                        if (!isRemoved)
                        {
                            this.removeForbiddenPropertiesForObject(property, propertyDefinition, persona);
                        }

                        break;
                    }
                    case BsonType.Array:
                    {
                        if (!isRemoved)
                        {
                            this.removeForbiddenPropertiesForArray(property, propertyDefinition, persona);
                        }

                        break;
                    }
                    default:
                    // if BSON type is not specified, leave value as is.
                }
            }
        }
    }

    /**
     * Removes the forbidden properties from the specified array according to the specified definition and persona.
     *
     * @param {Array} array
     * @param {Object} definition
     * @param {string} persona
     */
    removeForbiddenPropertiesForArray (array, definition, persona)
    {
        if (!_.isArray(array) ||
            !_.isPlainObject(definition) ||
            !_.isString(persona))
        {
            throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
        }

        for (let i = 0; i < array.length; i++)
        {
            const property = array[i];
            let propertyDefinition = definition.items;
            let isRemoved = false;

            if (utility.isExist(propertyDefinition)) // it is possible that the document may have a property which is not defined in the schema or defined previously and removed
            {
                if (this.isRemovable(propertyDefinition, persona))
                {
                    isRemoved = true;
                    property.splice(i, 1);
                    i--;
                }

                switch (Schema.identifyBsonType(definition.items))
                {
                    case BsonType.Boolean:
                    case BsonType.Int:
                    case BsonType.Double:
                    case BsonType.String:
                    case BsonType.ObjectId:
                    case BsonType.Date:
                    {
                        // already removed
                        break;
                    }
                    case BsonType.Object:
                    {
                        if (!isRemoved)
                        {
                            this.removeForbiddenPropertiesForObject(property, propertyDefinition, persona);
                        }

                        break;
                    }
                    case BsonType.Array:
                    {
                        if (!isRemoved)
                        {
                            this.removeForbiddenPropertiesForObject(property, propertyDefinition, persona);
                        }

                        break;
                    }
                }
            }
        }
    }

    /**
     * Checks if the specified definition should be removed or not for the specified persona.
     *
     * @param {Object} definition
     * @param {string} persona
     * @returns {boolean}
     */
    isRemovable (definition, persona)
    {
        return utility.isExist(definition.forbiddenForPersonas) &&
               (definition.forbiddenForPersonas === Schema.SPECIAL_FORBIDDEN_FOR_PERSONA.ALL || definition.forbiddenForPersonas.includes(persona));
    }

    /* ENUM */
    /**
     * Builds enum.
     *
     * @param {Object | Array<string>} ENUM
     * @param {Object} NEW_ENUM_PART
     * @return {Object}
     * @protected
     */
    _buildEnum (ENUM, NEW_ENUM_OR_PART = undefined)
    {
        if (!utility.isExist(NEW_ENUM_OR_PART))
        {
            NEW_ENUM_OR_PART = {};
        }

        if (_.isArray(ENUM))
        {
            for (const ELEMENT of ENUM)
            {
                if (!_.isString(ELEMENT))
                {
                    throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
                }

                NEW_ENUM_OR_PART[ELEMENT] = ELEMENT;
            }
        }
        else if (_.isPlainObject(ENUM))
        {
            for (const key in ENUM)
            {
                NEW_ENUM_OR_PART[key] = {};
                this._buildEnum(ENUM[key], NEW_ENUM_OR_PART[key]);
            }
        }
        else
        {
            throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
        }

        return NEW_ENUM_OR_PART;
    }

    /**** VALIDATE PARAMETERS ****/
    /**
     * Validates the specified query parameter.
     *
     * @param {Object} query
     * @protected
     */
    _validateParameterQuery (query)
    {
        if (!_.isPlainObject(query))
        {
            throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
        }
    }

    /**
     * Validates the specified options parameter.
     *
     * @param {Object} options
     * @protected
     */
    _validateParameterOptions (options)
    {
        if (!_.isPlainObject(options))
        {
            throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
        }
    }

    /**
     * Validates the specified document candidate parameter.
     *
     * @param {Object} documentCandidate
     * @protected
     */
    _validateParameterDocumentCandidate (documentCandidate)
    {
        if (!_.isPlainObject(documentCandidate))
        {
            throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
        }
    }

    /**
     * Validates the specified session parameter.
     *
     * @param {Object} session
     * @protected
     */
    _validateParameterSession (session)
    {
        if (utility.isExist(session) && !_.isObject(session))
        {
            throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
        }
    }

    /**
     * Validates the specified hooks parameter.
     *
     * @param {Object} hooks
     * @protected
     */
    _validateParameterHooks (hooks)
    {
        if (!_.isPlainObject(hooks))
        {
            throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
        }
    }

    /* GET/SET */
    /**
     * @returns {string}
     */
    get persona ()
    {
        return this._persona;
    }
}

module.exports = Service;
