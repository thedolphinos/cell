import _ from "lodash";

import Logger from "./Logger";
import ErrorSafe from "../safes/ErrorSafe";
import DataType from "./DataType.json";

import {isExist, isInitialized, isValidNumber, isValidDate, isValidId} from "@thedolphinos/utility4js";
import {ClientError, InternalServerError, BadRequestError, ForbiddenError, HeadersMissingError, PathParametersMissingError, QueryStringMissingError, BodyMissingError, RequiredPropertiesMissingError} from "@thedolphinos/error4js";
import {AllowedProperties, SpecialAllowedPropertyAll, PropertyDefinition, HeadersControlDefinition, PathParametersControlDefinition, QueryStringControlDefinition, BodyControlDefinition, RequestElementsControlDefinitions} from "./Router";

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

    private static readonly VALID_HTTP_STATUS_CODES = {
        INFORMATIONAL: [100, 101, 102, 103],
        SUCCESSFUL: [200, 201, 202, 203, 204, 205, 206],
        REDIRECT: [300, 301, 302, 303, 304, 307, 308],
        CLIENT_ERROR: [400, 401, 402, 403, 404, 405, 406, 407, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 422, 425, 426, 428, 429, 431, 451],
        SERVER_ERROR: [500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 511]
    };

    protected static extractAndAuthorize (request: any, requestElementsControlDefinitions?: RequestElementsControlDefinitions): {headers: any, pathParameters: any, queryString: any, body: any}
    {
        const headers = Controller.extractAndAuthorizeHeaders(request, requestElementsControlDefinitions.headers);
        const pathParameters = Controller.extractAndAuthorizePathParameters(request, requestElementsControlDefinitions.pathParameters);
        const queryString = Controller.extractAndAuthorizeQueryString(request, requestElementsControlDefinitions.queryString);
        const body = Controller.extractAndAuthorizeBody(request, requestElementsControlDefinitions.body);

        return {
            headers,
            pathParameters,
            queryString,
            body
        };
    }

    protected static extractAndAuthorizeHeaders (request: any, headerControlDefinition: HeadersControlDefinition): any
    {
        const headers: any = request.headers;

        const isSent: boolean = isInitialized(headers);

        switch (headerControlDefinition.status)
        {
            case "required":
            {
                if (!isSent)
                {
                    throw new HeadersMissingError(ErrorSafe.getData().HTTP_211);
                }

                Controller.authorizePropertiesForAllowedProperties("headers", headers, headerControlDefinition.allowedProperties);

                break;
            }
            case "optional":
            {
                if (isExist(headerControlDefinition.allowedProperties))
                {
                    Controller.authorizePropertiesForAllowedProperties("headers", headers, headerControlDefinition.allowedProperties);
                }

                break;
            }
            case "forbidden":
            {
                if (isSent)
                {
                    Logger.warn(`In the request, "headers" sent when not allowed!`, 9);
                    throw new ForbiddenError(ErrorSafe.getData().HTTP_23);
                }

                break;
            }
        }

        return headers;
    }

    protected static extractAndAuthorizePathParameters (request: any, pathParametersControlDefinition: PathParametersControlDefinition): any
    {
        const pathParameters: any = request.params;

        const isSent: boolean = isInitialized(pathParameters);

        switch (pathParametersControlDefinition.status)
        {
            case "required":
            {
                if (!isSent)
                {
                    throw new PathParametersMissingError(ErrorSafe.getData().HTTP_213);
                }

                Controller.authorizePropertiesForAllowedProperties("path parameters", pathParameters, pathParametersControlDefinition.allowedProperties);

                break;
            }
            case "optional":
            {
                if (isExist(pathParametersControlDefinition.allowedProperties))
                {
                    Controller.authorizePropertiesForAllowedProperties("path parameters", pathParameters, pathParametersControlDefinition.allowedProperties);
                }

                break;
            }
            case "forbidden":
            {
                if (isSent)
                {
                    Logger.warn(`In the request, "path parameters" sent when not allowed!`, 9);
                    throw new ForbiddenError(ErrorSafe.getData().HTTP_23);
                }

                break;
            }
        }

        return pathParameters;
    }

    protected static extractAndAuthorizeQueryString (request: any, queryStringControlDefinition: QueryStringControlDefinition): any
    {
        const query: any = request.query;

        const isSent: boolean = isInitialized(query);

        switch (queryStringControlDefinition.status)
        {
            case "required":
            {
                if (!isSent)
                {
                    throw new QueryStringMissingError(ErrorSafe.getData().HTTP_215);
                }

                Controller.authorizePropertiesForAllowedProperties("query string", query, queryStringControlDefinition.allowedProperties);

                break;
            }
            case "optional":
            {
                if (isExist(queryStringControlDefinition.allowedProperties))
                {
                    Controller.authorizePropertiesForAllowedProperties("query string", query, queryStringControlDefinition.allowedProperties);
                }

                break;
            }
            case "forbidden":
            {
                if (isSent)
                {
                    Logger.warn(`In the request, "query string" sent when not allowed!`, 9);
                    throw new ForbiddenError(ErrorSafe.getData().HTTP_23);
                }

                break;
            }
        }

        return query;
    }

    protected static extractAndAuthorizeBody (request: any, bodyControlDefinition: BodyControlDefinition): any
    {
        const body: any = request.body;

        const isSent: boolean = isInitialized(body);

        switch (bodyControlDefinition.status)
        {
            case "required":
            {
                if (!isSent)
                {
                    throw new BodyMissingError(ErrorSafe.getData().HTTP_217);
                }

                Controller.authorizePropertiesForPropertyDefinition("", body, bodyControlDefinition.propertyDefinition);

                break;
            }
            case "optional":
            {
                if (isExist(bodyControlDefinition.propertyDefinition))
                {
                    Controller.authorizePropertiesForPropertyDefinition("", body, bodyControlDefinition.propertyDefinition);
                }

                break;
            }
            case "forbidden":
            {
                if (isSent)
                {
                    Logger.warn(`In the request, "body" sent when not allowed!`, 9);
                    throw new ForbiddenError(ErrorSafe.getData().HTTP_23);
                }

                break;
            }
        }

        return body;
    }

    private static authorizePropertiesForAllowedProperties (requestElementErrorName: string, object: any, allowedProperties: AllowedProperties | SpecialAllowedPropertyAll): void
    {
        const isString = _.isString(allowedProperties);
        const isPlainObject = _.isPlainObject(allowedProperties);

        if (isString)
        {
            if (<SpecialAllowedPropertyAll>allowedProperties === "*")
            {
                return;
            }
            else
            {
                throw new BadRequestError(ErrorSafe.getData().HTTP_21);
            }
        }
        else if (isPlainObject)
        {
            allowedProperties = _.cloneDeep(<AllowedProperties>allowedProperties); // To lose reference.

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
                    if (allowedProperties.optional.includes(property) || allowedProperties.optional.includes("*"))
                    {
                        isAllowed = true;
                    }
                }

                if (!isAllowed)
                {
                    Logger.warn(`In the "${requestElementErrorName}", property "${property}" is not allowed!`, 9);
                    throw new ForbiddenError(ErrorSafe.getData().HTTP_23);
                }
            }

            if (isExist(allowedProperties.required) && allowedProperties.required.length !== 0)
            {
                const notSentProperties = "";
                let notSentPropertyCount = 0;

                for (const property of allowedProperties.required)
                {
                    notSentProperties.concat(`${property} ,`);
                    notSentPropertyCount++;
                }

                Logger.warn(`In the "${requestElementErrorName}", required ${notSentPropertyCount === 1 ? "property" : "properties"} "${notSentProperties.slice(0, -2)}" ${notSentPropertyCount === 1 ? "is" : "are"} not sent!`, 9);
                throw new ForbiddenError(ErrorSafe.getData().HTTP_23);
            }
        }
        else
        {
            throw new BadRequestError(ErrorSafe.getData().HTTP_21);
        }
    }

    private static authorizePropertiesForPropertyDefinition (deepKey: string, value: any, propertyDefinition: PropertyDefinition, upperObject?: any, upperKey?: string | number, isRegexBased: boolean = false): void
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
                Logger.warn(`In the "body", for property "${deepKey}", property type is invalid.`, 9);
                throw new BadRequestError(ErrorSafe.getData().HTTP_21);
            }
        }
        else if (isPlainObject)
        {
            if (!_.isPlainObject(clonedValue))
            {
                Logger.warn(`In the "body", for property "${deepKey}", property type is invalid. It must be an object.`, 9);
                throw new BadRequestError(ErrorSafe.getData().HTTP_21);
            }

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
                    Controller.authorizePropertiesForPropertyDefinition(`${deepKey}.${key}`, propertyValue, propertyDefinition[key], !isRecursiveCall ? value : upperObject[upperKey], propertyName, isRegexBased);
                }
                else
                {
                    if (isRequired ||
                        (isNullable && propertyValue !== null))
                    {
                        Logger.warn(`In the "body", property "${deepKey}.${key}" is required but not sent!`, 9);
                        throw new RequiredPropertiesMissingError(ErrorSafe.getData().HTTP_219);
                    }

                }
            }

            if (isInitialized(clonedValue))
            {
                Logger.warn(`In the "body", for property "${deepKey}", not allowed properties are sent!`, 9);
                throw new BadRequestError(ErrorSafe.getData().HTTP_21);
            }
        }
        else if (isArray)
        {
            if (!_.isArray(clonedValue))
            {
                Logger.warn(`In the "body", for property "${deepKey}", property type is invalid. It must be an array.`, 9);
                throw new BadRequestError(ErrorSafe.getData().HTTP_21);
            }

            for (let i = 0; i < clonedValue.length; i++)
            {
                Controller.authorizePropertiesForPropertyDefinition(`${deepKey}.${i}`, clonedValue[i], propertyDefinition[0], !isRecursiveCall ? value : upperObject[upperKey], i);
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
            if (!isExist(responseData.auth))
            {
                responseData.auth = {};
            }

            responseData.auth.token = response.locals.authorizationBundle;
        }
        if (isExist(response?.locals?.publicKey))
        {
            if (!isExist(responseData.auth))
            {
                responseData.auth = {};
            }

            responseData.auth.key = response.locals.publicKey;
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
            const httpError = this.toHttpError(error);
            const {statusCode, code, message} = httpError;

            response.status(statusCode).json({code, message});
        }
        catch (error)
        {
            try
            {
                Logger.error(`Error occurred while sending error:\n${isExist(error.toString) ? error.toString() : JSON.stringify(error)}`, 9);
                console.error(error);
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

    private toHttpError (error: any)
    {
        let isConvertToInternalServerError = false;

        let errorType: string = error?.type || error.constructor.name; // This is used since Node's duplicate module imports causes reference problems during instanceof checks.

        if (errorType !== "DeveloperError" &&
            errorType !== "DbError" &&
            errorType !== "MongoError" &&
            errorType !== "HttpError")
        {
            isConvertToInternalServerError = true;
            Logger.warn(`Internal server error occurred!\n${isExist(error.toString) ? error.toString() : JSON.stringify(error)}`, 9);
            console.error(error);
        }

        if (errorType === "HttpError" &&
            // @ts-ignore
            !Controller.VALID_HTTP_STATUS_CODES.CLIENT_ERROR.includes(error.statusCode) && // TODO: fix this in error4js by making this field mandatory
            // @ts-ignore
            !Controller.VALID_HTTP_STATUS_CODES.SERVER_ERROR.includes(error.statusCode))
        {
            isConvertToInternalServerError = true;
            Logger.warn(`Unexpected status code for HTTP error!\n${isExist(error.toString) ? error.toString() : JSON.stringify(error)}`, 9);
            console.error(error);
        }

        if (isConvertToInternalServerError)
        {
            error = new InternalServerError(ErrorSafe.getData().HTTP_11);
            errorType = error.type;
        }

        if (errorType !== "InternalServerError")
        {
            if (errorType === "DeveloperError")
            {
                Logger.warn(`Developer error is occurred!\n${isExist(error.toString) ? error.toString() : JSON.stringify(error)}`, 9);
                console.error(error);
                error = new InternalServerError(ErrorSafe.getData().HTTP_11);
            }
            else if (errorType === "DbError")
            {
                Logger.warn(`Database level error is occurred!\n${isExist(error.toString) ? error.toString() : JSON.stringify(error)}`, 9);
                console.error(error);
                error = new ClientError(ErrorSafe.getData().RESOURCE_NOT_FOUND);
            }
            else if (errorType === "MongoError")
            {
                Logger.warn(`MongoDB level error is occurred!\nCode: ${error.code}\nMessage: ${error.message}\n${isExist(error.toString) ? error.toString() : JSON.stringify(error)}`, 9);
                console.error(error);

                if (error.code === 121)
                {
                    error = new BadRequestError(ErrorSafe.getData().INVALID_BODY);
                }
                else
                {
                    error = new InternalServerError(ErrorSafe.getData().HTTP_11);
                }
            }
            else if (errorType === "HttpError")
            {
                Logger.warn(`HTTP error is given!\n${isExist(error.toString) ? error.toString() : JSON.stringify(error)}`, 9);
                console.error(error);
            }
        }

        return error;
    }
}

export default Controller;
