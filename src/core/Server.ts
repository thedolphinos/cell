/*
 * Code Review: ✓
 * Test Cases: ✗
 * Guidelines - Imports: ✓
 * Guidelines - Comments: ✗
 */

import http from "node:http";
import https from "node:https";

import {Express} from "express";

import {isExist, toPromise} from "@thedolphinos/utility4js";

import Logger from "./Logger";

interface Config
{
    http?: HttpServerConfig,
    https?: HttpsServerConfig
}

interface HttpServerConfig
{
    isEnabled: boolean;
    port?: number;
}

interface HttpsServerConfig
{
    isEnabled: boolean;
    port?: number;
    sslTlsCertificate?: {
        key: string;
        cert: string;
        ca: string;
    };
}

class Server
{
    private readonly app: Express;
    private readonly config?: Config;

    private httpServer?: http.Server;
    private httpsServer?: https.Server;

    constructor (app: Express, config: Config)
    {
        this.app = app;
        this.config = config;
    }

    private onListening (): void
    {
        // @ts-ignore
        Logger.info(`Server is listening on port ${this.address().port}!`, 1); // TODO: binding?
    }

    private onClose (): void
    {
        Logger.info("Server is closed!", 1); // TODO: binding?
    }

    public async create (): Promise<void>
    {
        Logger.info(`Creating server(s)...`, 2);

        let isCreated = false;

        if (this.config?.http?.isEnabled)
        {
            this.httpServer = http.createServer(this.app);
            this.httpServer.on("listening", this.onListening);
            this.httpServer.on("close", this.onClose);

            if (!isExist(this.config.http.port))
            {
                throw new Error("HTTP port is not specified.");
            }

            this.httpServer.listen(this.config.http.port);

            Logger.info(`Created HTTP server!`, 1);
        }

        if (this.config?.https?.isEnabled)
        {
            if (!isExist(this.config.https.sslTlsCertificate))
            {
                throw new Error("SSL/TLS certificate is not specified.");
            }

            this.httpsServer = https.createServer(this.config.https.sslTlsCertificate, this.app); // TODO: is it working?
            this.httpsServer.on("listening", this.onListening);
            this.httpsServer.on("close", this.onClose);

            if (!isExist(this.config.https.port))
            {
                throw new Error("HTTPS port is not specified.");
            }

            this.httpsServer.listen(this.config.https.port);

            Logger.info(`Created HTTPS server!`, 1);
        }
    }

    // TODO: when will it run?
    public async close (): Promise<void>
    {
        Logger.info("Closing server(s)...", 2);

        const promises: Promise<void>[] = [];

        if (isExist(this.httpServer))
        {
            // @ts-ignore
            promises.push(toPromise(this.httpServer.close.bind(this.httpServer))());
        }

        if (isExist(this.httpsServer))
        {
            // @ts-ignore
            promises.push(toPromise(this.httpsServer.close.bind(this.httpsServer))());
        }

        await Promise.all(promises);

        Logger.info("Closed server(s)...", 1);
    }
}

export default Server;
