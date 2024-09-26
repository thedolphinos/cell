const {
    InvalidArgumentsError,
    BadRequestError
} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");

const _ = require("lodash");

const ErrorSafe = require("../safes/ErrorSafe");
const SessionManager = require("../db/SessionManager");
const ControllerService = require("../services/ControllerService");
const Controller = require("../core/Controller");
const Validator = require("../helpers/Validator");

/**
 * A controller which contains CRUD operations.
 * It can be used as a base class for the controllers of your application.
 */
class CrudController extends Controller
{
    /**
     * Represents API type which must be one of `API_TYPE`.
     *
     * @type {string}
     * @private
     */
    _apiType;

    /**
     * @returns {string}
     */
    get apiType ()
    {
        return this._apiType;
    }

    /**
     * Represents controller service to be used for CRUD methods.
     *
     * @type {ControllerService}
     * @private
     */
    _controllerService;

    /**
     * @returns {ControllerService}
     */
    get controllerService ()
    {
        return this._controllerService;
    }

    /**
     * @param {string} apiType - Represents API type which must be one of `API_TYPE`.
     * @param {ControllerService} controllerService - Represents controller service to be used for CRUD methods.
     */
    constructor (apiType, controllerService)
    {
        super();

        if (!utility.isValidEnumValue(apiType, CrudController.API_TYPE) ||
            !(controllerService instanceof ControllerService))
        {
            throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
        }

        this._apiType = apiType;
        this._controllerService = controllerService;
    }

    /**
     * Fetches the requested documents according to a single search value.
     *
     * @param {Object} request - Represents request.
     * @param {Object} response - Represents response.
     * @param {Function} [next] - Represents the next middleware function in the application’s request-response cycle.
     * @param {Object} [hooks] - Represents hooks.
     * @typedef {{[required]: Array<string>, [optional]: Array<string>} | string} AllowedProperties
     * @typedef {{[]: string | PropertyDefinition} | Array<{[]: string | PropertyDefinition}>} PropertyDefinition
     * @param {{[headers]: AllowedProperties, [pathParameters]: AllowedProperties, [queryString]: AllowedProperties, [body]: PropertyDefinition}} [allowedPropertiesForRequestElements] - Represents allowed properties for request elements.
     * @param {Array<string>} searchFields - Specifies the fields where the search will be performed on.
     * @return {Promise<void>}
     */
    async search (request, response, next = undefined, hooks = undefined, allowedPropertiesForRequestElements = undefined, searchFields)
    {
        try
        {
            if (!Validator.isValidRouteFacingControllerMethodParameters(request, response, next, hooks, allowedPropertiesForRequestElements))
            {
                throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
            }

            if (!_.isArray(searchFields))
            {
                throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
            }

            for (const field of searchFields)
            {
                if (!_.isString(field))
                {
                    throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
                }
            }

            hooks = utility.init(hooks, {});
            hooks.bearer = utility.init(hooks.bearer, {});

            let value, query, options;

            switch (this._apiType)
            {
                case Controller.API_TYPE.REST:
                {
                    CrudController._extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
                    CrudController._extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
                    const queryString = CrudController._extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString);
                    value = queryString.value;
                    query = queryString.query;
                    CrudController._extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body, false);
                    break;
                }
                case Controller.API_TYPE.NON_REST:
                {
                    CrudController._extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
                    CrudController._extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
                    CrudController._extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString, false);
                    const body = CrudController._extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body);
                    value = body.value;
                    query = body.query;
                    options = body.options;

                    break;
                }
            }

            if (!_.isString(value))
            {
                throw new BadRequestError(ErrorSafe.get().INVALID_SEARCH_VALUE);
            }

            utility.isExist(hooks.value) ? await hooks.value(value) : undefined;
            utility.isExist(hooks.query) ? await hooks.query(query) : undefined;
            utility.isExist(hooks.options) ? await hooks.options(options) : undefined;

            let result; // Contains documents and count.
            const {session} = SessionManager.generateSessionsForController(hooks);
            await SessionManager.exec(async () =>
                                      {
                                          utility.isExist(hooks.before) ? await hooks.before(value, query, options, session) : undefined;
                                          result = !utility.isInitialized(value)
                                                   ? await this._controllerService.read({}, options, session, {bearer: hooks.bearer})
                                                   : await this._controllerService.search(value, query, searchFields, options, session, {bearer: hooks.bearer});
                                          utility.isExist(hooks.after) ? await hooks.after(result.documents, result.count, session) : undefined;
                                      }, undefined, session);

            await this._sendResponse(request, response, 200, result);
        }
        catch (error)
        {
            this._sendResponseWhenError(response, error);
        }
    }

    /**
     * Fetches the requested documents.
     *
     * @param {Object} request - Represents request.
     * @param {Object} response - Represents response.
     * @param {Function} [next] - Represents the next middleware function in the application’s request-response cycle.
     * @param {Object} [hooks] - Represents hooks.
     * @typedef {{[required]: Array<string>, [optional]: Array<string>} | string} AllowedProperties
     * @typedef {{[]: string | PropertyDefinition} | Array<{[]: string | PropertyDefinition}>} PropertyDefinition
     * @param {{[headers]: AllowedProperties, [pathParameters]: AllowedProperties, [queryString]: AllowedProperties, [body]: PropertyDefinition}} [allowedPropertiesForRequestElements] - Represents allowed properties for request elements.
     * @return {Promise<void>}
     */
    async read (request, response, next = undefined, hooks = undefined, allowedPropertiesForRequestElements = undefined)
    {
        try
        {
            if (!Validator.isValidRouteFacingControllerMethodParameters(request, response, next, hooks, allowedPropertiesForRequestElements))
            {
                throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
            }

            hooks = utility.init(hooks, {});
            hooks.bearer = utility.init(hooks.bearer, {});

            let query, options;

            switch (this._apiType)
            {
                case Controller.API_TYPE.REST:
                {
                    CrudController._extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
                    CrudController._extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
                    const queryString = CrudController._extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString);
                    query = queryString.query;
                    CrudController._extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body, false);
                    break;
                }
                case Controller.API_TYPE.NON_REST:
                {
                    CrudController._extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
                    CrudController._extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
                    CrudController._extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString, false);
                    const body = CrudController._extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body);
                    query = body.query;
                    options = body.options;
                    break;
                }
            }

            utility.isExist(hooks.query) ? await hooks.query(query) : undefined;
            utility.isExist(hooks.options) ? await hooks.options(options) : undefined;

            let result; // Contains documents and count.
            const {session} = SessionManager.generateSessionsForController(hooks);
            await SessionManager.exec(async () =>
                                      {
                                          utility.isExist(hooks.before) ? await hooks.before(query, options, session) : undefined;
                                          result = await this._controllerService.read(query, options, session, {bearer: hooks.bearer});
                                          utility.isExist(hooks.after) ? await hooks.after(result.documents, result.count, session) : undefined;
                                      }, undefined, session);

            await this._sendResponse(request, response, 200, result);
        }
        catch (error)
        {
            this._sendResponseWhenError(response, error);
        }
    }

    /**
     * Fetches the requested document by ID.
     *
     * @param {Object} request - Represents request.
     * @param {Object} response - Represents response.
     * @param {Function} [next] - Represents the next middleware function in the application’s request-response cycle.
     * @param {Object} [hooks] - Represents hooks.
     * @typedef {{[required]: Array<string>, [optional]: Array<string>} | string} AllowedProperties
     * @typedef {{[]: string | PropertyDefinition} | Array<{[]: string | PropertyDefinition}>} PropertyDefinition
     * @param {{[headers]: AllowedProperties, [pathParameters]: AllowedProperties, [queryString]: AllowedProperties, [body]: PropertyDefinition}} [allowedPropertiesForRequestElements] - Represents allowed properties for request elements.
     * @return {Promise<void>}
     */
    async readOneById (request, response, next = undefined, hooks = undefined, allowedPropertiesForRequestElements = undefined)
    {
        try
        {
            if (!Validator.isValidRouteFacingControllerMethodParameters(request, response, next, hooks, allowedPropertiesForRequestElements))
            {
                throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
            }

            hooks = utility.init(hooks, {});
            hooks.bearer = utility.init(hooks.bearer, {});

            let _id;

            switch (this._apiType)
            {
                case Controller.API_TYPE.REST:
                {
                    CrudController._extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
                    const pathParameters = CrudController._extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters);
                    _id = pathParameters._id;
                    CrudController._extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString, false);
                    CrudController._extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body, false);
                    break;
                }
                case Controller.API_TYPE.NON_REST:
                {
                    CrudController._extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
                    CrudController._extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
                    CrudController._extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString, false);
                    const body = CrudController._extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body);
                    _id = body._id;
                    break;
                }
            }

            let document;
            const {session} = SessionManager.generateSessionsForController(hooks);
            await SessionManager.exec(async () =>
                                      {
                                          utility.isExist(hooks.before) ? await hooks.before(_id, session) : undefined;
                                          document = await this._controllerService.readOneById(_id, session, {bearer: hooks.bearer});
                                          utility.isExist(hooks.after) ? await hooks.after(document, session) : undefined;
                                      }, undefined, session);

            await this._sendResponse(request, response, 200, {document});
        }
        catch (error)
        {
            this._sendResponseWhenError(response, error);
        }
    }

    /**
     * Creates the requested document.
     *
     * @param {Object} request - Represents request.
     * @param {Object} response - Represents response.
     * @param {Function} [next] - Represents the next middleware function in the application’s request-response cycle.
     * @param {Object} [hooks] - Represents hooks.
     * @typedef {{[required]: Array<string>, [optional]: Array<string>} | string} AllowedProperties
     * @typedef {{[]: string | PropertyDefinition} | Array<{[]: string | PropertyDefinition}>} PropertyDefinition
     * @param {{[headers]: AllowedProperties, [pathParameters]: AllowedProperties, [queryString]: AllowedProperties, [body]: PropertyDefinition}} [allowedPropertiesForRequestElements] - Represents allowed properties for request elements.
     * @return {Promise<void>}
     */
    async createOne (request, response, next = undefined, hooks = undefined, allowedPropertiesForRequestElements = undefined)
    {
        try
        {
            if (!Validator.isValidRouteFacingControllerMethodParameters(request, response, next, hooks, allowedPropertiesForRequestElements))
            {
                throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
            }

            hooks = utility.init(hooks, {});
            hooks.bearer = utility.init(hooks.bearer, {});

            let fields;

            switch (this._apiType)
            {
                case Controller.API_TYPE.REST:
                {
                    CrudController._extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
                    CrudController._extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
                    CrudController._extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString, false);
                    fields = CrudController._extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body);
                    break;
                }
                case Controller.API_TYPE.NON_REST:
                {
                    CrudController._extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
                    CrudController._extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
                    CrudController._extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString, false);
                    const body = CrudController._extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body);
                    fields = body.fields;
                    break;
                }
            }

            utility.isExist(hooks.fields) ? await hooks.fields(fields) : undefined;

            let document;
            const {session} = SessionManager.generateSessionsForController(hooks);
            await SessionManager.exec(async () =>
                                      {
                                          utility.isExist(hooks.before) ? await hooks.before(fields, session) : undefined;
                                          document = await this._controllerService.createOne(fields, session, {bearer: hooks.bearer});
                                          utility.isExist(hooks.after) ? await hooks.after(document, session) : undefined;
                                      }, undefined, session);

            await this._sendResponse(request, response, 201, {document});
        }
        catch (error)
        {
            this._sendResponseWhenError(response, error);
        }
    }

    /**
     * Updates the requested document by ID and version.
     *
     * @param {Object} request - Represents request.
     * @param {Object} response - Represents response.
     * @param {Function} [next] - Represents the next middleware function in the application’s request-response cycle.
     * @param {Object} [hooks] - Represents hooks.
     * @typedef {{[required]: Array<string>, [optional]: Array<string>} | string} AllowedProperties
     * @typedef {{[]: string | PropertyDefinition} | Array<{[]: string | PropertyDefinition}>} PropertyDefinition
     * @param {{[headers]: AllowedProperties, [pathParameters]: AllowedProperties, [queryString]: AllowedProperties, [body]: PropertyDefinition}} [allowedPropertiesForRequestElements] - Represents allowed properties for request elements.
     * @return {Promise<void>}
     */
    async updateOneByIdAndVersion (request, response, next = undefined, hooks = undefined, allowedPropertiesForRequestElements = undefined)
    {
        try
        {
            if (!Validator.isValidRouteFacingControllerMethodParameters(request, response, next, hooks, allowedPropertiesForRequestElements))
            {
                throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
            }

            hooks = utility.init(hooks, {});
            hooks.bearer = utility.init(hooks.bearer, {});

            let _id, version, fields;

            switch (this._apiType)
            {
                case Controller.API_TYPE.REST:
                {
                    CrudController._extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
                    const pathParameters = CrudController._extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters);
                    _id = pathParameters._id;
                    const queryString = CrudController._extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString);
                    version = queryString.version;
                    fields = CrudController._extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body, false);
                    break;
                }
                case Controller.API_TYPE.NON_REST:
                {
                    CrudController._extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
                    CrudController._extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
                    CrudController._extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString, false);
                    const body = CrudController._extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body);
                    _id = body._id;
                    version = body.version;
                    fields = body.fields;
                    break;
                }
            }

            utility.isExist(hooks.fields) ? await hooks.fields(fields) : undefined;

            let document;
            const {session} = SessionManager.generateSessionsForController(hooks);
            await SessionManager.exec(async () =>
                                      {
                                          utility.isExist(hooks.before) ? await hooks.before(_id, version, fields, session) : undefined;
                                          document = await this._controllerService.updateOneByIdAndVersion(_id, version, fields, session, {bearer: hooks.bearer});
                                          utility.isExist(hooks.after) ? await hooks.after(document, session) : undefined;
                                      }, undefined, session);

            await this._sendResponse(request, response, 200, {document});
        }
        catch (error)
        {
            this._sendResponseWhenError(response, error);
        }
    }

    /**
     * Replaces the requested document by ID and version.
     *
     * @param {Object} request - Represents request.
     * @param {Object} response - Represents response.
     * @param {Function} [next] - Represents the next middleware function in the application’s request-response cycle.
     * @param {Object} [hooks] - Represents hooks.
     * @typedef {{[required]: Array<string>, [optional]: Array<string>} | string} AllowedProperties
     * @typedef {{[]: string | PropertyDefinition} | Array<{[]: string | PropertyDefinition}>} PropertyDefinition
     * @param {{[headers]: AllowedProperties, [pathParameters]: AllowedProperties, [queryString]: AllowedProperties, [body]: PropertyDefinition}} [allowedPropertiesForRequestElements] - Represents allowed properties for request elements.
     * @return {Promise<void>}
     */
    async replaceOneByIdAndVersion (request, response, next = undefined, hooks = undefined, allowedPropertiesForRequestElements = undefined)
    {
        try
        {
            if (!Validator.isValidRouteFacingControllerMethodParameters(request, response, next, hooks, allowedPropertiesForRequestElements))
            {
                throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
            }

            hooks = utility.init(hooks, {});
            hooks.bearer = utility.init(hooks.bearer, {});

            let _id, version, fields;

            switch (this._apiType)
            {
                case Controller.API_TYPE.REST:
                {
                    CrudController._extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
                    const pathParameters = CrudController._extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters);
                    _id = pathParameters._id;
                    const queryString = CrudController._extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString);
                    version = queryString.version;
                    fields = CrudController._extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body);
                    break;
                }
                case Controller.API_TYPE.NON_REST:
                {
                    CrudController._extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
                    CrudController._extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
                    CrudController._extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString, false);
                    const body = CrudController._extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body);
                    _id = body._id;
                    version = body.version;
                    fields = body.fields;
                    break;
                }
            }

            utility.isExist(hooks.fields) ? await hooks.fields(fields) : undefined;

            let document;
            const {session} = SessionManager.generateSessionsForController(hooks);
            await SessionManager.exec(async () =>
                                      {
                                          utility.isExist(hooks.before) ? await hooks.before(_id, version, fields, session) : undefined;
                                          document = await this._controllerService.replaceOneByIdAndVersion(_id, version, fields, session, {bearer: hooks.bearer});
                                          utility.isExist(hooks.after) ? await hooks.after(document, session) : undefined;
                                      }, undefined, session);

            await this._sendResponse(request, response, 200, {document});
        }
        catch (error)
        {
            this._sendResponseWhenError(response, error);
        }
    }

    /**
     * Soft deletes the requested document by ID and version.
     *
     * @param {Object} request - Represents request.
     * @param {Object} response - Represents response.
     * @param {Function} [next] - Represents the next middleware function in the application’s request-response cycle.
     * @param {Object} [hooks] - Represents hooks.
     * @typedef {{[required]: Array<string>, [optional]: Array<string>} | string} AllowedProperties
     * @typedef {{[]: string | PropertyDefinition} | Array<{[]: string | PropertyDefinition}>} PropertyDefinition
     * @param {{[headers]: AllowedProperties, [pathParameters]: AllowedProperties, [queryString]: AllowedProperties, [body]: PropertyDefinition}} [allowedPropertiesForRequestElements] - Represents allowed properties for request elements.
     * @return {Promise<void>}
     */
    async softDeleteOneByIdAndVersion (request, response, next = undefined, hooks = undefined, allowedPropertiesForRequestElements = undefined)
    {
        try
        {
            if (!Validator.isValidRouteFacingControllerMethodParameters(request, response, next, hooks, allowedPropertiesForRequestElements))
            {
                throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
            }

            hooks = utility.init(hooks, {});
            hooks.bearer = utility.init(hooks.bearer, {});

            let _id, version;

            switch (this._apiType)
            {
                case Controller.API_TYPE.REST:
                {
                    CrudController._extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
                    const pathParameters = CrudController._extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters);
                    _id = pathParameters._id;
                    const queryString = CrudController._extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString);
                    version = queryString.version;
                    CrudController._extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body, false);
                    break;
                }
                case Controller.API_TYPE.NON_REST:
                {
                    CrudController._extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
                    CrudController._extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
                    CrudController._extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString, false);
                    const body = CrudController._extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body);
                    _id = body._id;
                    version = body.version;
                    break;
                }
            }

            let document;
            const {session} = SessionManager.generateSessionsForController(hooks);
            await SessionManager.exec(async () =>
                                      {
                                          utility.isExist(hooks.before) ? await hooks.before(_id, version, session) : undefined;
                                          document = await this._controllerService.softDeleteOneByIdAndVersion(_id, version, session, {bearer: hooks.bearer});
                                          utility.isExist(hooks.after) ? await hooks.after(document, session) : undefined;
                                      }, undefined, session);

            await this._sendResponse(request, response, 200, {document});
        }
        catch (error)
        {
            this._sendResponseWhenError(response, error);
        }
    }

    /**
     * Deletes the requested document by ID and version.
     *
     * @param {Object} request - Represents request.
     * @param {Object} response - Represents response.
     * @param {Function} [next] - Represents the next middleware function in the application’s request-response cycle.
     * @param {Object} [hooks] - Represents hooks.
     * @typedef {{[required]: Array<string>, [optional]: Array<string>} | string} AllowedProperties
     * @typedef {{[]: string | PropertyDefinition} | Array<{[]: string | PropertyDefinition}>} PropertyDefinition
     * @param {{[headers]: AllowedProperties, [pathParameters]: AllowedProperties, [queryString]: AllowedProperties, [body]: PropertyDefinition}} [allowedPropertiesForRequestElements] - Represents allowed properties for request elements.
     * @return {Promise<void>}
     */
    async deleteOneByIdAndVersion (request, response, next = undefined, hooks = undefined, allowedPropertiesForRequestElements = undefined)
    {
        try
        {
            if (!Validator.isValidRouteFacingControllerMethodParameters(request, response, next, hooks, allowedPropertiesForRequestElements))
            {
                throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
            }

            hooks = utility.init(hooks, {});
            hooks.bearer = utility.init(hooks.bearer, {});

            let _id, version;

            switch (this._apiType)
            {
                case Controller.API_TYPE.REST:
                {
                    CrudController._extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
                    const pathParameters = CrudController._extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters);
                    _id = pathParameters._id;
                    const queryString = CrudController._extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString);
                    version = queryString.version;
                    CrudController._extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body, false);
                    break;
                }
                case Controller.API_TYPE.NON_REST:
                {
                    const body = CrudController._extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body);
                    _id = body._id;
                    version = body.version;
                    break;
                }
            }

            let document;
            const {session} = SessionManager.generateSessionsForController(hooks);
            await SessionManager.exec(async () =>
                                      {
                                          utility.isExist(hooks.before) ? await hooks.before(_id, version, session) : undefined;
                                          document = await this._controllerService.deleteOneByIdAndVersion(_id, version, session, {bearer: hooks.bearer});
                                          utility.isExist(hooks.after) ? await hooks.after(document, session) : undefined;
                                      }, undefined, session);

            await this._sendResponse(request, response, 200, {document});
        }
        catch (error)
        {
            this._sendResponseWhenError(response, error);
        }
    }

    /**
     * Soft deletes the requested documents by ID and version.
     *
     * @param {Object} request - Represents request.
     * @param {Object} response - Represents response.
     * @param {Function} [next] - Represents the next middleware function in the application’s request-response cycle.
     * @param {Object} [hooks] - Represents hooks.
     * @typedef {{[required]: Array<string>, [optional]: Array<string>} | string} AllowedProperties
     * @typedef {{[]: string | PropertyDefinition} | Array<{[]: string | PropertyDefinition}>} PropertyDefinition
     * @param {{[headers]: AllowedProperties, [pathParameters]: AllowedProperties, [queryString]: AllowedProperties, [body]: PropertyDefinition}} [allowedPropertiesForRequestElements] - Represents allowed properties for request elements.
     * @return {Promise<void>}
     */
    async softDeleteManyByIdAndVersion (request, response, next = undefined, hooks = undefined, allowedPropertiesForRequestElements = undefined)
    {
        try
        {
            if (!Validator.isValidRouteFacingControllerMethodParameters(request, response, next, hooks, allowedPropertiesForRequestElements))
            {
                throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
            }

            hooks = utility.init(hooks, {});
            hooks.bearer = utility.init(hooks.bearer, {});

            let documents; // [{_id, version}]

            switch (this._apiType)
            {
                case Controller.API_TYPE.REST:
                {
                    // TODO
                    break;
                }
                case Controller.API_TYPE.NON_REST:
                {
                    CrudController._extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
                    CrudController._extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
                    CrudController._extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString, false);
                    const body = CrudController._extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body);
                    documents = body.documents;
                    break;
                }
            }

            let successfulDocuments;
            const {session} = SessionManager.generateSessionsForController(hooks);
            await SessionManager.exec(async () =>
                                      {
                                          utility.isExist(hooks.before) ? await hooks.before(documents, session) : undefined;
                                          successfulDocuments = await this._controllerService.softDeleteManyByIdAndVersion(documents, session, {bearer: hooks.bearer});
                                          utility.isExist(hooks.after) ? await hooks.after(documents, session) : undefined;
                                      }, undefined, session);

            await this._sendResponse(request, response, 200, {successfulDocuments});
        }
        catch (error)
        {
            this._sendResponseWhenError(response, error);
        }
    }
}

module.exports = CrudController;
