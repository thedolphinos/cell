/*
 * Code Review: ✓
 * Test Cases: ✗
 * Guidelines - Imports: ✓
 * Guidelines - Comments: ✓
 */

import _ from "lodash";
import {Int32, Double, ObjectId} from "mongodb";

import {isExist, isValidNumber, isValidDate, toEnum, isObjectId} from "@thedolphinos/utility4js";
import {InvalidArgumentsError, BadRequestError} from "@thedolphinos/error4js";

import ErrorSafe from "../safes/ErrorSafe";
import LanguageSafe from "../safes/LanguageSafe";
import BsonType from "../db/BsonType";
import Schema from "../db/Schema";

export type Layer = "DB" | "APPLICATION" | "CONTROLLER";

class Service
{
    protected static LAYER: {[key: string]: Layer} = {
        "DB": "DB",
        "APPLICATION": "APPLICATION",
        "CONTROLLER": "CONTROLLER"
    };

    protected readonly layer: Layer; // Differentiates logic between different service layers.
    protected readonly persona?: string;

    constructor (layer: Layer, persona?: string)
    {
        this.layer = layer;

        if (isExist(persona))
        {
            this.persona = persona;
        }
    }

    /**
     * Validates and converts the specified candidate into a valid version (finite non-negative integer).
     */
    protected validateAndConvertVersion (version: any): number
    {
        if (_.isString(version))
        {
            version = _.toNumber(version);
        }

        if (!isValidNumber(version))
        {
            throw new BadRequestError(ErrorSafe.getData().HTTP_21);
        }

        const isNonNegative: boolean = version >= 0;
        const isInteger: boolean = _.isInteger(version);

        if (!isNonNegative || !isInteger)
        {
            throw new BadRequestError(ErrorSafe.getData().HTTP_21);
        }

        return version;
    }

    /**
     * Validates and converts the specified candidate against the specified schema definition.
     *
     * // TODO: I don't understand this?
     * @param {*} candidate - Either the whole candidate or in recursive calls a sub part of it.
     * @param {Object} schemaDefinition - The specified candidate's schema definition.
     * @param {Object | Array} convertedCandidate - The converted candidate. In recursive calls, the related part of it is passed by reference.
     * @param {string} [layer]
     * @return {Object | Array} - Processed candidate in the appropriate data type for database.
     */
    protected validateAndConvertCandidate (candidate: any, schemaDefinition: any, convertedCandidate?: any | Array<any>): any
    {
        switch (Schema.identifyDefinitionBsonType(schemaDefinition))
        {
            case BsonType.Boolean:
            {
                return this.validateAndConvertBooleanCandidate(candidate);
            }
            case BsonType.Int:
            {
                return this.validateAndConvertIntCandidate(candidate);
            }
            case BsonType.Double:
            {
                return this.validateAndConvertDoubleCandidate(candidate);
            }
            case BsonType.String:
            {
                return this.validateStringCandidate(candidate);
            }
            case BsonType.ObjectId:
            {
                return this.validateAndConvertObjectIdCandidate(candidate);
            }
            case BsonType.Date:
            {
                return this.validateAndConvertDateCandidate(candidate);
            }
            case BsonType.Object:
            {
                return this.validateAndConvertObjectCandidateDeep(candidate, schemaDefinition, convertedCandidate);
            }
            case BsonType.Array:
            {
                return this.validateAndConvertArrayCandidate(candidate, schemaDefinition, convertedCandidate);
            }
            default:
            {
                throw new InvalidArgumentsError(ErrorSafe.getData().DEV_1);
            }
        }
    }

    protected validateAndConvertBooleanCandidate (candidate: any): boolean | null
    {
        if (!isExist(candidate))
        {
            return null;
        }

        if (_.isBoolean(candidate))
        {
            return candidate;
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
            else
            {
                throw new BadRequestError(ErrorSafe.getData().HTTP_21);
            }
        }

        if (!_.isBoolean(candidate))
        {
            throw new BadRequestError(ErrorSafe.getData().HTTP_21);
        }

        return candidate;
    }

    protected validateAndConvertIntCandidate (candidate: any): Int32 | number | null
    {
        if (!isExist(candidate))
        {
            return null;
        }

        if (candidate instanceof Int32)
        {
            return candidate;
        }

        if (_.isString(candidate))
        {
            candidate = _.toNumber(candidate);
        }

        if (!isValidNumber(candidate))
        {
            throw new BadRequestError(ErrorSafe.getData().HTTP_21);
        }

        const isInteger: boolean = _.isInteger(candidate);

        if (!isInteger)
        {
            throw new BadRequestError(ErrorSafe.getData().HTTP_21);
        }

        const int32: Int32 = new Int32(candidate);
        const intPrimitive = int32.value;

        switch (this.layer)
        {
            case Service.LAYER.CONTROLLER:
            case Service.LAYER.APPLICATION:
            {
                return intPrimitive;
            }
            case Service.LAYER.DB:
            {
                return int32;
            }
            default:
            {
                return intPrimitive;
            }
        }
    }

    protected validateAndConvertDoubleCandidate (candidate: any): Double | number | null
    {
        if (!isExist(candidate))
        {
            return null;
        }

        if (candidate instanceof Double)
        {
            return candidate;
        }

        if (_.isString(candidate))
        {
            candidate = _.toNumber(candidate);
        }

        if (!isValidNumber(candidate))
        {
            throw new BadRequestError(ErrorSafe.getData().HTTP_21);
        }

        const double: Double = new Double(candidate);
        const doublePrimitive = double.value;

        switch (this.layer)
        {
            case Service.LAYER.CONTROLLER:
            case Service.LAYER.APPLICATION:
            {
                return doublePrimitive;
            }
            case Service.LAYER.DB:
            {
                return double;
            }
            default:
            {
                return doublePrimitive;
            }
        }
    }

    protected validateStringCandidate (candidate: any): string | null
    {
        if (!isExist(candidate))
        {
            return null;
        }

        const value = _.isPlainObject(candidate) && isExist(candidate.$regex) ? candidate.$regex : candidate;

        if (!_.isString(value))
        {
            throw new BadRequestError(ErrorSafe.getData().HTTP_21);
        }

        return candidate;
    }

    protected validateAndConvertObjectIdCandidate (candidate: any): ObjectId | null
    {
        if (!isExist(candidate))
        {
            return null;
        }

        if (candidate instanceof ObjectId)
        {
            return candidate;
        }

        if (_.isString(candidate))
        {
            let objectId: ObjectId;

            try
            {
                objectId = new ObjectId(candidate);
            }
            catch (error)
            {
                throw new BadRequestError(ErrorSafe.getData().HTTP_21);
            }

            if (objectId.toString() !== candidate)
            {
                throw new BadRequestError(ErrorSafe.getData().HTTP_21);
            }

            candidate = objectId;
        }

        if (!isObjectId(candidate))
        {
            throw new BadRequestError(ErrorSafe.getData().HTTP_21);
        }

        return candidate;
    }

    protected validateAndConvertDateCandidate (candidate: any): Date | null
    {
        if (!isExist(candidate))
        {
            return null;
        }

        if (_.isString(candidate))
        {
            candidate = new Date(candidate);
        }

        if (!isValidDate(candidate))
        {
            throw new BadRequestError(ErrorSafe.getData().HTTP_21);
        }

        return candidate;
    }

    // TODO: review: I don't remember this code of mine :)
    protected validateAndConvertObjectCandidateDeep (candidate: any, schemaDefinition: any, convertedCandidate?: any): any | null
    {
        if (!isExist(candidate))
        {
            return null;
        }

        if (!isExist(convertedCandidate))
        {
            convertedCandidate = {};
        }

        if (schemaDefinition.isMultilingual)
        {
            this.validateMultilingualCandidateDeep(candidate, schemaDefinition, convertedCandidate);
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
                    // Schema definition may not have properties which is fine in some layers.
                }

                if (!isExist(subCandidateDefinition))
                {
                    switch (this.layer)
                    {
                        case Service.LAYER.CONTROLLER:
                        {
                            throw new BadRequestError(ErrorSafe.getData().HTTP_21); // The client sent a property which is not in the schema definition.
                        }
                        case Service.LAYER.APPLICATION:
                        case Service.LAYER.DB:
                        {
                            continue;
                        }
                        default:
                        {
                            continue;
                        }

                    }
                }

                if (subCandidateDefinition.isMultilingual)
                {
                    if (!isExist(convertedCandidate[key]))
                    {
                        convertedCandidate[key] = {};
                    }

                    this.validateMultilingualCandidateDeep(subCandidate, subCandidateDefinition, convertedCandidate[key]);
                }
                else
                {
                    switch (Schema.identifyDefinitionBsonType(subCandidateDefinition))
                    {
                        case BsonType.Boolean:
                        {
                            convertedCandidate[key] = this.validateAndConvertBooleanCandidate(subCandidate);
                            break;
                        }
                        case BsonType.Int:
                        {
                            convertedCandidate[key] = this.validateAndConvertIntCandidate(subCandidate);
                            break;
                        }
                        case BsonType.Double:
                        {
                            convertedCandidate[key] = this.validateAndConvertDoubleCandidate(subCandidate);
                            break;
                        }
                        case BsonType.String:
                        {
                            convertedCandidate[key] = this.validateStringCandidate(subCandidate);
                            break;
                        }
                        case BsonType.ObjectId:
                        {
                            convertedCandidate[key] = this.validateAndConvertObjectIdCandidate(subCandidate);
                            break;
                        }
                        case BsonType.Date:
                        {
                            convertedCandidate[key] = this.validateAndConvertDateCandidate(subCandidate);
                            break;
                        }
                        case BsonType.Object:
                        {
                            convertedCandidate[key] = this.validateAndConvertObjectCandidateDeep(subCandidate, subCandidateDefinition, convertedCandidate[key]);
                            break;
                        }
                        case BsonType.Array:
                        {
                            convertedCandidate[key] = this.validateAndConvertArrayCandidate(subCandidate, subCandidateDefinition, convertedCandidate[key]);
                            break;
                        }
                        default:
                        {
                            convertedCandidate[key] = subCandidate; // If BSON type is not specified, leave value as is.
                        }
                    }
                }
            }
        }

        return convertedCandidate;
    }

    // TODO: review: I don't remember this code of mine :)
    protected validateAndConvertArrayCandidate (candidate: any, schemaDefinition: any, convertedCandidate?: any): any | null
    {
        if (!isExist(candidate))
        {
            return null;
        }

        if (!isExist(convertedCandidate))
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
                    {
                        convertedCandidate.push(this.validateAndConvertBooleanCandidate(value));
                        break;
                    }
                    case BsonType.Int:
                    {
                        convertedCandidate.push(this.validateAndConvertIntCandidate(value));
                        break;
                    }
                    case BsonType.Double:
                    {
                        convertedCandidate.push(this.validateAndConvertDoubleCandidate(value));
                        break;
                    }
                    case BsonType.String:
                    {
                        convertedCandidate.push(this.validateStringCandidate(value));
                        break;
                    }
                    case BsonType.ObjectId:
                    {
                        convertedCandidate.push(this.validateAndConvertObjectIdCandidate(value));
                        break;
                    }
                    case BsonType.Date:
                    {
                        convertedCandidate.push(this.validateAndConvertDateCandidate(value));
                        break;
                    }
                    case BsonType.Object:
                    {
                        convertedCandidate.push({}); // An empty object should be pushed in order to pass by reference.
                        this.validateAndConvertCandidate(value, schemaDefinition.items, convertedCandidate[convertedCandidate.length - 1]);
                        break;
                    }
                    case BsonType.Array:
                    {
                        convertedCandidate.push([]); // an empty array should be pushed in order to pass by reference.
                        this.validateAndConvertCandidate(value, schemaDefinition.items, convertedCandidate[convertedCandidate.length - 1]);
                        break;
                    }
                    default:
                    {
                        convertedCandidate.push(value); // If BSON type is not specified, leave value as is.
                    }
                }
            }
        }
        else if (_.isPlainObject(candidate)) // it can be an object in regex based reads
        {
            convertedCandidate = {}; // it should be object instead of array since it is regex based.
            this.validateAndConvertCandidate(candidate, schemaDefinition.items, convertedCandidate);
        }

        return convertedCandidate;
    }

    // TODO: review: I don't remember this code of mine :)
    private validateMultilingualCandidateDeep (candidate: any, definition: any, convertedCandidate: any): any
    {
        for (const language in candidate)
        {
            if (!LanguageSafe.getData().includes(language))
            {
                throw new BadRequestError(ErrorSafe.getData().LANGUAGE);
            }

            convertedCandidate[language] = {};

            switch (Schema.identifyDefinitionBsonType(definition))
            {
                case BsonType.Object:
                {
                    const languageCandidate = candidate[language];

                    for (const key in languageCandidate)
                    {
                        const subCandidate = languageCandidate[key];
                        const subDefinition = definition.properties[key];

                        if (!isExist(subDefinition))
                        {
                            switch (this.layer)
                            {
                                case Service.LAYER.CONTROLLER:
                                {
                                    throw new BadRequestError(ErrorSafe.getData().HTTP_21); // The client sent a property which is not in the schema definition.
                                }
                                case Service.LAYER.APPLICATION:
                                case Service.LAYER.DB:
                                {
                                    break;
                                }
                            }
                        }

                        switch (Schema.identifyDefinitionBsonType(subDefinition))
                        {
                            case BsonType.Boolean:
                            {
                                convertedCandidate[language][key] = this.validateAndConvertBooleanCandidate(subCandidate);
                                break;
                            }
                            case BsonType.Int:
                            {
                                convertedCandidate[language][key] = this.validateAndConvertIntCandidate(subCandidate);
                                break;
                            }
                            case BsonType.Double:
                            {
                                convertedCandidate[language][key] = this.validateAndConvertDoubleCandidate(subCandidate);
                                break;
                            }
                            case BsonType.String:
                            {
                                convertedCandidate[language][key] = this.validateStringCandidate(subCandidate);
                                break;
                            }
                            case BsonType.ObjectId:
                            {
                                convertedCandidate[language][key] = this.validateAndConvertObjectIdCandidate(subCandidate);
                                break;
                            }
                            case BsonType.Date:
                            {
                                convertedCandidate[language][key] = this.validateAndConvertDateCandidate(subCandidate);
                                break;
                            }
                            case BsonType.Object:
                            {
                                convertedCandidate[language][key] = this.validateAndConvertObjectCandidateDeep(subCandidate, subDefinition, convertedCandidate[language][key]);
                                break;
                            }
                            case BsonType.Array:
                            {
                                convertedCandidate[language][key] = this.validateAndConvertArrayCandidate(subCandidate, subDefinition, convertedCandidate[language][key]);
                                break;
                            }
                            default:
                            {
                                convertedCandidate[language][key] = subCandidate; // If BSON type is not specified, leave value as is.
                            }
                        }
                    }

                    break;
                }
                default:
                {
                    const value = candidate[language];

                    switch (Schema.identifyDefinitionBsonType(definition))
                    {
                        case BsonType.Boolean:
                        {
                            convertedCandidate[language] = this.validateAndConvertBooleanCandidate(value);
                            break;
                        }
                        case BsonType.Int:
                        {
                            convertedCandidate[language] = this.validateAndConvertIntCandidate(value);
                            break;
                        }
                        case BsonType.Double:
                            convertedCandidate[language] = this.validateAndConvertDoubleCandidate(value);
                            break;
                        case BsonType.String:
                        {
                            convertedCandidate[language] = this.validateStringCandidate(value);
                            break;
                        }
                        case BsonType.ObjectId:
                        {
                            convertedCandidate[language] = this.validateAndConvertObjectIdCandidate(value);
                            break;
                        }
                        case BsonType.Date:
                        {
                            convertedCandidate[language] = this.validateAndConvertDateCandidate(value);
                            break;
                        }
                        case BsonType.Object:
                        {
                            convertedCandidate[language] = this.validateAndConvertObjectCandidateDeep(value, definition, convertedCandidate[language]);
                            break;
                        }
                        case BsonType.Array:
                        {
                            convertedCandidate[language] = this.validateAndConvertArrayCandidate(value, definition, convertedCandidate[language]);
                            break;
                        }
                        default:
                        {
                            convertedCandidate[language] = value; // If BSON type is not specified, leave value as is.
                        }
                    }
                }
            }
        }
    }
}

export default Service;
