const crypto = require("crypto");

const {
  InvalidArgumentsError,
  BadRequestError,
  UnauthorizedError,
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

const ErrorSafe = require("../safes/ErrorSafe");
const SessionManager = require("../db/SessionManager");
const Controller = require("../core/Controller");
const Validator = require("../helpers/Validator");

/**
 * A controller which is responsible from authorization and authentication operations.
 * It can be used as a base class for the authorization and authentication controllers of your application.
 */
class AuthController extends Controller
{
  /**
   * Represents default value for token life time in seconds.
   *
   * @type {number}
   * @private
   */
  static _DEFAULT_TOKEN_LIFETIME = 43200; // 12 hours.

  /**
   * Represents default value for maximum allowed invalid login attempts.
   *
   * @type {number}
   * @private
   */
  static _DEFAULT_MAX_ALLOWED_INVALID_LOGIN_ATTEMPTS = 5;

  /**
   * Represents default value for maximum change password attempts.
   *
   * @type {number}
   * @private
   */
  static _DEFAULT_MAX_ALLOWED_CHANGE_PASSWORD_ATTEMPTS = 5;

  /**
   * Represents default value for is activation enabled.
   *
   * @type {boolean}
   * @private
   */
  static _DEFAULT_IS_ACTIVATION_ENABLED = false;

  /**
   * Represents default encryption algorithm.
   *
   * @type {string}
   * @private
   */
  static _DEFAULT_ENCRYPTION_ALGORITHM = "aes-256-cbc";

  /**
   * Represents application service to be used for authorization and authentication operations.
   *
   * @type {ApplicationService}
   * @private
   */
  _applicationService;

  /**
   * @returns {ApplicationService}
   */
  get applicationService ()
  {
    return this._applicationService;
  }

  /**
   * The property name of unique identifier of an account such as username or e-mail. It must be also presented in the schema of the application service.
   *
   * @type {string}
   * @private
   */
  _propertyNameOfUniqueIdentifier;

  /**
   * The property name of password of an account. It must be also presented in the schema of the application service.
   *
   * @type {string}
   * @private
   */
  _propertyNameOfPassword;

  /**
   * Private key to be used for encryption.
   *
   * @type {string}
   * @private
   */
  _privateKeyForEncryption;

  /**
   * Init vector to be used for encryption.
   *
   * @type {string}
   * @private
   */
  _initVectorForEncryption;

  /**
   * Private key to be used to sign token.
   *
   * @type {string}
   * @private
   */
  _privateKeyToSign;

  /**
   * The lifetime of a token in seconds.
   *
   * @type {number}
   * @private
   */
  _tokenLifetime;

  /**
   * The maximum allowed invalid login attempts of an account.
   *
   * @type {number}
   * @private
   */
  _maxAllowedInvalidLoginAttempts;

  /**
   * The maximum allowed change password attempts of an account.
   *
   * @type {number}
   * @private
   */
  _maxAllowedInvalidChangePasswordAttempts;

  /**
   * Represents account activation. This can be used to lock account if the e-mail or phone number is not validated.
   *
   * @type {boolean}
   * @private
   */
  _isActivationEnabled;

  /**
   * @param {ApplicationService} applicationService - The application service to be used for authorization and authentication operations.
   * @param {Object} [options] - Options for authorization and authentication.
   * @param {string} options.propertyNameOfUniqueIdentifier - The property name of unique identifier of an account such as username or e-mail. It must be also presented in the schema of the application service.
   * @param {string} options.propertyNameOfPassword - The property name of password of an account. It must be also presented in the schema of the application service.
   * @param {string} options.privateKeyForEncryption - Private key to be used to encrypt/decrypt sensitive data.
   * @param {string} options.initVectorForEncryption - Init vector to be used for encryption.
   * @param {string} options.privateKeyToSign - Private key to be used to sign token.
   * @param {number} [options.tokenLifetime] - The lifetime of a token in seconds.
   * @param {number} [options.maxAllowedInvalidLoginAttempts] - The maximum allowed invalid login attempts of an account.
   * @param {number} [options.maxAllowedInvalidChangePasswordAttempts] - The maximum allowed change password attempts of an account.
   * @param {boolean} [options.isActivationEnabled] - Enables account activation. This can be used to lock account if the e-mail or phone number is not validated.
   */
  constructor (applicationService, options = undefined)
  {
    if (!Validator.isValidParameterApplicationService(applicationService) ||
        !_.isPlainObject(options))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    options.tokenLifetime = utility.init(options.tokenLifetime, AuthController._DEFAULT_TOKEN_LIFETIME);
    options.maxAllowedInvalidLoginAttempts = utility.init(options.maxAllowedInvalidLoginAttempts, AuthController._DEFAULT_MAX_ALLOWED_INVALID_LOGIN_ATTEMPTS);
    options.maxAllowedInvalidChangePasswordAttempts = utility.init(options.maxAllowedInvalidChangePasswordAttempts, AuthController._DEFAULT_MAX_ALLOWED_CHANGE_PASSWORD_ATTEMPTS);
    options.isActivationEnabled = utility.init(options.isActivationEnabled, AuthController._DEFAULT_IS_ACTIVATION_ENABLED);

    const {
      propertyNameOfUniqueIdentifier,
      propertyNameOfPassword,
      privateKeyForEncryption,
      initVectorForEncryption,
      privateKeyToSign,
      tokenLifetime,
      maxAllowedInvalidLoginAttempts,
      maxAllowedInvalidChangePasswordAttempts,
      isActivationEnabled
    } = options;

    if (!_.isString(propertyNameOfUniqueIdentifier) || !utility.isInitialized(propertyNameOfUniqueIdentifier) ||
        !_.isString(propertyNameOfPassword) || !utility.isInitialized(propertyNameOfPassword) ||
        !_.isString(privateKeyForEncryption) || !utility.isInitialized(privateKeyForEncryption) ||
        !_.isString(initVectorForEncryption) || !utility.isInitialized(initVectorForEncryption) ||
        !_.isString(privateKeyToSign) || !utility.isInitialized(privateKeyToSign) ||
        !_.isInteger(tokenLifetime) || tokenLifetime <= 0 ||
        !_.isInteger(maxAllowedInvalidLoginAttempts) || maxAllowedInvalidLoginAttempts <= 0 ||
        !_.isInteger(maxAllowedInvalidChangePasswordAttempts) || maxAllowedInvalidChangePasswordAttempts <= 0 ||
        !_.isBoolean(isActivationEnabled))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    super();

    this._applicationService = applicationService;
    this._propertyNameOfUniqueIdentifier = propertyNameOfUniqueIdentifier;
    this._propertyNameOfPassword = propertyNameOfPassword;
    this._privateKeyForEncryption = privateKeyForEncryption;
    this._initVectorForEncryption = initVectorForEncryption;
    this._privateKeyToSign = privateKeyToSign;
    this._tokenLifetime = tokenLifetime;
    this._maxAllowedInvalidLoginAttempts = maxAllowedInvalidLoginAttempts;
    this._maxAllowedInvalidChangePasswordAttempts = maxAllowedInvalidChangePasswordAttempts;
    this._isActivationEnabled = isActivationEnabled;
  }

  /**
   * Verifies public requests (which are open to public).
   * It does not contain any logic. Hooks should be used to place logic.
   *
   * @param {Object} request - Represents request.
   * @param {Object} response - Represents response.
   * @param {Function} next - Represents the next middleware function in the application’s request-response cycle.
   * @param {Object} [hooks] - Represents hooks.
   * @param {{[required]: Array<string>, [optional]: Array<string>} | string} [allowedPropertiesForHeaders] - Represents allowed properties for headers.
   * @return {Promise<void>}
   */
  async verifyPublic (request, response, next, hooks = undefined, allowedPropertiesForHeaders = undefined)
  {
    try
    {
      if (!Validator.isValidParameterRequest(request) ||
          !Validator.isValidParameterResponse(response) ||
          !Validator.isValidParameterNext(next) ||
          (utility.isExist(hooks) || Validator.isValidParameterHooks(hooks)) &&
          (utility.isExist(allowedPropertiesForHeaders) || !Validator.isValidParameterAllowedPropertiesForRequestElements({headers: allowedPropertiesForHeaders})))
      {
        throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
      }

      hooks = utility.init(hooks, {});
      hooks.bearer = utility.init(hooks.bearer, {});

      const headers = AuthController._extractAndAuthorizeHeaders(request, allowedPropertiesForHeaders);

      utility.isExist(hooks.headers) ? await hooks.headers(headers) : undefined;

      next();
    }
    catch (error)
    {
      this._sendResponseWhenError(response, error);
    }
  }

  /**
   * Verifies private requests (which are closed to public and must be authorized and authenticated) using the authorization header.
   * Token must be sent using the authorization header must be sent.
   * Gets the token from the authorization header and decodes.
   * Retrieves the related account and checks if it exists, active (if activation is enabled), and not blocked.
   * Generates a new token puts it under locals ((http://expressjs.com/en/5x/api.html#res.locals)) with the account ID and the old token.
   *
   * @param {Object} request - Represents request.
   * @param {Object} response - Represents response.
   * @param {Function} next - Represents the next middleware function in the application’s request-response cycle.
   * @param {Object} [hooks] - Represents hooks.
   * @param {{[required]: Array<string>, [optional]: Array<string>} | string} [allowedPropertiesForHeaders] - Represents allowed properties for headers.
   * @return {Promise<void>}
   */
  async verifyPrivate (request, response, next, hooks = undefined, allowedPropertiesForHeaders = undefined)
  {
    try
    {
      if (!Validator.isValidParameterRequest(request) ||
          !Validator.isValidParameterResponse(response) ||
          !Validator.isValidParameterNext(next) ||
          (utility.isExist(hooks) || Validator.isValidParameterHooks(hooks)) &&
          (utility.isExist(allowedPropertiesForHeaders) || !Validator.isValidParameterAllowedPropertiesForRequestElements({headers: allowedPropertiesForHeaders})))
      {
        throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
      }

      hooks = utility.init(hooks, {});
      hooks.bearer = utility.init(hooks.bearer, {});

      const headers = AuthController._extractAndAuthorizeHeaders(request, allowedPropertiesForHeaders, true);

      utility.isExist(hooks.headers) ? await hooks.headers(headers) : undefined;

      if (!utility.isExist(response.locals))
      {
        response.locals = {};
      }

      if (!utility.isExist(headers.authorization))
      {
        throw new UnauthorizedError(ErrorSafe.get().AUTHORIZATION_HEADER_MISSING);
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
          throw new InvalidTokenError(ErrorSafe.get().HTTP_222);
        }
        else if (error.name === "TokenExpiredError")
        {
          throw new TokenExpiredError(ErrorSafe.get().HTTP_223);
        }

        throw error;
      }

      const account = await this._applicationService.readOneById(decodedToken.data._account, undefined, {bearer: hooks.bearer});

      // check if the account is exist.
      if (!utility.isExist(account))
      {
        throw new UnauthorizedError(ErrorSafe.get().HTTP_22);
      }

      // check if the account is inactive (if activation is enabled).
      if (this._isActivationEnabled && !account.auth.isActive)
      {
        throw new ForbiddenError(ErrorSafe.get().ACCOUNT_INACTIVE);
      }

      // check if the account is blocked.
      if (account.auth.isBlocked)
      {
        throw new ForbiddenError(ErrorSafe.get().ACCOUNT_BLOCKED);
      }

      const payload = {_account: account._id};
      utility.isExist(hooks.payload) ? await hooks.payload(payload, account) : undefined;
      response.locals.account = account;
      response.locals.oldTokenData = decodedToken.data;
      response.locals.newToken = this._generateToken(payload);

      if (utility.isExist(next))
      {
        next();
      }
      else
      {
        await this._sendResponse(request, response, 200);
      }
    }
    catch (error)
    {
      this._sendResponseWhenError(response, error);
    }
  }

  /**
   * Registers an account.
   * Gets the unique identifier and password from the body.
   * Checks if such an account exists.
   * Creates an account which is not active (if activation is enabled), not blocked, has 0 failed login and change password attempts.
   * If the application service has a persona, removes forbidden properties from the account before sending it in the response.
   *
   * @param {Object} request - Represents request.
   * @param {Object} response - Represents response.
   * @param {Function} [next] - Represents the next middleware function in the application’s request-response cycle.
   * @param {Object} [hooks] - Represents hooks.
   * @typedef {{[]: string | PropertyDefinition} | Array<{[]: string | PropertyDefinition}>} PropertyDefinition
   * @typedef {{[required]: Array<string>, [optional]: Array<string>} | string} AllowedProperties
   * @typedef {{[]: string | PropertyDefinition} | Array<{[]: string | PropertyDefinition}>} PropertyDefinition
   * @param {{[headers]: AllowedProperties, [pathParameters]: AllowedProperties, [queryString]: AllowedProperties, [body]: PropertyDefinition}} [allowedPropertiesForRequestElements] - Represents allowed properties for request elements.
   * @return {Promise<void>}
   */
  async register (request, response, next = undefined, hooks = undefined, allowedPropertiesForRequestElements = undefined)
  {
    try
    {
      if (!Validator.isValidRouteFacingControllerMethodParameters(request, response, next, hooks, allowedPropertiesForRequestElements))
      {
        throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
      }

      hooks = utility.init(hooks, {});

      AuthController._extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
      AuthController._extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
      AuthController._extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString, false);
      const body = AuthController._extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body, true);

      utility.isExist(hooks.body) ? await hooks.body(body) : undefined;

      const uniqueIdentifier = body[this._propertyNameOfUniqueIdentifier];
      const password = body[this._propertyNameOfPassword];

      if (!_.isString(uniqueIdentifier) || !utility.isInitialized(uniqueIdentifier) ||
          !_.isString(password) || !utility.isInitialized(password))
      {
        throw new BadRequestError(ErrorSafe.get().HTTP_21);
      }

      utility.isExist(hooks.uniqueIdentifier) ? await hooks.uniqueIdentifier(uniqueIdentifier) : undefined;
      utility.isExist(hooks.password) ? await hooks.password(password) : undefined;

      const query = {};
      query[this._propertyNameOfUniqueIdentifier] = uniqueIdentifier;

      utility.isExist(hooks.query) ? await hooks.query(query) : undefined;

      let account;
      const session = SessionManager.startSession();
      await SessionManager.exec(async () =>
                                {
                                  account = await this._applicationService.dbOperation.getNativeOps().findOne(query, {session}); // uses native DB operation to use all features of querying if needed.

                                  // check if the account is exist.
                                  if (utility.isExist(account))
                                  {
                                    throw new ForbiddenError(ErrorSafe.get().ACCOUNT_ALREADY_EXIST);
                                  }

                                  body.auth = {};
                                  body.auth[this._propertyNameOfPassword] = await bcrypt.hash(password, 10);
                                  if (this._isActivationEnabled)
                                  {
                                    body.auth.isActive = false;
                                  }
                                  body.auth.isBlocked = false;
                                  body.auth.numberOfFailedLoginAttempts = 0;
                                  body.auth.numberOfFailedChangePasswordAttempts = 0;

                                  utility.isExist(hooks.before) ? await hooks.before(body, session) : undefined;
                                  account = await this._applicationService.createOne(body, session);
                                  utility.isExist(hooks.after) ? await hooks.after(account, session) : undefined;

                                  if (!this._isActivationEnabled)
                                  {
                                    const payload = {_account: account._id};
                                    utility.isExist(hooks.payload) ? await hooks.payload(payload, account, session) : undefined;
                                    response.locals.newToken = this._generateToken(payload);
                                  }

                                  if (utility.isExist(this._applicationService.persona))
                                  {
                                    this._applicationService.removeForbiddenProperties(account);
                                  }
                                }, undefined, session);

      await this._sendResponse(request, response, 200);
    }
    catch (error)
    {
      this._sendResponseWhenError(response, error);
    }
  }

  /**
   * Logins the account.
   * Gets the unique identifier and password from the body.
   * Checks if such an account exists.
   * Checks if the password is correct.
   * If the password is not correct,
   *   Increases the number of failed login attempts.
   *   Records the last failed login attempt.
   *   If the number of failed login attempts reach the limit, blocks the account.
   * If the password is correct,
   *   Checks if the account is active (if activation is enabled).
   *   Checks if the account is not blocked.
   *   Resets the number of failed login attempts.
   *   Records the last successful login.
   * If the application service has a persona, removes forbidden properties from the account before sending it in the response.
   *
   * @param {Object} request - Represents request.
   * @param {Object} response - Represents response.
   * @param {Function} [next] - Represents the next middleware function in the application’s request-response cycle.
   * @param {Object} [hooks] - Represents hooks.
   * @typedef {{[]: string | PropertyDefinition} | Array<{[]: string | PropertyDefinition}>} PropertyDefinition
   * @typedef {{[required]: Array<string>, [optional]: Array<string>} | string} AllowedProperties
   * @typedef {{[]: string | PropertyDefinition} | Array<{[]: string | PropertyDefinition}>} PropertyDefinition
   * @param {{[headers]: AllowedProperties, [pathParameters]: AllowedProperties, [queryString]: AllowedProperties, [body]: PropertyDefinition}} [allowedPropertiesForRequestElements] - Represents allowed properties for request elements.
   * @return {Promise<void>}
   */
  async login (request, response, next = undefined, hooks = undefined, allowedPropertiesForRequestElements = undefined)
  {
    try
    {
      if (!Validator.isValidRouteFacingControllerMethodParameters(request, response, next, hooks, allowedPropertiesForRequestElements))
      {
        throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
      }

      hooks = utility.init(hooks, {});
      hooks.bearer = utility.init(hooks.bearer, {});

      AuthController._extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
      AuthController._extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
      AuthController._extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString, false);
      const body = AuthController._extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body, true);

      utility.isExist(hooks.body) ? await hooks.body(body) : undefined;

      const uniqueIdentifier = body[this._propertyNameOfUniqueIdentifier];
      const password = body[this._propertyNameOfPassword];

      if (!_.isString(uniqueIdentifier) || !utility.isInitialized(uniqueIdentifier) ||
          !_.isString(password) || !utility.isInitialized(password))
      {
        throw new BadRequestError(ErrorSafe.get().HTTP_21);
      }

      const query = {};
      query[this._propertyNameOfUniqueIdentifier] = uniqueIdentifier;

      utility.isExist(hooks.query) ? await hooks.query(query) : undefined;

      let account, error;
      const session = SessionManager.startSession();
      await SessionManager.exec(async () =>
                                {
                                  account = await this._applicationService.dbOperation.getNativeOps().findOne(query, {session}); // uses native DB operation to use all features of querying if needed.

                                  // check if the account is not exist.
                                  if (!utility.isExist(account))
                                  {
                                    throw new InvalidCredentialsError(ErrorSafe.get().HTTP_221);
                                  }

                                  // check if the password is correct.
                                  const isPasswordCorrect = await bcrypt.compare(password, account.auth[this._propertyNameOfPassword]);
                                  const newAccountProperties = {auth: {}};

                                  if (!isPasswordCorrect)
                                  {
                                    error = new InvalidCredentialsError(ErrorSafe.get().HTTP_221); // not throwing the error immediately to increase the number of failed login attempts or block account.

                                    newAccountProperties.auth.numberOfFailedLoginAttempts = account.auth.numberOfFailedLoginAttempts + 1; // if the password is incorrect, the number of failed login attempts must be increased.
                                    newAccountProperties.auth.lastFailedLoginAttempt = new Date(); // if the password is incorrect, the time of the attempt must be recorded.

                                    if (newAccountProperties.auth.numberOfFailedLoginAttempts >= this._maxAllowedInvalidLoginAttempts) // if the max invalid login attempts is changed, for some accounts in database instant number of failed login attempts may be greater than the max invalid login attempts
                                    {
                                      newAccountProperties.auth.isBlocked = true;
                                      error = new AccountBlockedError(ErrorSafe.get().HTTP_231);
                                    }
                                  }
                                  else
                                  {
                                    // check if the account is inactive. only if the password is correct.
                                    if (this._isActivationEnabled && !account.auth.isActive)
                                    {
                                      throw new ForbiddenError(ErrorSafe.get().ACCOUNT_INACTIVE);
                                    }

                                    // check if the account is blocked. only if the password is correct.
                                    if (account.auth.isBlocked)
                                    {
                                      throw new ForbiddenError(ErrorSafe.get().ACCOUNT_BLOCKED);
                                    }

                                    newAccountProperties.auth.numberOfFailedLoginAttempts = 0; // if the password is correct, the number of failed login attempts must be reset.
                                    newAccountProperties.auth.lastSuccessfulLogin = new Date(); // if the password is correct, the time of the login must be recorded.
                                  }

                                  account = await this._applicationService.updateOneByIdAndVersion(account._id, account.version, newAccountProperties, session, {bearer: hooks.bearer});

                                  if (!utility.isExist(error))
                                  {
                                    const payload = {_account: account._id};
                                    utility.isExist(hooks.payload) ? await hooks.payload(payload, account, session) : undefined;
                                    response.locals.newToken = this._generateToken(payload);

                                    if (utility.isExist(this._applicationService.persona))
                                    {
                                      this._applicationService.removeForbiddenProperties(account);
                                    }
                                  }
                                }, undefined, session);

      if (utility.isExist(error))
      {
        throw error;
      }

      await this._sendResponse(request, response, 200);
    }
    catch (error)
    {
      this._sendResponseWhenError(response, error);
    }
  }

  /**
   * Changes the password of the account.
   * `verifyPrivate` must be used before.
   * Gets the old and the new passwords from the body.
   * Checks if the old password is correct.
   * If the old password is not correct,
   *   Increases the number of failed change password attempts.
   *   Records the last failed change password attempt.
   *   If the number of failed change password attempts reach the limit, blocks the account.
   * If the password is correct,
   *   Resets the number of failed login attempts.
   *   Records the last successful login.
   * If the application service has a persona, removes forbidden properties from the account before sending it in the response.
   *
   * @param {Object} request - Represents request.
   * @param {Object} response - Represents response.
   * @param {Function} [next] - Represents the next middleware function in the application’s request-response cycle.
   * @param {Object} [hooks] - Represents hooks.
   * @typedef {{[]: string | PropertyDefinition} | Array<{[]: string | PropertyDefinition}>} PropertyDefinition
   * @typedef {{[required]: Array<string>, [optional]: Array<string>} | string} AllowedProperties
   * @typedef {{[]: string | PropertyDefinition} | Array<{[]: string | PropertyDefinition}>} PropertyDefinition
   * @param {{[headers]: AllowedProperties, [pathParameters]: AllowedProperties, [queryString]: AllowedProperties, [body]: PropertyDefinition}} [allowedPropertiesForRequestElements] - Represents allowed properties for request elements.
   * @return {Promise<void>}
   */
  async changePassword (request, response, next = undefined, hooks = undefined, allowedPropertiesForRequestElements = undefined)
  {
    try
    {
      if (!Validator.isValidRouteFacingControllerMethodParameters(request, response, next, hooks, allowedPropertiesForRequestElements))
      {
        throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
      }

      if (!utility.isExist(response.locals.account))
      {
        throw new InvalidArgumentsError(ErrorSafe.get().DEV_1); // verify private must be used before but not used.
      }

      hooks = utility.init(hooks, {});
      hooks.bearer = utility.init(hooks.bearer, {});

      AuthController._extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
      AuthController._extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
      AuthController._extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString, false);
      const body = AuthController._extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body, true);

      utility.isExist(hooks.body) ? await hooks.body(body) : undefined;

      const camelCasedPropertyNameOfPassword = `${this._propertyNameOfPassword.charAt(0).toUpperCase()}${this._propertyNameOfPassword.slice(1)}`;
      const oldPassword = body[`old${camelCasedPropertyNameOfPassword}`];
      const newPassword = body[`new${camelCasedPropertyNameOfPassword}`];

      if (!_.isString(oldPassword) || !utility.isInitialized(oldPassword) ||
          !_.isString(newPassword) || !utility.isInitialized(newPassword))
      {
        throw new BadRequestError(ErrorSafe.get().HTTP_21);
      }

      let account, error;
      const session = SessionManager.startSession();
      await SessionManager.exec(async () =>
                                {
                                  account = await this._applicationService.readOneById(response.locals.account._id, session, {bearer: hooks.bearer});
                                  utility.isExist(hooks.account) ? await hooks.account(account, session) : undefined;

                                  // check if the password is correct.
                                  const isPasswordCorrect = await bcrypt.compare(oldPassword, account.password);
                                  const newAccountProperties = {auth: {}};

                                  if (!isPasswordCorrect)
                                  {
                                    error = new InvalidCredentialsError(ErrorSafe.get().HTTP_221); // not thrown to increase the number of failed change password attempts or block account.

                                    newAccountProperties.auth.numberOfFailedChangePasswordAttempts = account.auth.numberOfFailedChangePasswordAttempts + 1; // if the old password is incorrect, the number of failed change password attempts must be increased.
                                    newAccountProperties.auth.lastFailedChangePasswordAttempt = new Date(); // if the old password is incorrect, the time of the attempt must be recorded.

                                    if (newAccountProperties.auth.numberOfFailedChangePasswordAttempts >= this._maxAllowedInvalidChangePasswordAttempts) // if the max change password attempts is changed, for some accounts in database instant number of failed change password attempts may be greater than the max invalid change password attempts
                                    {
                                      newAccountProperties.auth.isBlocked = true;
                                      error = new AccountBlockedError(ErrorSafe.get().HTTP_231);
                                    }
                                  }
                                  else
                                  {
                                    newAccountProperties.auth.numberOfFailedChangePasswordAttempts = 0; // if the password is correct, the number of failed change password attempts must be reset.
                                    newAccountProperties.auth.lastSuccessfulChangePassword = new Date(); // if the password is correct, the time of the change password must be recorded.

                                    newAccountProperties.auth[this._propertyNameOfPassword] = await bcrypt.hash(newPassword, 10);
                                  }

                                  account = await this._applicationService.updateOneByIdAndVersion(account._id, account.version, newAccountProperties, session, {bearer: hooks.bearer});

                                  if (!utility.isExist(error))
                                  {
                                    const payload = {_account: account._id};
                                    utility.isExist(hooks.payload) ? await hooks.payload(payload, account, session) : undefined;
                                    response.locals.newToken = this._generateToken(payload);

                                    if (utility.isExist(this._applicationService.persona))
                                    {
                                      this._applicationService.removeForbiddenProperties(account);
                                    }
                                  }
                                }, undefined, session);

      if (utility.isExist(error))
      {
        throw error;
      }

      await this._sendResponse(request, response, 200);
    }
    catch (error)
    {
      this._sendResponseWhenError(response, error);
    }
  }

  /**
   * Generates a token.
   *
   * @param {Object} payload
   * @return {string} - Encoded token.
   * @private
   */
  _generateToken (payload)
  {
    if (!_.isPlainObject(payload))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    const token = jwt.sign(
      {data: payload},
      this._privateKeyToSign,
      {
        algorithm: "HS512",
        expiresIn: this._tokenLifetime
      }
    );

    const cipher = crypto.createCipheriv(AuthController._DEFAULT_ENCRYPTION_ALGORITHM, this._privateKeyForEncryption, this._initVectorForEncryption);
    let encryptedToken = cipher.update(token, "utf-8", "hex");
    encryptedToken += cipher.final("hex");

    return encryptedToken;
  }

  /**
   * Decodes the token.
   *
   * @param {string} encodedToken - The encoded token.
   * @return {string} - The decoded token.
   * @private
   */
  _decodeToken (encodedToken)
  {
    if (!_.isString(encodedToken))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    const decipher = crypto.createDecipheriv(AuthController._DEFAULT_ENCRYPTION_ALGORITHM, this._privateKeyForEncryption, this._initVectorForEncryption);
    let decryptedToken = decipher.update(encodedToken, "hex", "utf-8");
    decryptedToken += decipher.final("utf8");

    const decodedToken = jwt.verify(decryptedToken, this._privateKeyToSign);

    return decodedToken;
  }
}

module.exports = AuthController;
