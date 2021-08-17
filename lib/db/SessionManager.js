const {
  InvalidArgumentsError,
  StaticClassInstantiationError
} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");

const _ = require("lodash");

const ErrorSafe = require("../safes/ErrorSafe");
const DbConnectionSafe = require("../safes/DbConnectionSafe");

/**
 * Manages the MongoDB sessions.
 * Must be used as a static Class.
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
    SessionManager._validateParameterSession(externalSession);
    SessionManager._validateParameterHooks(hooks);
    SessionManager._validateParameterIsForced(isForced);

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
    SessionManager._validateParameterHooks(hooks);

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
  static exec = async (func, externalSession, internalSession, transactionOptions = SessionManager.DEFAULT_TRANSACTION_OPTIONS) =>
  {
    SessionManager._validateParameterSession(externalSession);
    SessionManager._validateParameterSession(internalSession);

    // a session started previously, it must end there where it begun
    if (utility.isExist(externalSession))
    {
      await func();

      if (utility.isExist(internalSession))
      {
        await internalSession.endSession(); // since the internal session is useless
      }
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

  /* VARIABLES */
  static DEFAULT_TRANSACTION_OPTIONS = {
    readPreference: "primary",
    readConcern: {level: "majority"},
    writeConcern: {w: "majority"}
  };

  /* VALIDATE PARAMS */
  /**
   * Validates the specified session parameter.
   *
   * @param {Object} session
   * @private
   */
  static _validateParameterSession (session)
  {
    if (utility.isExist(session) && !_.isObject(session))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }
  }

  /**
   * Validates the specified hooks parameter.
   *
   * @param {Object} hooks
   * @private
   */
  static _validateParameterHooks (hooks)
  {
    if (!_.isPlainObject(hooks))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }
  }

  /**
   * Validates the specified hooks parameter.
   *
   * @param {boolean} isForced
   * @private
   */
  static _validateParameterIsForced (isForced)
  {
    if (!_.isBoolean(isForced))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }
  }
}

module.exports = SessionManager;
