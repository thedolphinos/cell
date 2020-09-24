"use strict";

const {InvalidArgumentsError, StaticClassInstantiationError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");

const DbConnectionSafe = require("../safes/DbConnectionSafe");

const DEFAULT_TRANSACTION_OPTIONS = {
  readPreference: "primary",
  readConcern: {level: "majority"},
  writeConcern: {w: "majority"}
};

/**
 * Manages the MongoDB sessions.
 * Must be used as a static class.
 */
class SessionManager
{
  /**
   * Static classes must not be instantiated.
   */
  constructor ()
  {
    throw new StaticClassInstantiationError("SessionManager");
  }

  /**
   * Generates sessions of any service, if external session is not present and session is enabled by the hooks.
   *
   * @param {ClientSession} externalSession
   * @param {Object} hooks
   * @param {boolean} isForced - Indicates if session creation is a must or not. If true, creates internal session, if the hooks is not disabling session.
   * @return {{session: ClientSession, internalSession: ClientSession}}
   */
  static generateSessionsForService (externalSession, hooks, isForced = false)
  {
    SessionManager._validateParamSession(externalSession);
    SessionManager._validateParamHooks(hooks);
    SessionManager._validateParamIsForced(isForced);

    let internalSession;

    if (!isForced)
    {
      if (!utility.isExist(externalSession) && hooks.isSessionEnabled)
      {
        internalSession = SessionManager.startSession();
      }
    }
    else
    {
      if (!utility.isExist(externalSession) &&
          (!(utility.isExist(hooks.isSessionEnabled) && !hooks.isSessionEnabled)))
      {
        internalSession = SessionManager.startSession();
      }
    }

    const session = externalSession || internalSession;

    return {session, internalSession};
  }

  /**
   * Generates sessions of any controller, if session is enabled by the hooks.
   *
   * @param {Object} hooks
   * @return {{session: ClientSession}}
   */
  static generateSessionsForController (hooks)
  {
    SessionManager._validateParamHooks(hooks);

    let session;

    if (hooks.isSessionEnabled)
    {
      session = SessionManager.startSession();
    }

    return {session};
  }

  /**
   * Starts a client session.
   *
   * @return {ClientSession}
   */
  static startSession ()
  {
    return DbConnectionSafe.get().mongoClient.startSession();
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
  static exec = async (func, externalSession, internalSession, transactionOptions = DEFAULT_TRANSACTION_OPTIONS) =>
  {
    SessionManager._validateParamSession(externalSession);
    SessionManager._validateParamSession(internalSession);

    // a session started previously, it must end there where it begun
    if (utility.isExist(externalSession))
    {
      await func();
    }
    else
    {
      // a session started here, it must end here
      if (utility.isExist(internalSession))
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
      // no session
      else
      {
        await func();
      }
    }
  };

  /* VALIDATE PARAMS */
  /**
   * Validates the specified session parameter.
   *
   * @param {Object} session
   * @private
   */
  static _validateParamSession (session)
  {
    if (utility.isExist(session) && !_.isObject(session))
    {
      throw new InvalidArgumentsError();
    }
  }

  /**
   * Validates the specified hooks parameter.
   *
   * @param {Object} hooks
   * @private
   */
  static _validateParamHooks (hooks)
  {
    if (!_.isPlainObject(hooks))
    {
      throw new InvalidArgumentsError();
    }
  }

  /**
   * Validates the specified hooks parameter.
   *
   * @param {boolean} isForced
   * @private
   */
  static _validateParamIsForced (isForced)
  {
    if (!_.isBoolean(isForced))
    {
      throw new InvalidArgumentsError();
    }
  }
}

module.exports = SessionManager;
