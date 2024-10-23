import _, {keys} from "lodash";

import {MongoError} from "mongodb";

import Logger from "./Logger";
import Validator from "../helpers/Validator";
import ErrorSafe from "../safes/ErrorSafe";
import DataType from "./DataType.json";

import {isExist, isInitialized, isValidNumber, isValidDate, isValidId} from "@thedolphinos/utility4js";
import {InvalidArgumentsError, ClientError, InternalServerError, BadRequestError, ForbiddenError, HeadersMissingError, PathParametersMissingError, QueryStringMissingError, BodyMissingError, RequiredPropertiesMissingError} from "@thedolphinos/error4js";
import {AllowedProperties, PropertyDefinition} from "./Router";

class Controller
{
    public static readonly API_TYPE = {
        "REST": "REST",
        "NON_REST": "NON_REST"
    };

    /**
     * Maps special allowed property names to values.
     */
    public static readonly SPECIAL_ALLOWED_PROPERTY = {
        "ALL": "*"
    };

    /**
     * Maps request elements to request keys in Express.
     */
    private static readonly REQUEST_ELEMENT = {
        "HEADERS": "headers",
        "PATH_PARAMETERS": "params",
        "QUERY_STRING": "query",
        "BODY": "body"
    };

    private static readonly VALID_HTTP_STATUS_CODES = {
        INFORMATIONAL: [100, 101, 102, 103],
        SUCCESSFUL: [200, 201, 202, 203, 204, 205, 206],
        REDIRECT: [300, 301, 302, 303, 304, 307, 308],
        CLIENT_ERROR: [400, 401, 402, 403, 404, 405, 406, 407, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 422, 425, 426, 428, 429, 431, 451],
        SERVER_ERROR: [500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 511]
    };

    protected static extractAndAuthorizeHeaders (request: any, allowedProperties: AllowedProperties, isRequired: boolean = false): any
    {
        return Controller.extractAndAuthorizeRequestElement(Controller.REQUEST_ELEMENT.HEADERS, request, allowedProperties, undefined, isRequired);
    }

    protected static extractAndAuthorizePathParameters (request: any, allowedProperties: AllowedProperties, isRequired: boolean): any
    {
        return Controller.extractAndAuthorizeRequestElement(Controller.REQUEST_ELEMENT.PATH_PARAMETERS, request, allowedProperties, undefined, isRequired);
    }

    protected static extractAndAuthorizeQueryString (request: any, allowedProperties: AllowedProperties, isRequired: boolean): any
    {
        return Controller.extractAndAuthorizeRequestElement(Controller.REQUEST_ELEMENT.QUERY_STRING, request, allowedProperties, undefined, isRequired);
    }

    protected static extractAndAuthorizeBody (request: any, propertyDefinition: PropertyDefinition, isRequired: boolean): any
    {
        return Controller.extractAndAuthorizeRequestElement(Controller.REQUEST_ELEMENT.BODY, request, undefined, propertyDefinition, isRequired);
    }

    private static extractAndAuthorizeRequestElement (requestElement: string, request: any, allowedProperties?: AllowedProperties, propertyDefinition?: PropertyDefinition, isRequired: boolean = true): any
    {
        const extractedRequestElement: any = request[requestElement];

        const isSent: boolean = isInitialized(extractedRequestElement);

        switch (requestElement)
        {
            case Controller.REQUEST_ELEMENT.HEADERS:
            {
                if (isExist(allowedProperties))
                {
                    if (!Validator.isValidParameterAllowedProperties(allowedProperties))
                    {
                        throw new InvalidArgumentsError(ErrorSafe.getData().DEV_1);
                    }
                    if (isRequired && !isSent)
                    {
                        throw new HeadersMissingError(ErrorSafe.getData().HTTP_211);
                    }
                    if (isSent)
                    {
                        Controller.authorizePropertiesForAllowedProperties(extractedRequestElement, allowedProperties);
                    }
                }
                else
                {
                    if (isSent)
                    {
                        Logger.error(`Headers are not allowed but sent!`, 9);
                        throw new ForbiddenError(ErrorSafe.getData().HTTP_23);
                    }
                }

                break;
            }
            case Controller.REQUEST_ELEMENT.PATH_PARAMETERS:
            {
                if (isExist(allowedProperties))
                {
                    if (!Validator.isValidParameterAllowedProperties(allowedProperties))
                    {
                        throw new InvalidArgumentsError(ErrorSafe.getData().DEV_1);
                    }
                    if (isRequired && !isSent)
                    {
                        throw new PathParametersMissingError(ErrorSafe.getData().HTTP_213);
                    }
                    if (isSent)
                    {
                        Controller.authorizePropertiesForAllowedProperties(extractedRequestElement, allowedProperties);
                    }
                }
                else
                {
                    if (isSent)
                    {
                        Logger.error(`Path parameters are not allowed but sent!`, 9);
                        throw new ForbiddenError(ErrorSafe.getData().HTTP_23);
                    }
                }

                break;
            }
            case Controller.REQUEST_ELEMENT.QUERY_STRING:
            {
                if (isExist(allowedProperties))
                {
                    if (!Validator.isValidParameterAllowedProperties(allowedProperties))
                    {
                        throw new InvalidArgumentsError(ErrorSafe.getData().DEV_1);
                    }
                    if (isRequired && !isSent)
                    {
                        throw new QueryStringMissingError(ErrorSafe.getData().HTTP_215);
                    }
                    if (isSent)
                    {
                        Controller.authorizePropertiesForAllowedProperties(extractedRequestElement, allowedProperties);
                    }
                }
                else
                {
                    if (isSent)
                    {
                        Logger.error(`Query string is not allowed but sent!`, 9);
                        throw new ForbiddenError(ErrorSafe.getData().HTTP_23);
                    }
                }

                break;
            }
            case Controller.REQUEST_ELEMENT.BODY:
            {
                if (isExist(propertyDefinition))
                {
                    if (!Validator.isValidParameterPropertyDefinition(propertyDefinition))
                    {
                        throw new InvalidArgumentsError(ErrorSafe.getData().DEV_1);
                    }
                    if (isRequired && !isSent)
                    {
                        throw new BodyMissingError(ErrorSafe.getData().HTTP_217);
                    }
                    if (isSent)
                    {
                        Controller.authorizePropertiesForPropertyDefinition(extractedRequestElement, propertyDefinition);
                    }
                }
                else
                {
                    if (isSent)
                    {
                        Logger.error(`Body is not allowed but sent!`, 9);
                        throw new ForbiddenError(ErrorSafe.getData().HTTP_23);
                    }
                }

                break;
            }
        }

        return extractedRequestElement;
    }

    private static authorizePropertiesForAllowedProperties (object: any, allowedProperties: AllowedProperties): void
    {
        allowedProperties = _.cloneDeep(allowedProperties); // To lose reference.

        for (const property in object)
        {
            let isAllowed = false;

            if (isExist(allowedProperties.required))
            {
                const index = allowedProperties.required.indexOf(property);

                if (index > -1)
                {
                    isAllowed = true;
                    allowedProperties.required.splice(index, 1); // Remove the sent property to check if all required properties are sent.
                }
            }

            if (isExist(allowedProperties.optional))
            {
                if (allowedProperties.optional.includes(property))
                {
                    isAllowed = true;
                }
            }

            if (!isAllowed)
            {
                Logger.error(`Property "${property}" is not allowed!`, 9);
                throw new ForbiddenError(ErrorSafe.getData().HTTP_23);
            }
        }

        if (isExist(allowedProperties.required) && allowedProperties.required.length !== 0)
        {
            const notSentProperties = "";

            for (const property of allowedProperties.required)
            {
                notSentProperties.concat(`${property} ,`);
            }

            Logger.error(`Required properties "${notSentProperties.slice(0, -2)}" are not sent!`, 9);
            throw new ForbiddenError(ErrorSafe.getData().HTTP_23);
        }
    }

    private static authorizePropertiesForPropertyDefinition (value: any, propertyDefinition: PropertyDefinition, upperObject?: any, upperKey?: string | number, isRegexBased: boolean = false): void
    {
        const isRecursiveCall = isExist(upperObject) && isExist(upperKey); // Controls validation of `propertyDefinition`, which is not made on the recursive calls.

        const clonedValue = _.cloneDeep(value); // To lose reference. `value will be used to `

        const isString = _.isString(propertyDefinition);
        const isPlainObject = _.isPlainObject(propertyDefinition);
        const isArray = _.isArray(propertyDefinition);

        if (isString)
        {
            let isInvalidType;

            switch (propertyDefinition)
            {
                case DataType.Boolean:
                {
                    isInvalidType = !_.isBoolean(clonedValue);
                    break;
                }
                case DataType.Integer:
                {
                    isInvalidType = !isValidNumber(clonedValue) || !_.isInteger(clonedValue);
                    break;
                }
                case DataType.Float:
                {
                    isInvalidType = !isValidNumber(clonedValue);
                    break;
                }
                case DataType.String:
                {
                    isInvalidType = !_.isString(clonedValue);

                    if (isRecursiveCall && isRegexBased)
                    {
                        upperObject[upperKey] = {$regex: clonedValue};
                    }

                    break;
                }
                case DataType.ObjectId:
                {
                    isInvalidType = !isValidId(clonedValue);
                    break;
                }
                case DataType.Date:
                {
                    isInvalidType = !isValidDate(new Date(clonedValue));

                    if (isRecursiveCall)
                    {
                        upperObject[upperKey] = value;
                    }

                    break;
                }
                case DataType.Any:
                {
                    isInvalidType = false;
                    break;
                }
            }

            if (isInvalidType)
            {
                Logger.error(`Property type is not allowed! It must be type of "${propertyDefinition}".`, 9);
                throw new BadRequestError(ErrorSafe.getData().HTTP_21);
            }
        }
        else if (isPlainObject)
        {
            for (const key in propertyDefinition)
            {
                const isRequired = key.startsWith(":"); // Required property (must be sent with a value which is not undefined or null).
                const isNullable = key.startsWith(";"); // Required nullable property (must be sent but the value can be null).
                const isOptional = key.startsWith("."); // Optional property.

                const isRegexBased = key.endsWith("?"); // regex based property names ends with `?`.

                let propertyName = isRequired || isNullable || isOptional ? key.slice(1) : key;
                propertyName = isRegexBased ? propertyName.slice(0, -1) : propertyName;

                const propertyValue = _.cloneDeep(clonedValue[propertyName]);
                delete clonedValue[propertyName]; // Deleting to control if any not allowed properties are sent.

                if (isExist(propertyValue))
                {
                    // @ts-ignore
                    Controller.authorizePropertiesForPropertyDefinition(propertyValue, propertyDefinition[key], !isRecursiveCall ? value : upperObject[upperKey], propertyName, isRegexBased);
                }
                else
                {
                    if (isRequired ||
                        (isNullable && propertyValue !== null))
                    {
                        Logger.error(`Required property is not sent!`, 9);
                        throw new RequiredPropertiesMissingError(ErrorSafe.getData().HTTP_219);
                    }

                }
            }

            if (isInitialized(clonedValue))
            {
                Logger.error(`Not allowed properties are sent!`, 9);
                throw new BadRequestError(ErrorSafe.getData().HTTP_21);
            }
        }
        else if (isArray)
        {
            if (!_.isArray(clonedValue))
            {
                Logger.error(`Invalid property! It must be an array.`, 9);
                throw new BadRequestError(ErrorSafe.getData().HTTP_21);
            }

            for (let i = 0; i < clonedValue.length; i++)
            {
                Controller.authorizePropertiesForPropertyDefinition(clonedValue[i], propertyDefinition[0], !isRecursiveCall ? value : upperObject[upperKey], i);
            }
        }
    }

    protected async sendResponse (request: any, response: any, statusCode: number = 200, data?: any): Promise<void>
    {
        if (!Controller.VALID_HTTP_STATUS_CODES.INFORMATIONAL.includes(statusCode) &&
            !Controller.VALID_HTTP_STATUS_CODES.SUCCESSFUL.includes(statusCode))
        {
            throw new InternalServerError(ErrorSafe.getData().HTTP_11);
        }

        let responseData: any = {};

        if (isExist(data))
        {
            responseData.data = data;
        }

        if (isExist(response?.locals?.authorizationBundle))
        {
            responseData.token = response.locals.authorizationBundle;
        }
        if (isExist(response?.locals?.publicKey))
        {
            responseData.key = response.locals.publicKey;
        }

        if (!isInitialized(responseData))
        {
            responseData = undefined;
        }

        response.status(statusCode).json(responseData);
    }

    protected sendResponseWhenError (response: any, error: any): void
    {
        try
        {
            const httpError = this.toHTTPError(error);
            const {statusCode, code, message} = httpError;

            response.status(statusCode).json({code, message});
        }
        catch (error)
        {
            try
            {
                Logger.error(`Error occurred while sending error (stringified):\n${JSON.stringify(error)}`, 9);

                response.status(500).json();
            }
            catch (error)
            {
                console.error("There is (also) a problem inside the logger!");
                console.error(error);

                response.status(500).json();
            }
        }
    }

    private toHTTPError (error: any)
    {
        let isConvertToInternalServerError = false;

        const errorClassName = error.constructor.name; // This is used since Node's duplicate module imports causes reference problems during instanceof checks.

        if (errorClassName !== "DeveloperError" &&
            errorClassName !== "DbError" &&
            errorClassName !== "MongoError" &&
            errorClassName !== "HTTPError")
        {
            isConvertToInternalServerError = true;
            Logger.error(`Unexpected type of error! ${error}`, 9);
        }

        if (errorClassName === "HTTPError" &&
            // @ts-ignore
            !Controller.VALID_HTTP_STATUS_CODES.CLIENT_ERROR.includes(error.statusCode) && // TODO: fix this in error4js by making this field mandatory
            // @ts-ignore
            !Controller.VALID_HTTP_STATUS_CODES.SERVER_ERROR.includes(error.statusCode))
        {
            isConvertToInternalServerError = true;
            Logger.error(`Unexpected status code for HTTP error! ${error}`, 9);
        }

        if (isConvertToInternalServerError)
        {
            error = new InternalServerError(ErrorSafe.getData().HTTP_11);
        }

        if (errorClassName !== "InternalServerError")
        {
            if (errorClassName === "DeveloperError")
            {
                Logger.error(`Developer error is occurred! ${JSON.stringify(error)}`, 9);
                error = new InternalServerError(ErrorSafe.getData().HTTP_11);
            }
            else if (errorClassName === "DbError")
            {
                Logger.error(`Database level error is occurred! ${error}`, 9);
                error = new ClientError(ErrorSafe.getData().RESOURCE_NOT_FOUND);
            }
            else if (errorClassName === "MongoError")
            {
                Logger.error(`MongoDB level error is occurred! (Code: ${error.code}) (Message: ${error.message}) ${error}`, 9);

                if (error.code === 121)
                {
                    error = new BadRequestError(ErrorSafe.getData().INVALID_BODY);
                }
                else
                {
                    error = new InternalServerError(ErrorSafe.getData().HTTP_11);
                }
            }
            else if (errorClassName === "HTTPError")
            {
                Logger.error(`HTTP error is given! ${error}`, 9);
            }
        }

        return error;
    }
}

export default Controller;
