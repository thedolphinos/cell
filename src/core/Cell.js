const process = require("node:process");

const express = require("express");

const {
    StaticClassInstantiationError,
    DATA: ERROR_DATA_OF_ERROR4JS
} = require("@thedolphinos/error4js");
const {
    isExist,
    toUTCDateString
} = require("@thedolphinos/utility4js");

const Logger = require("./logger");
const ErrorSafe = require("../safes/ErrorSafe");
const DbConnectionSafe = require("../safes/DbConnectionSafe");
const Interceptor = require("./Interceptor");
const Server = require("./Server");
const DbConnection = require("../db/DbConnection");
const Validator = require("../helpers/Validator");
const ERROR_DATA_OF_CELL = require("../helpers/ERROR_DATA.json");

/**
 * TODO write
 */
class Cell
{
    constructor ()
    {
        throw new StaticClassInstantiationError("Cell");
    }

    /**
     * Initiates the framework.
     *
     * TODO review
     *
     * @public
     * @static
     *
     * @param {Object} [config] - Where you can manage servers, DBs, interceptors, and error.
     * @param {number} [config.log] TODO: also add to readme
     * @param {number} [config.log.level] TODO: also add to readme
     * @param {Object} [config.server] - Where you can manage servers. You don't have to define it, if you don't want the application to serve.
     * @param {boolean} config.server.isEnabled - Allows enabling/disabling both HTTP and HTTPS servers.
     * @param {Object} [config.server.options] - Container for HTTP and HTTPS servers. You don't have to define it, if `config.server.isEnabled` is false.
     * @param {Object} config.server.options.http - Container for HTTP server.
     * @param {boolean} config.server.options.http.isEnabled - Allows enabling/disabling HTTP server.
     * @param {Object} [config.server.options.http.config] - Container for HTTP server configurations. You don't have to define it, if `config.server.options.http.isEnabled` is false.
     * @param {number} config.server.options.http.config.port - Represents port number of HTTP server.
     * @param {Object} config.server.options.https - Container for HTTPS server.
     * @param {boolean} config.server.options.https.isEnabled - Allows enabling/disabling HTTPS server.
     * @param {Object} [config.server.options.https.config] - Container for HTTPS server configurations. You don't have to define it, if `config.server.options.https.isEnabled` is false.
     * @param {number} config.server.options.https.config.port - Represents port number of HTTPS server.
     * @param {Object} config.server.options.https.config.sslTlsCertificate - Container for SSL/TLS certificate.
     * @param {string} config.server.options.https.config.sslTlsCertificate.key - Represent the path of the private key of the SSL/TLS certificate.
     * @param {string} config.server.options.https.config.sslTlsCertificate.cert - Represent the path of the public key of the SSL/TLS certificate.
     * @param {string} config.server.options.https.config.sslTlsCertificate.ca - Represent the path of the certificate authority of the SSL/TLS certificate.
     * @param {Object} [config.db] - Where you can manage DBs. You don't have to define it, if you don't want to use a DB in the application.
     * @param {Object} config.db.connection - Container for DB connection.
     * @param {string} config.db.connection.uri - DB connection [URI](https://docs.mongodb.com/manual/reference/connection-string/).
     * @param {Object} [config.db.connection.options] - DB connection [options](https://docs.mongodb.com/manual/reference/connection-string/#connection-options). You don't have to define it.
     * @param {Object} [config.interceptors] - Where you can manage interceptors. You don't have to define it, if you don't want to use interceptors. However, if you want to build a complex application, they are where you build the application logic.
     * @param {Object} [config.interceptors.init] - Container for init interceptor which works after setting the errors to the error safe and before opening the DB connection. You don't have to define it.
     * @param {string} config.interceptors.init.path - Represent the path of init interceptor.
     * @param {Object} [config.interceptors.dbConnection] - Container for DB connection interceptor which works after opening the DB connection and before running the Express. You don't have to define it.
     * @param {string} config.interceptors.dbConnection.path - Represent the path of DB connection interceptor.
     * @param {Object} [config.interceptors.app] - Container for app interceptor which works after running the Express and before creating the server. You don't have to define it.
     * @param {string} config.interceptors.app.path - Represent the path of app interceptor.
     * @param {Object} [config.interceptors.final] - Container for final interceptor which works after creating the server. You don't have to define it.
     * @param {string} config.interceptors.final.path - Represent the path of final interceptor.
     * @param {Object} [config.errorData] - Where you can add a new error or override errors. You don't have to define it, if you don't want to add a new error or override errors.
     *                                   In overridden errors, since Cell uses [the module `DATA` of the package `@thedolphinos/error4js`](https://github.com/thedolphinos/error4js/blob/master/lib/DATA.json) and overrides it with [Cell module `ERROR_DATA`](https://github.com/thedolphinos/cell/blob/master/lib/helpers/ERROR_DATA.json), structure of error data must be identical of the form of `DATA` and `ERROR_DATA`. The first level keys (e.g. BASE, DEV_0, DOCUMENT_INVALID_VERSION, etc.) and the second level keys (code, message) must not be updated. To override, you should update the value of `code` which must be a string, and the value of `message` which must be an object where the keys must be the languages and the values must be a string.
     *                                   In newly added errors, you are free to choose any structure. However, if you are going to use [@thedolphinos/error4js](https://github.com/thedolphinos/error4js)'s error structure which you can observe in [`BaseError`](https://github.com/thedolphinos/error4js/blob/master/lib/core/BaseError.js), again structure of error data must be identical of the form of `DATA` and `ERROR_DATA`.
     * @return {Promise<void>}
     */
    static async init (config = undefined)
    {
        /* Stage 1: Init */
        Cell.#listenErrors();

        if (isExist(config))
        {
            Validator.validateParameterConfig(config);
        }

        Logger.setLevel(config?.log?.level || Infinity);
        Logger.info(`Running...`, 2);

        Cell.#setupErrorData(config.errorData);

        const initInterceptorPath = config?.interceptors?.init?.path;
        if (isExist(initInterceptorPath))
        {
            await Cell.interceptForInit(initInterceptorPath);
        }

        /* Stage 2: DB */
        // DB connection is established before the app starts since the app might use it.
        if (isExist(config?.db))
        {
            const dbConnection = await Cell.#initDbConnection(config.db.connection.uri, config.db.connection?.options);

            const dbConnectionInterceptorPath = config.interceptors?.dbConnection?.path;
            if (isExist(dbConnectionInterceptorPath))
            {
                await Cell.interceptForDbConnection(dbConnectionInterceptorPath, dbConnection);
            }
        }

        /* Stage 3: Server */
        if (config?.server.isEnabled)
        {
            const app = express();

            const appInterceptorPath = config?.interceptors?.app?.path;
            if (isExist(appInterceptorPath))
            {
                await Cell.interceptForApp(appInterceptorPath, app);
            }

            await Cell.#initServer(app, config.server.options);
        }

        /* Stage 4: Final */
        const finalInterceptorPath = config?.interceptors?.final?.path;
        if (isExist(finalInterceptorPath))
        {
            await Cell.interceptForFinal(finalInterceptorPath);
        }

        Logger.info(`Completed!`, 1);
    }

    /**
     * @private
     * @static
     *
     * @returns {void}
     */
    static #listenErrors ()
    {
        // https://nodejs.org/api/process.html#event-uncaughtexception
        process.on("uncaughtExceptionMonitor", (error, origin) =>
        {
            Logger.error(`uncaughtExceptionMonitor\n`, error);
        });

        // https://nodejs.org/api/process.html#event-unhandledrejection
        process.on("unhandledRejection", (reason, promise) =>
        {
            Logger.error(`Unhandled rejection occurred!`, reason);
        });
    }

    /**
     * @private
     * @static
     *
     * @param {Object} customErrorData
     * @returns {void}
     */
    static #setupErrorData (customErrorData)
    {
        const ERROR_DATA = {
            ...ERROR_DATA_OF_ERROR4JS,
            ...ERROR_DATA_OF_CELL,
            ...(isExist(customErrorData) ? customErrorData : {})
        };

        ErrorSafe.set(ERROR_DATA);
    }

    /**
     * @private
     * @static
     *
     * @param {string} [uri]
     * @param {Object} [options]
     * @returns {Promise<DbConnection>}
     */
    async static #initDbConnection (uri, options = undefined)
    {
        const dbConnection = new DbConnection(uri, options);
        await dbConnection.open();

        DbConnectionSafe.set(dbConnection);

        return dbConnection;
    }

    /**
     * @private
     * @static
     *
     * @param {Function} requestListener
     * @param {Object} options
     * @returns {Promise<void>}
     */
    async static #initServer (requestListener, options)
    {
        const server = new Server(requestListener, options);
        await server.create();
    }

    /**
     * @private
     * @static
     *
     * @param {string} initInterceptorPath
     * @returns {Promise<void>}
     */
    async static interceptForInit (initInterceptorPath)
    {
        Logger.info(`Running the init interceptor...`, 3);
        const initInterceptor = new Interceptor(initInterceptorPath);
        await initInterceptor.intercept();
    }

    /**
     * @private
     * @static
     *
     * @param {string} dbConnectionInterceptorPath
     * @param {DbConnection} dbConnection
     * @returns {Promise<void>}
     */
    async static interceptForDbConnection (dbConnectionInterceptorPath, dbConnection)
    {
        Logger.info(`Running the DB interceptor...`, 3);
        const dbConnectionInterceptor = new Interceptor(dbConnectionInterceptorPath);
        await dbConnectionInterceptor.intercept(dbConnection);
    }

    /**
     * @private
     * @static
     *
     * @param {string} appInterceptorPath
     * @param {Function} app
     * @returns {Promise<void>}
     */
    async static interceptForApp (appInterceptorPath, app)
    {
        Logger.info(`Running the app interceptor...`, 3);
        const appInterceptor = new Interceptor(appInterceptorPath);
        await appInterceptor.intercept(app);
    }

    /**
     * @private
     * @static
     *
     * @param {string} finalInterceptorPath
     * @returns {Promise<void>}
     */
    async static interceptForFinal (finalInterceptorPath)
    {
        Logger.info(`Running the final interceptor...`, 3);
        const finalInterceptor = new Interceptor(finalInterceptorPath);
        await finalInterceptor.intercept();
    }
}

module.exports = Cell;
