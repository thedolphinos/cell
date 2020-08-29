"use strict";

const {InvalidArgumentsError, HTTPError, BadRequestError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");
const bcrypt = require("bcrypt");

const DbConnectionSafe = require("../safes/DbConnectionSafe");
const ApplicationService = require("../services/ApplicationService");
const Controller = require("../core/Controller");

const DEFAULT_MAX_ALLOWED_INVALID_LOGIN_ATTEMPTS = 5;

/**
 * Contains generic methods for authentication.
 * Should be used as a super class.
 *
 * @since 0.9.0
 */
class AuthController extends Controller
{
  /**
   * Creates a authentication controller instance that supports operations for the specified service.
   *
   * @since 0.21.0
   * @param {ApplicationService} applicationService
   * @param {number} [maxAllowedInvalidLoginAttempts]
   */
  constructor (applicationService, maxAllowedInvalidLoginAttempts = DEFAULT_MAX_ALLOWED_INVALID_LOGIN_ATTEMPTS)
  {
    super();

    AuthController._validateConstructorParameters(applicationService, maxAllowedInvalidLoginAttempts);

    this._applicationService = applicationService;
    this._maxInvalidLoginAttempts = maxAllowedInvalidLoginAttempts;
  }

  /**
   * Registers an account.
   *
   * @since 0.22.0
   * @param {Object} request
   * @param {Object} response
   * @param {Function} next
   * @return {Promise<void>}
   */
  async register (request, response)
  {
    try
    {
      AuthController.validateControllerParameters(request, response);
      const body = AuthController.extractBody(request);
      const {statusCode, data} = await this.processRegister(body);
      AuthController.sendResponse(response, statusCode, data);
    }
    catch (error)
    {
      AuthController.sendResponseWhenError(response, error);
    }
  }

  /**
   * Contains the processes during the verify.
   * Must be overridden.
   *
   * @since 0.22.0
   * @param {Object} body
   * @param {string} [propertyNameOfUniqueIdentifier]
   * @param {string} [propertyNameOfPassword]
   * @return {Promise<{statusCode: number, data: Object}>}
   */
  async processRegister (body, propertyNameOfUniqueIdentifier = "username", propertyNameOfPassword = "password")
  {
    if (!_.isPlainObject(body) ||
        !_.isString(propertyNameOfUniqueIdentifier) ||
        !_.isString(propertyNameOfPassword))
    {
      throw new InvalidArgumentsError();
    }

    const uniqueIdentifier = body[propertyNameOfUniqueIdentifier];
    const password = body[propertyNameOfPassword];

    if (!_.isString(uniqueIdentifier) ||
        !_.isString(password))
    {
      throw new BadRequestError("Login credentials are missing.");
    }

    const session = DbConnectionSafe.get().mongoClient.startSession();
    let account;
    let httpError;

    try
    {
      await session.withTransaction(async () =>
                                    {
                                      const query = {};
                                      query[propertyNameOfUniqueIdentifier] = uniqueIdentifier;

                                      account = await this._applicationService.readOne(query, {session});

                                      // check if the account is exist.
                                      if (utility.isExist(account))
                                      {
                                        httpError = new HTTPError(403, "The account is already exist.");
                                        return;
                                      }

                                      const accountCandidate = {
                                        auth: {
                                          isBlocked: false,
                                          numberOfFailedLoginAttempts: 0
                                        }
                                      };
                                      accountCandidate[propertyNameOfUniqueIdentifier] = uniqueIdentifier;
                                      accountCandidate[propertyNameOfPassword] = await bcrypt.hash(password, await bcrypt.genSalt(10));

                                      account = await this._applicationService.createOne(accountCandidate, {session});
                                    }, this._applicationService.dbOperation.transactionOptions);
    }
    catch (error)
    {
      throw error;
    }
    finally
    {
      await session.endSession();
    }

    if (utility.isExist(httpError))
    {
      throw httpError;
    }

    return {
      statusCode: 204,
      data: {
        account
      }
    };
  }

  /**
   * Logins the account.
   *
   * @since 0.9.0
   * @param {Object} request
   * @param {Object} response
   * @return {Promise<void>}
   */
  async login (request, response)
  {
    try
    {
      AuthController.validateControllerParameters(request, response);
      const body = AuthController.extractBody(request);
      const {statusCode, data} = await this.processLogin(body);
      AuthController.sendResponse(response, statusCode, data);
    }
    catch (error)
    {
      AuthController.sendResponseWhenError(response, error);
    }
  }

  /**
   * Contains the processes during the login.
   * Must be overridden.
   *
   * @since 0.9.0
   * @param {Object} body
   * @param {string} [propertyNameOfUniqueIdentifier]
   * @param {string} [propertyNameOfPassword]
   * @return {Promise<{statusCode: number, data: Object}>}
   */
  async processLogin (body, propertyNameOfUniqueIdentifier = "username", propertyNameOfPassword = "password")
  {
    if (!_.isPlainObject(body) ||
        !_.isString(propertyNameOfUniqueIdentifier) ||
        !_.isString(propertyNameOfPassword))
    {
      throw new InvalidArgumentsError();
    }

    const uniqueIdentifier = body[propertyNameOfUniqueIdentifier];
    const password = body[propertyNameOfPassword];

    if (!_.isString(uniqueIdentifier) ||
        !_.isString(password))
    {
      throw new BadRequestError("Login credentials are missing.");
    }

    const session = DbConnectionSafe.get().mongoClient.startSession();
    let account;
    let httpError;

    try
    {
      await session.withTransaction(async () =>
                                    {
                                      const query = {};
                                      query[propertyNameOfUniqueIdentifier] = uniqueIdentifier;

                                      const document = await this._applicationService.readOne(query, {session});

                                      // check if the account is exist.
                                      if (!utility.isExist(document))
                                      {
                                        httpError = new HTTPError(401, "Invalid login credentials.");
                                        return;
                                      }

                                      // check if the account is blocked.
                                      if (document.auth.isBlocked)
                                      {
                                        httpError = new HTTPError(403, "Account was blocked.");
                                        return;
                                      }

                                      // check if the password is correct.
                                      const isPasswordCorrect = await bcrypt.compare(password, document.password);
                                      const newDocumentProperties = {auth: {}};

                                      if (!isPasswordCorrect)
                                      {
                                        newDocumentProperties.auth.numberOfFailedLoginAttempts = document.auth.numberOfFailedLoginAttempts + 1; // if the password is incorrect, the number of failed login attempts must be increased.
                                        newDocumentProperties.auth.lastFailedLoginAttempt = new Date(); // if the password is incorrect, the time of the attempt must be recorded.

                                        if (newDocumentProperties.auth.numberOfFailedLoginAttempts !== this._maxInvalidLoginAttempts)
                                        {
                                          httpError = new HTTPError(401, "Invalid login credentials.");
                                        }
                                        else
                                        {
                                          httpError = new HTTPError(403, "Account has been blocked.");
                                          newDocumentProperties.auth.isBlocked = true;
                                        }
                                      }
                                      else
                                      {
                                        newDocumentProperties.auth.numberOfFailedLoginAttempts = 0; // if the password is correct, the number of failed login attempts must be reset.
                                        newDocumentProperties.auth.lastSuccessfulLogin = new Date(); // if the password is correct, the time of the login must be recorded.
                                      }

                                      account = await this._applicationService.updateOneByIdAndVersion(document._id, document.version, newDocumentProperties, {session});
                                    }, this._applicationService.dbOperation.transactionOptions);
    }
    catch (error)
    {
      throw error;
    }
    finally
    {
      await session.endSession();
    }

    if (utility.isExist(httpError))
    {
      throw httpError;
    }

    return {
      statusCode: 204,
      data: {
        account
      }
    };
  }

  /**
   * Verifies the authentication request using the authorization header.
   *
   * @since 0.11.0
   * @param {Object} request
   * @param {Object} response
   * @param {Function} next
   * @return {Promise<void>}
   */
  async verify (request, response, next)
  {
    try
    {
      AuthController.validateControllerParameters(request, response, next);
      const headers = AuthController.extractHeaders(request);
      const {data} = await this.processVerify(headers);
      next(data);
    }
    catch (error)
    {
      AuthController.sendResponseWhenError(response, error);
    }
  }

  /**
   * Contains the processes during the verify.
   * Must be overridden.
   *
   * @since 0.11.0
   * @param {Object} headers
   * @return {Promise<{data: Object}>}
   */
  async processVerify (headers)
  {
  }

  /**
   * Validates the parameters for the constructor method.
   *
   * @since 0.21.0
   * @param {ApplicationService} applicationService
   * @param {number} [maxAllowedInvalidLoginAttempts]
   * @protected
   */
  static _validateConstructorParameters (applicationService, maxAllowedInvalidLoginAttempts)
  {
    if (!(applicationService instanceof ApplicationService) ||
        (utility.isExist(maxAllowedInvalidLoginAttempts) && !utility.isValidNumber(maxAllowedInvalidLoginAttempts)))
    {
      throw new InvalidArgumentsError();
    }
  }
}

module.exports = AuthController;
