/*
 * Code Review: ✓
 * Test Cases: ✗
 * Guidelines - Imports: ✓
 * Guidelines - Comments: ✗
 */

import process from "node:process";

import express, {Express} from "express";

import {isExist} from "@thedolphinos/utility4js";
import {StaticClassInstantiationError, DATA as ERROR_DATA_OF_ERROR4JS} from "@thedolphinos/error4js";

import Logger from "./Logger";
import Validator from "../helpers/Validator";
import Interceptor from "./Interceptor";
import ERROR_DATA_OF_CELL from "../helpers/ERROR_DATA.json";
import ErrorSafe from "../safes/ErrorSafe";
import DbConnectionSafe from "../safes/DbConnectionSafe";
import DbConnection from "../db/DbConnection";
import Server from "./Server";

interface Config
{
    log?: {
        isEnabled: boolean;
        level?: number;
    },
    db?: {
        isEnabled: boolean;
        connection?: {
            uri: string; // https://docs.mongodb.com/manual/reference/connection-string/
            options?: object; // https://www.mongodb.com/docs/manual/reference/connection-string-options/
        };
    };
    server: {
        isEnabled: boolean;
        http?: {
            isEnabled: boolean;
            port?: number;
        };
        https?: {
            isEnabled: boolean;
            port?: number;
            sslTlsCertificate?: {
                key: string;
                cert: string;
                ca: string;
            };
        };
    };
    interceptors?: {
        init?: {
            isEnabled: boolean;
            path?: string
        };
        dbConnection?: {
            isEnabled: boolean;
            path?: string
        };
        app?: {
            isEnabled: boolean;
            path?: string
        };
        final?: {
            isEnabled: boolean;
            path?: string
        };
    };
    errorData?: object;
}

// TODO: review when all finished
class Cell
{
    private constructor ()
    {
        throw new StaticClassInstantiationError("Cell");
    }

    static async run (config: Config): Promise<void>
    {
        /* Stage 1: Init */
        this.listenErrors();

        if (config?.log?.isEnabled)
        {
            Logger.enable(config?.log?.level || Infinity);
        }

        Logger.info(`Running...`, 2);

        this.setupErrorData(config?.errorData);

        if (config?.interceptors?.init?.isEnabled)
        {
            const path = config?.interceptors?.init?.path;
            Validator.validateFilePath(path);
            await Cell.interceptForInit(path);
        }

        /* Stage 2: DB */
        // DB connection is established before the app starts since the app might use it.
        if (config?.db?.isEnabled)
        {
            if (!isExist(config?.db?.connection?.uri))
            {
                throw new Error();
            }

            const dbConnection: DbConnection = await this.initDbConnection(config.db.connection.uri, config.db.connection?.options);

            if (config?.interceptors?.dbConnection?.isEnabled)
            {
                const path = config?.interceptors?.dbConnection?.path;
                Validator.validateFilePath(path);
                await Cell.interceptForDbConnection(path, dbConnection);
            }
        }

        /* Stage 3: Server */
        if (config.server?.isEnabled)
        {
            const app: Express = express();

            if (config?.interceptors?.app?.isEnabled)
            {
                const path = config?.interceptors?.app?.path;
                Validator.validateFilePath(path);
                await Cell.interceptForApp(path, app);
            }

            await this.initServer(app, {http: config.server.http, https: config.server.https});
        }

        /* Stage 4: Final */
        if (config?.interceptors?.final?.isEnabled)
        {
            const path = config?.interceptors?.final?.path;
            Validator.validateFilePath(path);
            await Cell.interceptForFinal(path);
        }

        Logger.info(`Completed!`, 1);
    }

    /* Stage 1: Init */
    private static listenErrors (): void
    {
        // https://nodejs.org/api/process.html#event-uncaughtexception
        process.on("uncaughtExceptionMonitor", (error, origin) =>
        {
            Logger.error(`Uncaught Exception\nerror:${error}\norigin:${origin}`, 0);
        });

        // https://nodejs.org/api/process.html#event-unhandledrejection
        process.on("unhandledRejection", (reason, promise) =>
        {
            Logger.error(`Unhandled Rejection\nreason${reason}\npromise:${promise}`, 0);
        });
    }

    private static setupErrorData (customErrorData?: object): void
    {
        const ERROR_DATA = {
            ...ERROR_DATA_OF_ERROR4JS,
            ...ERROR_DATA_OF_CELL,
            ...(isExist(customErrorData) ? customErrorData : {})
        };

        ErrorSafe.setData(ERROR_DATA);
    }

    public static async interceptForInit (initInterceptorPath: string): Promise<void>
    {
        Logger.info(`Running the init interceptor...`, 3);
        const initInterceptor = new Interceptor(initInterceptorPath);
        await initInterceptor.intercept();
    }

    /* Stage 2: DB */
    private static async initDbConnection (uri: string, options?: object): Promise<DbConnection>
    {
        const dbConnection = new DbConnection(uri, options);
        await dbConnection.connect();

        DbConnectionSafe.setData(dbConnection);

        return dbConnection;
    }

    public static async interceptForDbConnection (dbConnectionInterceptorPath: string, dbConnection: DbConnection): Promise<void>
    {
        Logger.info(`Running the DB interceptor...`, 3);
        const dbConnectionInterceptor = new Interceptor(dbConnectionInterceptorPath);
        await dbConnectionInterceptor.intercept(dbConnection);
    }

    /* Stage 3: Server */
    private static async initServer (requestListener: express.Express, options: any): Promise<void>
    {
        const server = new Server(requestListener, options);
        await server.create();
    }

    public static async interceptForApp (appInterceptorPath: string, app: express.Express): Promise<void>
    {
        Logger.info(`Running the app interceptor...`, 3);
        const appInterceptor = new Interceptor(appInterceptorPath);
        await appInterceptor.intercept(app);
    }

    /* Stage 4: Final */
    public static async interceptForFinal (finalInterceptorPath: string): Promise<void>
    {
        Logger.info(`Running the final interceptor...`, 3);
        const finalInterceptor = new Interceptor(finalInterceptorPath);
        await finalInterceptor.intercept();
    }
}

export default Cell;
