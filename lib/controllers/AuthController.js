"use strict";

const {
  InvalidArgumentsError,
  BadRequestError,
  ForbiddenError,
  InvalidCredentialsError,
  InvalidTokenError,
  AccountBlockedError,
  TokenExpiredError
} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const SessionManager = require("../db/SessionManager");
const ApplicationService = require("../services/ApplicationService");
const Controller = require("../core/Controller");

const DEFAULT_MAX_ALLOWED_INVALID_LOGIN_ATTEMPTS = 5;
const DEFAULT_TOKEN_LIFETIME = 43200;

/**
 * Contains generic methods for authentication.
 * Should be used as a super class.
 */
class AuthController extends Controller
{
  /**
   * Creates a authentication controller instance that supports operations for the specified service.
   *
   * @param {ApplicationService} applicationService
   * @param {Object} options
   * @param {number} [options.maxAllowedInvalidLoginAttempts]
   * @param {number} [options.tokenLifetime]
   * @param {string} options.tokenSecret
   * @param {string} options.tokenSecret
   * @param {string} options.propertyNameOfUniqueIdentifier
   * @param {string} options.propertyNameOfPassword
   */
  constructor (applicationService, options)
  {
    super();

    this._validateConstructorParams(...arguments);

    this._applicationService = applicationService;
    this._maxInvalidLoginAttempts = options.maxAllowedInvalidLoginAttempts || DEFAULT_MAX_ALLOWED_INVALID_LOGIN_ATTEMPTS;
    this._tokenLifetime = options.maxAllowedInvalidLoginAttempts || DEFAULT_TOKEN_LIFETIME; // in seconds.
    this._tokenSecret = options.tokenSecret;
    this._propertyNameOfUniqueIdentifier = options.propertyNameOfUniqueIdentifier;
    this._propertyNameOfPassword = options.propertyNameOfPassword;
  }

  /**
   * Registers an account.
   *
   * @param {Object} request
   * @param {Object} response
   * @param {Function} [next]
   * @param {Object} [hooks]
   * @return {Promise<void>}
   */
  async register (request, response, next = null, hooks = {})
  {
    try
    {
      this._validateControllerParams(request, response, next);

      let body = this._extractBody(request);

      utility.isExist(hooks.body) ? body = await hooks.body(body) : body;

      const uniqueIdentifier = body[this._propertyNameOfUniqueIdentifier];
      const password = body[this._propertyNameOfPassword];

      if (!_.isString(uniqueIdentifier) ||
          !_.isString(password))
      {
        throw new BadRequestError("Login credentials are missing.");
      }

      const query = {};
      query[this._propertyNameOfUniqueIdentifier] = uniqueIdentifier;

      let data = {};
      const session = SessionManager.startSession();
      await SessionManager.exec(async () =>
                                {
                                  let account = await this._applicationService.readOne(query, session);

                                  // check if the account is exist.
                                  if (utility.isExist(account))
                                  {
                                    throw new ForbiddenError("The account is already exist.");
                                  }

                                  const accountCandidate = {
                                    auth: {
                                      isBlocked: false,
                                      numberOfFailedLoginAttempts: 0
                                    }
                                  };
                                  accountCandidate[this._propertyNameOfUniqueIdentifier] = uniqueIdentifier;
                                  accountCandidate[this._propertyNameOfPassword] = await bcrypt.hash(password, await bcrypt.genSalt(10));

                                  utility.isExist(hooks.before) ? await hooks.before(body, accountCandidate, session) : null;
                                  account = await this._applicationService.createOne(accountCandidate, session);
                                  utility.isExist(hooks.after) ? await hooks.after(account, session) : null;

                                  const payload = utility.isExist(hooks.payload) ? await hooks.payload(account, session) : {_id: account._id};
                                  const token = this._generateToken(payload);

                                  data = utility.isExist(hooks.data) ? await hooks.data(data) : {
                                    token,
                                    account
                                  };
                                }, null, session);

      await this._sendResponse(request, response, 200, data);
    }
    catch (error)
    {
      this._sendResponseWhenError(response, error);
    }
  }

  /**
   * Logins the account.
   *
   * @param {Object} request
   * @param {Object} response
   * @param {Function} [next]
   * @param {Object} [hooks]
   * @return {Promise<void>}
   */
  async login (request, response, next = null, hooks = {})
  {
    try
    {
      this._validateControllerParams(request, response, next);

      let body = this._extractBody(request);

      utility.isExist(hooks.body) ? body = await hooks.body(body, session) : body;

      const uniqueIdentifier = body[this._propertyNameOfUniqueIdentifier];
      const password = body[this._propertyNameOfPassword];

      if (!_.isString(uniqueIdentifier) ||
          !_.isString(password))
      {
        throw new BadRequestError("Login credentials are missing.");
      }

      const query = {};
      query[this._propertyNameOfUniqueIdentifier] = uniqueIdentifier;

      let data = {};
      let error;
      const session = SessionManager.startSession();
      await SessionManager.exec(async () =>
                                {
                                  let account = await this._applicationService.readOne(query, session);

                                  // check if the account is exist.
                                  if (!utility.isExist(account))
                                  {
                                    throw new InvalidCredentialsError();
                                  }

                                  // check if the password is correct.
                                  const isPasswordCorrect = await bcrypt.compare(password, account.password);
                                  const newAccountProperties = {auth: {}};

                                  if (!isPasswordCorrect)
                                  {
                                    error = new InvalidCredentialsError(); // not thrown to increase the number of failed login attempts or block account.

                                    newAccountProperties.auth.numberOfFailedLoginAttempts = account.auth.numberOfFailedLoginAttempts + 1; // if the password is incorrect, the number of failed login attempts must be increased.
                                    newAccountProperties.auth.lastFailedLoginAttempt = new Date(); // if the password is incorrect, the time of the attempt must be recorded.

                                    if (newAccountProperties.auth.numberOfFailedLoginAttempts >= this._maxInvalidLoginAttempts) // if the max invalid login attempts is changed, for some accounts in database instant number of failed login attempts may be greater than the max invalid login attempts
                                    {
                                      newAccountProperties.auth.isBlocked = true;
                                    }
                                  }
                                  else
                                  {
                                    // check if the account is blocked.
                                    if (account.auth.isBlocked)
                                    {
                                      throw new AccountBlockedError("was");
                                    }

                                    newAccountProperties.auth.numberOfFailedLoginAttempts = 0; // if the password is correct, the number of failed login attempts must be reset.
                                    newAccountProperties.auth.lastSuccessfulLogin = new Date(); // if the password is correct, the time of the login must be recorded.
                                  }

                                  account = await this._applicationService.updateOneByIdAndVersion(account._id, account.version, newAccountProperties, session);

                                  const payload = utility.isExist(hooks.payload) ? await hooks.payload(account, session) : {_id: account._id};
                                  const token = this._generateToken(payload);

                                  data = utility.isExist(hooks.data) ? await hooks.data(data) : {
                                    token,
                                    account
                                  };
                                }, null, session);

      if (utility.isExist(error))
      {
        throw error;
      }

      await this._sendResponse(request, response, 200, data);
    }
    catch (error)
    {
      this._sendResponseWhenError(response, error);
    }
  }

  /**
   * Verifies the authentication request using the authorization header.
   *
   * @param {Object} request
   * @param {Object} response
   * @param {Function} next
   * @param {Object} [hooks]
   * @return {Promise<void>}
   */
  async verify (request, response, next, hooks = {})
  {
    try
    {
      this._validateControllerParams(request, response, next);

      const headers = this._extractHeaders(request, ["Authorization"]);

      if (!utility.isExist(request.locals))
      {
        request.locals = {};
      }

      if (!utility.isExist(headers.authorization))
      {
        throw new BadRequestError("Authorization data is missing.");
      }

      let decodedToken;

      try
      {
        decodedToken = this._decodeToken(headers.authorization);
      }
      catch (error)
      {
        if (error.name === "JsonWebTokenError")
        {
          throw new InvalidTokenError();
        }
        else if (error.name === "TokenExpiredError")
        {
          throw new TokenExpiredError();
        }

        throw error;
      }

      const account = await this._applicationService.readOneById(decodedToken.data._id);

      // check if the account is exist.
      if (!utility.isExist(account))
      {
        throw new ForbiddenError();
      }

      // check if the account is blocked.
      if (account.auth.isBlocked)
      {
        throw new ForbiddenError();
      }

      request.locals.oldToken = decodedToken.data;
      const payload = utility.isExist(hooks.payload) ? await hooks.payload(account) : {_id: account._id};
      request.locals.newToken = this._generateToken(payload);

      next();
    }
    catch (error)
    {
      this._sendResponseWhenError(response, error);
    }
  }

  /**
   * Generates a token.
   *
   * @param {Object} data
   * @return {string} - Encoded token.
   * @private
   */
  _generateToken (data)
  {
    if (!_.isPlainObject(data))
    {
      throw new InvalidArgumentsError();
    }

    return jwt.sign({data}, this._tokenSecret, {expiresIn: this._tokenLifetime});
  }

  /**
   * Decodes the token.
   *
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

  /* VALIDATE PARAMS */
  /**
   * Validates the parameters for the constructor method.
   *
   * @param {ApplicationService} applicationService
   * @param {Object} options
   * @param {number} [options.maxAllowedInvalidLoginAttempts]
   * @param {number} [options.tokenLifetime]
   * @param {string} options.tokenSecret
   * @param {string} options.propertyNameOfUniqueIdentifier
   * @param {string} options.propertyNameOfPassword
   * @protected
   */
  _validateConstructorParams (applicationService, options)
  {
    if (!(applicationService instanceof ApplicationService) ||
        !_.isPlainObject(options) ||
        (utility.isExist(options.maxAllowedInvalidLoginAttempts) && !utility.isValidNumber(options.maxAllowedInvalidLoginAttempts)) ||
        (utility.isExist(options.tokenLifetime) && !utility.isValidNumber(options.tokenLifetime)) ||
        !_.isString(options.tokenSecret) ||
        !_.isString(options.propertyNameOfUniqueIdentifier) ||
        !_.isString(options.propertyNameOfPassword))
    {
      throw new InvalidArgumentsError();
    }
  }
}

module.exports = AuthController;
