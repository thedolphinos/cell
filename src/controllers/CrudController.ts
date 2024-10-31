import {ClientSession, ObjectId, Document} from "mongodb";

import {isExist, isInitialized, init} from "@thedolphinos/utility4js";

import SessionManager from "../db/SessionManager";
import ControllerService from "../services/ControllerService";
import Controller from "../core/Controller";
import {AllowedPropertiesForRequestElements} from "../core/Router";

export interface SearchHooks
{
    bearer?: any;
    value?: (value: any) => Promise<void>;
    query?: (query: {[key: string]: string}) => Promise<void>;
    options?: (options: {[key: string]: string}) => Promise<void>;
    isSessionEnabled?: boolean;
    before?: (value: any, query: {[key: string]: string}, options: {[key: string]: string}, session?: ClientSession) => Promise<void>;
    after?: (documents: Array<Document>, count: number, session?: ClientSession) => Promise<void>;
}

export interface ReadHooks
{
    bearer?: any;
    query?: (query: {[key: string]: string}) => Promise<void>;
    options?: (options: {[key: string]: string}) => Promise<void>;
    isSessionEnabled?: boolean;
    before?: (query: {[key: string]: string}, options: {[key: string]: string}, session?: ClientSession) => Promise<void>;
    after?: (documents: Array<Document>, count: number, session?: ClientSession) => Promise<void>;
}

export interface ReadOneByIdHooks
{
    bearer?: any;
    isSessionEnabled?: boolean;
    before?: (_id: string | ObjectId, options: {[key: string]: string}, session?: ClientSession) => Promise<void>;
    after?: (document: Document | null, session?: ClientSession) => Promise<void>;
}

export interface CreateOneHooks
{
    bearer?: any;
    fields?: (fields: any) => Promise<void>;
    isSessionEnabled?: boolean;
    before?: (fields: any, session?: ClientSession) => Promise<void>;
    after?: (document: Document, session?: ClientSession) => Promise<void>;
}

export interface UpdateOneByIdAndVersionHooks
{
    bearer?: any;
    fields?: (fields: any) => Promise<void>;
    isSessionEnabled?: boolean;
    before?: (_id: string | ObjectId, version: string | number, fields: any, session?: ClientSession) => Promise<void>;
    after?: (document: Document | null, session?: ClientSession) => Promise<void>;
}

export interface SoftDeleteOneByIdAndVersionHooks
{
    bearer?: any;
    isSessionEnabled?: boolean;
    before?: (_id: string | ObjectId, version: string | number, session?: ClientSession) => Promise<void>;
    after?: (document: Document | null, session?: ClientSession) => Promise<void>;
}

export interface DeleteOneByIdAndVersionHooks
{
    bearer?: any;
    fields?: (fields: any) => Promise<void>;
    isSessionEnabled?: boolean;
    before?: (_id: string | ObjectId, version: string | number, session?: ClientSession) => Promise<void>;
    after?: (document: Document | null, session?: ClientSession) => Promise<void>;
}

export interface SoftDeleteManyByIdAndVersionHooks
{
    bearer?: any;
    isSessionEnabled?: boolean;
    before?: (documents: Array<{_id: string | ObjectId, version: string | number}>, session?: ClientSession) => Promise<void>;
    after?: (successfulDocuments: Array<Document>, session?: ClientSession) => Promise<void>;
}

class CrudController extends Controller
{
    public readonly apiType: string;
    protected readonly controllerService: ControllerService;

    constructor (apiType: string, controllerService: ControllerService)
    {
        super();

        this.apiType = apiType;
        this.controllerService = controllerService;
    }

    async search (request: any, response: any, next?: any, hooks: SearchHooks = {}, allowedPropertiesForRequestElements?: AllowedPropertiesForRequestElements, searchFields: Array<string> = []): Promise<void>
    {
        try
        {
            hooks.bearer = init(hooks.bearer, {});

            let value: any; // The value to be searched.
            let query: any; // The query that narrows down the search space.
            let options: any; // The options that will be used in DB are sort, skip, and limit.

            switch (this.apiType)
            {
                /* TODO
                case Controller.API_TYPE.REST:
                {
                    CrudController.extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
                    CrudController.extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
                    const queryString = CrudController.extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString, true);
                    value = queryString.value;
                    query = queryString.query;
                    CrudController.extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body, false);
                    break;
                } */
                case Controller.API_TYPE.NON_REST:
                {
                    CrudController.extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
                    CrudController.extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
                    CrudController.extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString, false);
                    const body = CrudController.extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body, true);

                    value = body.value;
                    query = body.query;
                    options = body.options;

                    break;
                }
            }

            isExist(hooks.value) ? await hooks.value(value) : undefined;
            isExist(hooks.query) ? await hooks.query(query) : undefined;
            isExist(hooks.options) ? await hooks.options(options) : undefined;

            let result: {documents: Array<Document>, count: number};
            const {session} = SessionManager.generateSessionForController(hooks.isSessionEnabled);
            await SessionManager.exec(
                async () =>
                {
                    isExist(hooks.before) ? await hooks.before(value, query, options, session) : undefined;
                    result = !isInitialized(value)
                             ? await this.controllerService.read({}, options, session, {bearer: hooks.bearer})
                             : await this.controllerService.search(value, query, searchFields, options, session, {bearer: hooks.bearer});
                    isExist(hooks.after) ? await hooks.after(result.documents, result.count, session) : undefined;
                },
                undefined,
                session
            );

            await this.sendResponse(request, response, 200, result);
        }
        catch (error)
        {
            this.sendResponseWhenError(response, error);
        }
    }

    async read (request: any, response: any, next?: any, hooks: ReadHooks = {}, allowedPropertiesForRequestElements?: AllowedPropertiesForRequestElements): Promise<void>
    {
        try
        {
            hooks.bearer = init(hooks.bearer, {});

            let query: any; // The query that narrows down the search space.
            let options: any; // The options that will be used in DB are sort, skip, and limit.

            switch (this.apiType)
            {
                /* TODO
                case Controller.API_TYPE.REST:
                {
                    CrudController.extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
                    CrudController.extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
                    const queryString = CrudController.extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString);
                    query = queryString.query;
                    CrudController.extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body, false);
                    break;
                } */
                case Controller.API_TYPE.NON_REST:
                {
                    CrudController.extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
                    CrudController.extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
                    CrudController.extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString, false);
                    const body = CrudController.extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body, true);

                    query = body.query;
                    options = body.options;

                    break;
                }
            }

            isExist(hooks.query) ? await hooks.query(query) : undefined;
            isExist(hooks.options) ? await hooks.options(options) : undefined;

            let result: {documents: Array<Document>, count: number};
            const {session} = SessionManager.generateSessionForController(hooks.isSessionEnabled);
            await SessionManager.exec(
                async () =>
                {
                    isExist(hooks.before) ? await hooks.before(query, options, session) : undefined;
                    result = await this.controllerService.read(query, options, session, {bearer: hooks.bearer});
                    isExist(hooks.after) ? await hooks.after(result.documents, result.count, session) : undefined;
                },
                undefined,
                session
            );

            await this.sendResponse(request, response, 200, result);
        }
        catch (error)
        {
            this.sendResponseWhenError(response, error);
        }
    }

    async readOneById (request: any, response: any, next?: any, hooks: ReadOneByIdHooks = {}, allowedPropertiesForRequestElements?: AllowedPropertiesForRequestElements): Promise<void>
    {
        try
        {
            hooks.bearer = init(hooks.bearer, {});

            let _id: string | ObjectId;

            switch (this.apiType)
            {
                /* TODO
                case Controller.API_TYPE.REST:
                {
                    CrudController.extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
                    const pathParameters = CrudController.extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters);
                    _id = pathParameters._id;
                    CrudController.extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString, false);
                    CrudController.extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body, false);
                    break;
                } */
                case Controller.API_TYPE.NON_REST:
                {
                    CrudController.extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
                    CrudController.extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
                    CrudController.extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString, false);
                    const body = CrudController.extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body, true);

                    _id = body._id;

                    break;
                }
            }

            let document: Document | null = null;
            const {session} = SessionManager.generateSessionForController(hooks.isSessionEnabled);
            await SessionManager.exec(
                async () =>
                {
                    isExist(hooks.before) ? await hooks.before(_id, session) : undefined;
                    document = await this.controllerService.readOneById(_id, session, {bearer: hooks.bearer});
                    isExist(hooks.after) ? await hooks.after(document, session) : undefined;
                },
                undefined,
                session
            );

            await this.sendResponse(request, response, 200, {document});
        }
        catch (error)
        {
            this.sendResponseWhenError(response, error);
        }
    }

    async createOne (request: any, response: any, next?: any, hooks: CreateOneHooks = {}, allowedPropertiesForRequestElements?: AllowedPropertiesForRequestElements): Promise<void>
    {
        try
        {
            hooks.bearer = init(hooks.bearer, {});

            let fields: any;

            switch (this.apiType)
            {
                /* TODO
                case Controller.API_TYPE.REST:
                {
                    CrudController.extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
                    CrudController.extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
                    CrudController.extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString, false);
                    fields = CrudController.extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body);
                    break;
                } */
                case Controller.API_TYPE.NON_REST:
                {
                    CrudController.extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
                    CrudController.extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
                    CrudController.extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString, false);
                    const body = CrudController.extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body, true);

                    fields = body.fields;

                    break;
                }
            }

            isExist(hooks.fields) ? await hooks.fields(fields) : undefined;

            let document: Document;
            const {session} = SessionManager.generateSessionForController(hooks.isSessionEnabled);
            await SessionManager.exec(
                async () =>
                {
                    isExist(hooks.before) ? await hooks.before(fields, session) : undefined;
                    document = await this.controllerService.createOne(fields, session, {bearer: hooks.bearer});
                    isExist(hooks.after) ? await hooks.after(document, session) : undefined;
                },
                undefined,
                session
            );

            await this.sendResponse(request, response, 201, {document});
        }
        catch (error)
        {
            this.sendResponseWhenError(response, error);
        }
    }

    async updateOneByIdAndVersion (request: any, response: any, next?: any, hooks: UpdateOneByIdAndVersionHooks = {}, allowedPropertiesForRequestElements?: AllowedPropertiesForRequestElements): Promise<void>
    {
        try
        {
            hooks.bearer = init(hooks.bearer, {});

            let _id: string | ObjectId;
            let version: string | number;
            let fields: any;

            switch (this.apiType)
            {
                /* TODO
                case Controller.API_TYPE.REST:
                {
                    CrudController.extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
                    const pathParameters = CrudController.extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters);
                    _id = pathParameters._id;
                    const queryString = CrudController.extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString);
                    version = queryString.version;
                    fields = CrudController.extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body, false);
                    break;
                } */
                case Controller.API_TYPE.NON_REST:
                {
                    CrudController.extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
                    CrudController.extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
                    CrudController.extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString, false);
                    const body = CrudController.extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body, true);

                    _id = body._id;
                    version = body.version;
                    fields = body.fields;

                    break;
                }
            }

            isExist(hooks.fields) ? await hooks.fields(fields) : undefined;

            let document: Document | null = null;
            const {session} = SessionManager.generateSessionForController(hooks.isSessionEnabled);
            await SessionManager.exec(
                async () =>
                {
                    isExist(hooks.before) ? await hooks.before(_id, version, fields, session) : undefined;
                    document = await this.controllerService.updateOneByIdAndVersion(_id, version, fields, session, {bearer: hooks.bearer});
                    isExist(hooks.after) ? await hooks.after(document, session) : undefined;
                },
                undefined,
                session
            );

            await this.sendResponse(request, response, 200, {document});
        }
        catch (error)
        {
            this.sendResponseWhenError(response, error);
        }
    }

    async softDeleteOneByIdAndVersion (request: any, response: any, next?: any, hooks: SoftDeleteOneByIdAndVersionHooks = {}, allowedPropertiesForRequestElements?: AllowedPropertiesForRequestElements): Promise<void>
    {
        try
        {
            hooks.bearer = init(hooks.bearer, {});

            let _id: string | ObjectId;
            let version: string | number;

            switch (this.apiType)
            {
                /* TODO
                case Controller.API_TYPE.REST:
                {
                    CrudController.extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
                    const pathParameters = CrudController.extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters);
                    _id = pathParameters._id;
                    const queryString = CrudController.extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString);
                    version = queryString.version;
                    CrudController.extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body, false);
                    break;
                } */
                case Controller.API_TYPE.NON_REST:
                {
                    CrudController.extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
                    CrudController.extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
                    CrudController.extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString, false);
                    const body = CrudController.extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body, true);

                    _id = body._id;
                    version = body.version;

                    break;
                }
            }

            let document: Document | null = null;
            const {session} = SessionManager.generateSessionForController(hooks.isSessionEnabled);
            await SessionManager.exec(
                async () =>
                {
                    isExist(hooks.before) ? await hooks.before(_id, version, session) : undefined;
                    document = await this.controllerService.softDeleteOneByIdAndVersion(_id, version, session, {bearer: hooks.bearer});
                    isExist(hooks.after) ? await hooks.after(document, session) : undefined;
                },
                undefined,
                session
            );

            await this.sendResponse(request, response, 200, {document});
        }
        catch (error)
        {
            this.sendResponseWhenError(response, error);
        }
    }

    async deleteOneByIdAndVersion (request: any, response: any, next?: any, hooks: DeleteOneByIdAndVersionHooks = {}, allowedPropertiesForRequestElements?: AllowedPropertiesForRequestElements): Promise<void>
    {
        try
        {
            hooks.bearer = init(hooks.bearer, {});

            let _id: string | ObjectId;
            let version: string | number;

            switch (this.apiType)
            {
                /* TODO
                case Controller.API_TYPE.REST:
                {
                    CrudController.extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
                    const pathParameters = CrudController.extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters);
                    _id = pathParameters._id;
                    const queryString = CrudController.extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString);
                    version = queryString.version;
                    CrudController.extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body, false);
                    break;
                } */
                case Controller.API_TYPE.NON_REST:
                {
                    CrudController.extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
                    CrudController.extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
                    CrudController.extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString, false);
                    const body = CrudController.extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body, true);

                    _id = body._id;
                    version = body.version;

                    break;
                }
            }

            let document: Document | null = null;
            const {session} = SessionManager.generateSessionForController(hooks.isSessionEnabled);
            await SessionManager.exec(
                async () =>
                {
                    isExist(hooks.before) ? await hooks.before(_id, version, session) : undefined;
                    document = await this.controllerService.deleteOneByIdAndVersion(_id, version, session, {bearer: hooks.bearer});
                    isExist(hooks.after) ? await hooks.after(document, session) : undefined;
                },
                undefined,
                session
            );

            await this.sendResponse(request, response, 200, {document});
        }
        catch (error)
        {
            this.sendResponseWhenError(response, error);
        }
    }

    async softDeleteManyByIdAndVersion (request: any, response: any, next?: any, hooks: SoftDeleteManyByIdAndVersionHooks = {}, allowedPropertiesForRequestElements?: AllowedPropertiesForRequestElements): Promise<void>
    {
        try
        {
            hooks.bearer = init(hooks.bearer, {});

            let documents: Array<{_id: string | ObjectId, version: string | number}>;

            switch (this.apiType)
            {
                /* TODO
                case Controller.API_TYPE.REST:
                {
                    // TODO
                    break;
                } */
                case Controller.API_TYPE.NON_REST:
                {
                    CrudController.extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
                    CrudController.extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
                    CrudController.extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString, false);
                    const body = CrudController.extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body, true);

                    documents = body.documents;

                    break;
                }
            }

            let successfulDocuments: Array<Document> = [];
            const {session} = SessionManager.generateSessionForController(hooks.isSessionEnabled);
            await SessionManager.exec(
                async () =>
                {
                    isExist(hooks.before) ? await hooks.before(documents, session) : undefined;
                    successfulDocuments = await this.controllerService.softDeleteManyByIdAndVersion(documents, session, {bearer: hooks.bearer});
                    isExist(hooks.after) ? await hooks.after(successfulDocuments, session) : undefined;
                },
                undefined,
                session
            );

            await this.sendResponse(request, response, 200, {successfulDocuments});
        }
        catch (error)
        {
            this.sendResponseWhenError(response, error);
        }
    }
}

export default CrudController;
