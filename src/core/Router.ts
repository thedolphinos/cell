import _ from "lodash";
import express, {RouterOptions, IRouter} from "express";

import {InvalidArgumentsError} from "@thedolphinos/error4js";
import {isExist, isInitialized, init} from "@thedolphinos/utility4js";

import Validator from "../helpers/Validator";
import ErrorSafe from "../safes/ErrorSafe";
import Controller from "./Controller";
import {ClientSession, Document, ObjectId} from "mongodb";
import CrudController from "../controllers/CrudController";

type AllowedProperties = {
    required?: Array<string>;
    optional?: Array<string>;
}

type PropertyDefinitionValue = "Boolean" | "Integer" | "Float" | "String" | "ObjectId" | "Date" | "Any"

type PropertyDefinition = {
    [key: string]: PropertyDefinition |
        PropertyDefinitionValue |
        Array<{[key: string]: PropertyDefinition}>
};

type AllowedPropertiesForRequestElements = {
    headers?: AllowedProperties;
    pathParameters?: AllowedProperties;
    queryString?: AllowedProperties;
    body?: PropertyDefinition;
}

type SearchHooks = {
    bearer?: any;
    value?: (value: any) => Promise<void>;
    query?: (query: {[key: string]: string}) => Promise<void>;
    options?: (options: {[key: string]: string}) => Promise<void>;
    isSessionEnabled?: boolean;
    before?: (value: any, query: {[key: string]: string}, options: {[key: string]: string}, session?: ClientSession) => Promise<void>;
    after?: (documents: Array<Document>, count: number, session?: ClientSession) => Promise<void>;
}

type ReadHooks = {
    bearer?: any;
    query?: (query: {[key: string]: string}) => Promise<void>;
    options?: (options: {[key: string]: string}) => Promise<void>;
    isSessionEnabled?: boolean;
    before?: (query: {[key: string]: string}, options: {[key: string]: string}, session?: ClientSession) => Promise<void>;
    after?: (documents: Array<Document>, count: number, session?: ClientSession) => Promise<void>;
}

type ReadOneByIdHooks = {
    bearer?: any;
    isSessionEnabled?: boolean;
    before?: (_id: string | ObjectId, options: {[key: string]: string}, session?: ClientSession) => Promise<void>;
    after?: (document: Document | null, session?: ClientSession) => Promise<void>;
}

type CreateOneHooks = {
    bearer?: any;
    fields?: (fields: any) => Promise<void>;
    isSessionEnabled?: boolean;
    before?: (fields: any, session?: ClientSession) => Promise<void>;
    after?: (document: Document, session?: ClientSession) => Promise<void>;
}

type UpdateOneByIdAndVersionHooks = {
    bearer?: any;
    fields?: (fields: any) => Promise<void>;
    isSessionEnabled?: boolean;
    before?: (_id: string | ObjectId, version: string | number, fields: any, session?: ClientSession) => Promise<void>;
    after?: (document: Document | null, session?: ClientSession) => Promise<void>;
}

type SoftDeleteOneByIdAndVersionHooks = {
    bearer?: any;
    isSessionEnabled?: boolean;
    before?: (_id: string | ObjectId, version: string | number, session?: ClientSession) => Promise<void>;
    after?: (document: Document | null, session?: ClientSession) => Promise<void>;
}

type DeleteOneByIdAndVersionHooks = {
    bearer?: any;
    fields?: (fields: any) => Promise<void>;
    isSessionEnabled?: boolean;
    before?: (_id: string | ObjectId, version: string | number, session?: ClientSession) => Promise<void>;
    after?: (document: Document | null, session?: ClientSession) => Promise<void>;
}

type SoftDeleteManyByIdAndVersionHooks = {
    bearer?: any;
    isSessionEnabled?: boolean;
    before?: (documents: Array<{_id: string | ObjectId, version: string | number}>, session?: ClientSession) => Promise<void>;
    after?: (successfulDocuments: Array<Document>, session?: ClientSession) => Promise<void>;
}

type RoutesDefinition = {
    SEARCH: {
        isEnabled: boolean,
        allowedPropertiesForRequestElements: AllowedPropertiesForRequestElements,
        hooks: SearchHooks,
        searchFields: Array<string>
    };
    READ: {
        isEnabled: boolean,
        allowedPropertiesForRequestElements: AllowedPropertiesForRequestElements,
        hooks: ReadHooks
    };
    READ_ONE_BY_ID: {
        isEnabled: boolean,
        allowedPropertiesForRequestElements: AllowedPropertiesForRequestElements,
        hooks: ReadHooks
    };
    CREATE_ONE: {
        isEnabled: boolean,
        allowedPropertiesForRequestElements: AllowedPropertiesForRequestElements,
        hooks: CreateOneHooks
    };
    UPDATE_ONE_BY_ID_AND_VERSION: {
        isEnabled: boolean,
        allowedPropertiesForRequestElements: AllowedPropertiesForRequestElements,
        hooks: UpdateOneByIdAndVersionHooks
    };
    SOFT_DELETE_ONE_BY_ID_AND_VERSION: {
        isEnabled: boolean,
        allowedPropertiesForRequestElements: AllowedPropertiesForRequestElements,
        hooks: SoftDeleteOneByIdAndVersionHooks
    };
    DELETE_ONE_BY_ID_AND_VERSION: {
        isEnabled: boolean,
        allowedPropertiesForRequestElements: AllowedPropertiesForRequestElements,
        hooks: DeleteOneByIdAndVersionHooks
    };
    SOFT_DELETE_MANY_BY_ID_AND_VERSION: {
        isEnabled: boolean,
        allowedPropertiesForRequestElements: AllowedPropertiesForRequestElements,
        hooks: SoftDeleteManyByIdAndVersionHooks
    };
}

class Router
{
    static ALLOWED_ROUTE_NAMES = [
        "SEARCH",
        "READ",
        "READ_ONE_BY_ID",
        "CREATE_ONE",
        "UPDATE_ONE_BY_ID_AND_VERSION",
        "SOFT_DELETE_ONE_BY_ID_AND_VERSION",
        "DELETE_ONE_BY_ID_AND_VERSION",
        "SOFT_DELETE_MANY_BY_ID_AND_VERSION"
    ];

    private static MAP_ROUTE_NAME_TO_CRUD_CONTROLLER_METHOD_NAME = {
        SEARCH: "search",
        READ: "read",
        READ_ONE_BY_ID: "readOneById",
        CREATE_ONE: "createOne",
        UPDATE_ONE_BY_ID_AND_VERSION: "updateOneByIdAndVersion",
        SOFT_DELETE_ONE_BY_ID_AND_VERSION: "softDeleteOneByIdAndVersion",
        DELETE_ONE_BY_ID_AND_VERSION: "deleteOneByIdAndVersion",
        SOFT_DELETE_MANY_BY_ID_AND_VERSION: "softDeleteManyByIdAndVersion"
    };

    /* TODO
    private static REST_MAP_ROUTE_NAME_TO_ROUTE_PATH = {
        SEARCH: "",
        READ: "",
        READ_ONE_BY_ID: "/:_id",
        CREATE_ONE: "",
        UPDATE_ONE_BY_ID_AND_VERSION: "/:_id",
        SOFT_DELETE_ONE_BY_ID_AND_VERSION: "/:_id",
        DELETE_ONE_BY_ID_AND_VERSION: "/:_id",
        SOFT_DELETE_MANY_BY_ID_AND_VERSION: ""
    }; */

    /* TODO
    private static REST_MAP_ROUTE_NAME_TO_HTTP_METHOD_NAME = {
        SEARCH: "get",
        READ: "get",
        READ_ONE_BY_ID: "get",
        CREATE_ONE: "post",
        UPDATE_ONE_BY_ID_AND_VERSION: "patch",
        SOFT_DELETE_ONE_BY_ID_AND_VERSION: "delete",
        DELETE_ONE_BY_ID_AND_VERSION: "delete",
        SOFT_DELETE_MANY_BY_ID_AND_VERSION: "delete"
    }; */

    private constructor () {}

    /**
     * https://expressjs.com/en/api.html#express.router
     */
    public static createRouter (options?: RouterOptions): IRouter
    {
        return express.Router({
                                  caseSensitive: true,
                                  mergeParams: true,
                                  strict: false
                              });
    }

    static generateRoutes (router: IRouter, routesDefinitions: RoutesDefinition, crudController: CrudController, verify?: {method: Function, allowedPropertiesForHeaders: AllowedProperties})
    {
        const apiType = crudController.apiType;

        /* TODO
        if (apiType === Controller.API_TYPE.REST)
        {
            // since both the routes `SEARCH` and `READ` use the same HTTP method and route paths, they cannot be used together.
            let sameMethodCount = 0;
            sameMethodCount += routesDefinitions.SEARCH?.isEnabled ? 1 : 0;
            sameMethodCount += routesDefinitions.READ?.isEnabled ? 1 : 0;

            if (sameMethodCount > 1)
            {
                throw new InvalidArgumentsError(ErrorSafe.getData().DEV_1);
            }

            // since both the routes `SOFT_DELETE_ONE_BY_ID_AND_VERSION`, `DELETE_ONE_BY_ID_AND_VERSION`, `SOFT_DELETE_MANY_BY_ID_AND_VERSION`, `DELETE_MANY_BY_ID_AND_VERSION` use the same HTTP method and route paths, they cannot be used together.
            sameMethodCount = 0;
            sameMethodCount += routesDefinitions.SOFT_DELETE_ONE_BY_ID_AND_VERSION?.isEnabled ? 1 : 0;
            sameMethodCount += routesDefinitions.DELETE_ONE_BY_ID_AND_VERSION?.isEnabled ? 1 : 0;
            sameMethodCount += routesDefinitions.SOFT_DELETE_MANY_BY_ID_AND_VERSION?.isEnabled ? 1 : 0;
            sameMethodCount += routesDefinitions.DELETE_MANY_BY_ID_AND_VERSION?.isEnabled ? 1 : 0;

            if (sameMethodCount > 1)
            {
                throw new InvalidArgumentsError(ErrorSafe.getData().DEV_1);
            }
        } */

        for (const routeName of Object.keys(routesDefinitions) as Array<keyof RoutesDefinition>)
        {
            const routeDefinition = routesDefinitions[routeName];

            if (routeDefinition.isEnabled)
            {
                const crudControllerMethodName: string = Router.MAP_ROUTE_NAME_TO_CRUD_CONTROLLER_METHOD_NAME[routeName];

                let routePath: string;
                let httpMethodName: "get" | "post" | "put" | "patch" | "delete";

                switch (apiType)
                {
                    /* TODO
                    case Controller.API_TYPE.REST:
                    {
                        routePath = Router.REST_MAP_ROUTE_NAME_TO_ROUTE_PATH[routeName];
                        httpMethodName = Router.REST_MAP_ROUTE_NAME_TO_HTTP_METHOD_NAME[routeName];
                        break;
                    } */
                    case Controller.API_TYPE.NON_REST:
                    {
                        routePath = `/${crudControllerMethodName}`;
                        httpMethodName = "post";
                        break;
                    }
                }

                if (isExist(verify?.method))
                {
                    router.route(routePath)[httpMethodName]((request, response, next) => verify.method(request, response, next, undefined, verify.allowedPropertiesForHeaders));
                }

                // @ts-ignore
                const crudControllerMethod: Function = crudController[crudControllerMethodName];

                router.route(routePath)[httpMethodName]((request, response, next) => crudControllerMethod(
                    request, response, next,
                    routeDefinition.hooks,
                    routeDefinition.allowedPropertiesForRequestElements,
                    // @ts-ignore
                    crudControllerMethodName === Router.MAP_ROUTE_NAME_TO_CRUD_CONTROLLER_METHOD_NAME.SEARCH ? routeDefinition.searchFields : null
                ));
            }
        }
    }
}

export default Router;
