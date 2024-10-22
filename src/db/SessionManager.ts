/*
 * Code Review: ✗
 * Test Cases: ✗
 * Guidelines - Imports: ✓
 * Guidelines - Comments: ✗
 */

import {ClientSession} from "mongodb";

import {isExist} from "@thedolphinos/utility4js";

import DbConnectionSafe from "../safes/DbConnectionSafe";

// TODO: completely review this class and its usage

class SessionManager
{
    static DEFAULT_TRANSACTION_OPTIONS = {
        readPreference: "primary",
        readConcern: {level: "majority"},
        writeConcern: {w: "majority"}
    };

    private constructor () {}

    /**
     * Generates sessions of any service, if external session is not present and session is enabled by the hooks.
     */
    static generateSession (externalSession?: ClientSession, isEnabledByHook?: boolean, isForced: boolean = false): {session?: ClientSession, internalSession?: ClientSession}
    {
        let internalSession;

        if (!isForced)
        {
            if (!isExist(externalSession) && isEnabledByHook)
            {
                internalSession = SessionManager.startSession();
            }
        }
        else
        {
            if (!isExist(externalSession) &&
                (!(isExist(isEnabledByHook) && !isEnabledByHook)))
            {
                internalSession = SessionManager.startSession();
            }
        }

        const session = externalSession || internalSession;

        return {session, internalSession};
    }

    /**
     * Generates sessions of any controller, if session is enabled by the hooks.
     */
    static generateSessionForController (isEnabledByHook?: boolean)
    {
        let session;

        if (isEnabledByHook)
        {
            session = SessionManager.startSession();
        }

        return {session};
    }

    /**
     * Starts a client session.
     */
    static startSession ()
    {
        return DbConnectionSafe.getData().mongoClient.startSession();
    }

    /**
     * Executes the specified async function properly according to the session and the hook's session.
     *
     * @param {Function} func - The async function to be executed.
     * @param {ClientSession} externalSession
     * @param {ClientSession} internalSession
     * @param {Object} [transactionOptions]
     * @return {Promise<void>}
     */
    static exec = async (func: any, externalSession?: ClientSession, internalSession?: ClientSession, transactionOptions: any = SessionManager.DEFAULT_TRANSACTION_OPTIONS): Promise<void> =>
    {
        // A session started previously, it must end there where it has begun.
        if (isExist(externalSession))
        {
            await func();

            if (isExist(internalSession))
            {
                await internalSession.endSession(); // Since the internal session is useless.
            }
        }
        else
        {
            // A session started here, it must end here.
            if (isExist(internalSession))
            {
                try
                {
                    await internalSession.withTransaction(func, transactionOptions);
                }
                catch (error)
                {
                    throw error;
                }
                finally
                {
                    await internalSession.endSession();
                }
            }
            // No session.
            else
            {
                await func();
            }
        }
    };
}

export default SessionManager;
