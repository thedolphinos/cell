/*
 * Code Review: ✓
 * Test Cases: ✗
 * Guidelines - Imports: ✓
 * Guidelines - Comments: ✗
 */

import {MongoClient, MongoClientOptions} from "mongodb";

import Logger from "../core/Logger";

class DbConnection
{
    public readonly mongoClient: MongoClient;

    constructor (uri: string, options?: MongoClientOptions)
    {
        // https://docs.mongodb.com/manual/reference/connection-string/
        // https://www.mongodb.com/docs/manual/reference/connection-string-options/
        this.mongoClient = new MongoClient(uri, options);
    }

    async connect (): Promise<void>
    {
        Logger.info(`Connecting to DB...`, 2);
        await this.mongoClient.connect();
        Logger.info(`Connected to DB!`, 1);
    }

    async disconnect (): Promise<void>
    {
        Logger.info("Disconnecting from the DB...", 2);
        await this.mongoClient.close();
        Logger.info("Disconnected from the DB!", 1);
    }
}

export default DbConnection;
