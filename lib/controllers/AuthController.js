"use strict";

const {
  InvalidArgumentsError,
  HTTPError,
  ClientError,
  BadRequestError
} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const DbConnectionSafe = require("../safes/DbConnectionSafe");
const ApplicationService = require("../services/ApplicationService");
const Controller = require("../core/Controller");

const DEFAULT_MAX_ALLOWED_INVALID_LOGIN_ATTEMPTS = 5;
const DEFAULT_TOKEN_LIFETIME = 43200;

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
   * @param {Object} options
   * @param {number} [options.maxAllowedInvalidLoginAttempts]
   * @param {number} [options.tokenLifetime]
   * @param {string} options.tokenSecret
   */
  constructor (applicationService, options)
  {
    super();

    AuthController._validateConstructorParameters(applicationService, options);

    this._applicationService = applicationService;
    this._maxInvalidLoginAttempts = options.maxAllowedInvalidLoginAttempts | DEFAULT_MAX_ALLOWED_INVALID_LOGIN_ATTEMPTS;
    this._tokenLifetime = options.maxAllowedInvalidLoginAttempts | DEFAULT_TOKEN_LIFETIME; // in seconds.
    this._tokenSecret = options.tokenSecret;
  }

  /**
   * Registers an account.
   *
   * @since 0.22.0
   * @param {Object} request
   * @param {Object} response
   * @return {Promise<void>}
   */
  async register (request, response)
  {
    try
    {
      AuthController.validateControllerParameters(request, response);
      const body = AuthController.extractBody(request);
      const {statusCode, data} = await this._processRegister(body);
      AuthController.sendResponse(response, statusCode, data.token);
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
   * @protected
   */
  async _processRegister (body, propertyNameOfUniqueIdentifier = "username", propertyNameOfPassword = "password")
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
    let data = {};
    let httpError;

    try
    {
      await session.withTransaction(async () =>
                                    {
                                      const query = {};
                                      query[propertyNameOfUniqueIdentifier] = uniqueIdentifier;

                                      const account = await this._applicationService.readOne(query, {session});

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

                                      data.account = await this._applicationService.createOne(accountCandidate, {session});
                                      data.token = await this._generateToken(data.account);
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
      statusCode: 200,
      data
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
      const {statusCode, data} = await this._processLogin(body);
      AuthController.sendResponse(response, statusCode, data.token);
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
   * @protected
   */
  async _processLogin (body, propertyNameOfUniqueIdentifier = "username", propertyNameOfPassword = "password")
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
    let data = {};
    let httpError;

    try
    {
      await session.withTransaction(async () =>
                                    {
                                      const query = {};
                                      query[propertyNameOfUniqueIdentifier] = uniqueIdentifier;

                                      const account = await this._applicationService.readOne(query, {session});

                                      // check if the account is exist.
                                      if (!utility.isExist(account))
                                      {
                                        httpError = new HTTPError(401, "Invalid login credentials.");
                                        return;
                                      }

                                      // check if the account is blocked.
                                      if (account.auth.isBlocked)
                                      {
                                        httpError = new HTTPError(403, "Account was blocked.");
                                        return;
                                      }

                                      // check if the password is correct.
                                      const isPasswordCorrect = await bcrypt.compare(password, account.password);
                                      const newDocumentProperties = {auth: {}};

                                      if (!isPasswordCorrect)
                                      {
                                        newDocumentProperties.auth.numberOfFailedLoginAttempts = account.auth.numberOfFailedLoginAttempts + 1; // if the password is incorrect, the number of failed login attempts must be increased.
                                        newDocumentProperties.auth.lastFailedLoginAttempt = new Date(); // if the password is incorrect, the time of the attempt must be recorded.

                                        if (newDocumentProperties.auth.numberOfFailedLoginAttempts < this._maxInvalidLoginAttempts) // if the max invalid login attempts is changed, for some accounts in database instant number of failed login attempts may be greater than the max invalid login attempts
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

                                      data.account = await this._applicationService.updateOneByIdAndVersion(account._id, account.version, newDocumentProperties, {session});
                                      data.token = await this._generateToken(data.account);
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
      statusCode: 200,
      data
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

      if (!utility.isExist(request.locals))
      {
        request.locals = {};
      }

      await this._processVerify(headers.authorization, request.locals);

      next();
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
   * @param {Object} authorizationHeader
   * @param {Object} locals - The reference to the request's locals.
   * @return {Promise<void>}
   * @protected
   */
  async _processVerify (authorizationHeader, locals)
  {
    if (!utility.isExist(authorizationHeader))
    {
      throw new BadRequestError("Authorization data is missing.");
    }

    if (!_.isPlainObject(locals))
    {
      throw new InvalidArgumentsError();
    }

    try
    {
      const decodedToken = this._decodeToken(authorizationHeader);
      this._hookTokenAfterDecoding(decodedToken, locals);
    }
    catch (error)
    {
      if (error.name === "TokenExpiredError")
      {
        throw new ClientError(403, "Token is expired.");
      }

      throw error;
    }
  }

  /**
   * Generates a token.
   *
   * @since 0.23.0
   * @param {Object} account
   * @return {Promise<string>} - Encoded token.
   * @private
   */
  async _generateToken (account)
  {
    if (!_.isPlainObject(account))
    {
      throw new InvalidArgumentsError();
    }

    account = await this._hookTokenWhileGenerating(account);

    return jwt.sign({data: account}, this._tokenSecret, {expiresIn: this._tokenLifetime});
  }

  /**
   * Decodes the token.
   *
   * @since 0.23.0
   * @param encodedToken
   * @return {*} - Decoded token.
   * @private
   */
  _decodeToken (encodedToken)
  {
    if (!_.isString(encodedToken))
    {
      throw new InvalidArgumentsError();
    }

    return jwt.verify(encodedToken, this._tokenSecret);
  }

  /**
   * Hooks to the method `_generateToken` in the method `_processRegister` and `_processLogin`.
   * Provides data manipulation while generating token.
   *
   * @since 0.23.0
   * @param {Object} account
   * @return {Promise<*>}
   * @protected
   */
  async _hookTokenWhileGenerating (account)
  {
    if (!_.isPlainObject(account))
    {
      throw new InvalidArgumentsError();
    }

    return account;
  }

  /**
   * Hooks to the method `_processVerify`.
   * Provides embedding the necessary parts of decoded token into request.
   *
   * @since 0.23.0
   * @param {Object} decodedToken
   * @param {Object} locals - The reference to the request's locals.
   * @protected
   */
  _hookTokenAfterDecoding (decodedToken, locals)
  {
    if (!_.isPlainObject(decodedToken) ||
        !_.isPlainObject(locals))
    {
      throw new InvalidArgumentsError();
    }

    locals.token = decodedToken.data;
  }

  /**
   * Validates the parameters for the constructor method.
   *
   * @since 0.21.0
   * @param {ApplicationService} applicationService
   * @param {Object} options
   * @param {number} [options.maxAllowedInvalidLoginAttempts]
   * @param {number} [options.tokenLifetime]
   * @param {string} options.tokenSecret
   * @protected
   */
  static _validateConstructorParameters (applicationService, options)
  {
    if (!(applicationService instanceof ApplicationService) ||
        !_.isPlainObject(options) ||
        (utility.isExist(options.maxAllowedInvalidLoginAttempts) && !utility.isValidNumber(options.maxAllowedInvalidLoginAttempts)) ||
        (utility.isExist(options.tokenLifetime) && !utility.isValidNumber(options.tokenLifetime) ||
        !_.isString(options.tokenSecret)))
    {
      throw new InvalidArgumentsError();
    }
  }
}

module.exports = AuthController;
