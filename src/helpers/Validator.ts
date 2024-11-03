import fs from "node:fs";

import _ from "lodash";

import {isExist, isInitialized, isValidEnumValue} from "@thedolphinos/utility4js";

/**
 * Validates.
 * Methods which named `validate`, throws exception if validation is not successful.
 * Methods which named `isValid`, returns the result of validation.
 */

// TODO: I hardcoded some static values to get rid of circular dependency. maybe move functions inside the classes?

class Validator
{
    private constructor () {}

    public static validateFilePath (path: string | undefined): asserts path is string
    {
        if (!path || !isExist(path))
        {
            throw new Error("Path not specified.");
        }

        if (!fs.existsSync(path))
        {
            throw new Error("File does not exist.");
        }

        const pathInformation = fs.lstatSync(path);

        if (!pathInformation.isFile())
        {
            throw new Error("Path is not a file.");
        }

        try
        {
            fs.accessSync(path, fs.constants.F_OK | fs.constants.R_OK);
        }
        catch (error)
        {
            throw new Error("File is not accessible for reading.");
        }
    }

    public static validateDirectoryPath (path: string | undefined): asserts path is string
    {
        if (!isExist(path))
        {
            throw new Error("Path not specified.");
        }

        if (!fs.existsSync(path))
        {
            throw new Error("Directory does not exists.");
        }

        const pathInformation = fs.lstatSync(path);

        if (!pathInformation.isDirectory())
        {
            throw new Error("Path is not a directory.");
        }

        try
        {
            fs.accessSync(path, fs.constants.F_OK | fs.constants.R_OK);
        }
        catch (error)
        {
            throw new Error("Directory is not accessible for reading.");
        }
    }

    /**** Router ****/
    /**
     * @typedef {{[required]: Array<string>, [optional]: Array<string>} | string} AllowedProperties
     * @typedef {{[headers]: AllowedProperties, [pathParameters]: AllowedProperties, [queryString]: AllowedProperties, [body]: AllowedProperties}} AllowedPropertiesForRequestElements
     * @typedef {{[isEnabled]: boolean, [allowedPropertiesForRequestElements]: AllowedPropertiesForRequestElements}} RouteDefinition
     * @param {{[SEARCH]: RouteDefinition, [READ]: RouteDefinition, [READ_ONE_BY_ID]: RouteDefinition, [CREATE_ONE]: RouteDefinition, [UPDATE_ONE_BY_ID_AND_VERSION]: RouteDefinition, [REPLACE_ONE_BY_ID_AND_VERSION]: RouteDefinition, [SOFT_DELETE_ONE_BY_ID_AND_VERSION]: RouteDefinition, [DELETE_ONE_BY_ID_AND_VERSION]: RouteDefinition}} routesDefinitions - Represents route definitions where each contains enabled status and allowed properties for request elements.
     * @returns {boolean}
     * @public
     */
    static isValidParameterRoutesDefinitions (routesDefinitions: any): boolean
    {
        if (!_.isPlainObject(routesDefinitions))
        {
            return false;
        }

        const routeNames = Object.keys(routesDefinitions);

        for (const routeName of routeNames)
        {
            if (![
                "SEARCH",
                "READ",
                "READ_ONE_BY_ID",
                "CREATE_ONE",
                "UPDATE_ONE_BY_ID_AND_VERSION",
                "REPLACE_ONE_BY_ID_AND_VERSION",
                "SOFT_DELETE_ONE_BY_ID_AND_VERSION",
                "DELETE_ONE_BY_ID_AND_VERSION",
                "SOFT_DELETE_MANY_BY_ID_AND_VERSION",
                "DELETE_MANY_BY_ID_AND_VERSION"
            ].includes(routeName))
            {
                return false;
            }

            const routeDefinition = routesDefinitions[routeName];
            const {isEnabled, allowedPropertiesForRequestElements} = routeDefinition;

            if (isExist(isEnabled) && !_.isBoolean(isEnabled))
            {
                return false;
            }

            if (isExist(allowedPropertiesForRequestElements) && !Validator.isValidParameterAllowedPropertiesForRequestElements(allowedPropertiesForRequestElements))
            {
                return false;
            }
        }

        return true;
    }

    /**
     * @typedef {{[required]: Array<string>, [optional]: Array<string>} | string} AllowedProperties
     * @param {{[headers]: AllowedProperties, [pathParameters]: AllowedProperties, [queryString]: AllowedProperties, [body]: AllowedProperties}} allowedPropertiesForRequestElements
     * @returns {boolean}
     * @public
     */
    static isValidParameterAllowedPropertiesForRequestElements (allowedPropertiesForRequestElements: any): boolean
    {
        if (!_.isPlainObject(allowedPropertiesForRequestElements))
        {
            return false;
        }

        for (const requestElement in allowedPropertiesForRequestElements)
        {
            switch (requestElement)
            {
                case "headers":
                case "pathParameters":
                case "queryString":
                {
                    const allowedProperties = allowedPropertiesForRequestElements[requestElement];

                    if (isExist(allowedProperties) && !Validator.isValidParameterAllowedProperties(allowedProperties))
                    {
                        return false;
                    }

                    break;
                }
                case "body":
                {
                    const propertyDefinition = allowedPropertiesForRequestElements[requestElement];

                    if (isExist(propertyDefinition) && !Validator.isValidParameterPropertyDefinition(propertyDefinition))
                    {
                        return false;
                    }

                    break;
                }
                default:
                {
                    return false; // not allowed request element.
                }
            }
        }

        return true;
    }

    /**
     * @param {{[required]: Array<string>, [optional]: Array<string>} | string} allowedProperties
     * @returns {boolean}
     * @public
     */
    static isValidParameterAllowedProperties (allowedProperties: any): boolean
    {
        if (_.isPlainObject(allowedProperties))
        {
            let isAtLeastOneTypeIsInitialized = false;
            const duplicateCheck: string[] = [];
            const ALLOWED_TYPES = ["required", "optional"]; // TODO should it be moved to a static variable?

            for (const type in allowedProperties)
            {
                if (!ALLOWED_TYPES.includes(type))
                {
                    return false;
                }

                if (isInitialized(allowedProperties[type]))
                {
                    isAtLeastOneTypeIsInitialized = true;

                    for (const allowedProperty of allowedProperties[type])
                    {
                        if (!_.isString(allowedProperty) || _.isEqual(allowedProperty, ""))
                        {
                            return false;
                        }

                        if (duplicateCheck.includes(allowedProperty))
                        {
                            return false;
                        }
                        else
                        {
                            duplicateCheck.push(allowedProperty);
                        }
                    }
                }
            }

            if (!isAtLeastOneTypeIsInitialized)
            {
                return false;
            }
        }

        return true;
    }

    /**
     * @typedef {{[]: string | PropertyDefinition} | Array<{[]: string | PropertyDefinition}>} PropertyDefinition
     * @param {PropertyDefinition} propertyDefinition
     * @returns {boolean}
     * @public
     */
    static isValidParameterPropertyDefinition (propertyDefinition: any): boolean
    {
        const isString = _.isString(propertyDefinition);
        const isPlainObject = _.isPlainObject(propertyDefinition);
        const isArray = _.isArray(propertyDefinition);

        if (isString)
        {
            // property definition is data type.
            return isValidEnumValue(propertyDefinition, {
                "Boolean": "Boolean",
                "Integer": "Integer",
                "Float": "Float",
                "String": "String",
                "ObjectId": "ObjectId",
                "Date": "Date",
                "Any": "Any"
            });
        }
        else if (isPlainObject)
        {
            for (const key in propertyDefinition)
            {
                if (!Validator.isValidParameterPropertyDefinition(propertyDefinition[key]))
                {
                    return false;
                }
            }
        }
        else if (isArray)
        {
            // property definition must be the one and only item in array.
            if (propertyDefinition.length !== 1)
            {
                return false;
            }

            if (!Validator.isValidParameterPropertyDefinition(propertyDefinition[0]))
            {
                return false;
            }
        }
        else
        {
            return false;
        }

        return true;
    }

    /**
     * @param {{[READ]: Array<Function>, [READ_ONE_BY_ID]: Array<Function>, [CREATE_ONE]: Array<Function>, [UPDATE_ONE_BY_ID_AND_VERSION]: Array<Function>, [REPLACE_ONE_BY_ID_AND_VERSION]: Array<Function>, [SOFT_DELETE_ONE_BY_ID_AND_VERSION]: Array<Function>, [DELETE_ONE_BY_ID_AND_VERSION]: Array<Function>}} extraVerificationFunctions
     * @returns {boolean}
     * @public
     */
    static isValidParameterExtraVerificationFunctions (extraVerificationFunctions: any): boolean
    {
        if (!_.isPlainObject(extraVerificationFunctions))
        {
            return false;
        }

        const routeNames = Object.keys(extraVerificationFunctions);

        for (const routeName of routeNames)
        {
            if (![
                "SEARCH",
                "READ",
                "READ_ONE_BY_ID",
                "CREATE_ONE",
                "UPDATE_ONE_BY_ID_AND_VERSION",
                "REPLACE_ONE_BY_ID_AND_VERSION",
                "SOFT_DELETE_ONE_BY_ID_AND_VERSION",
                "DELETE_ONE_BY_ID_AND_VERSION",
                "SOFT_DELETE_MANY_BY_ID_AND_VERSION",
                "DELETE_MANY_BY_ID_AND_VERSION"
            ].includes(routeName))
            {
                return false;
            }

            const extraVerificationFunctionsOfRoute = extraVerificationFunctions[routeName];

            if (!_.isArray(extraVerificationFunctionsOfRoute))
            {
                return false;
            }

            for (const extraVerificationFunction of extraVerificationFunctionsOfRoute)
            {
                if (!_.isFunction(extraVerificationFunction))
                {
                    return false;
                }
            }
        }

        return true;
    }
}

export default Validator;
