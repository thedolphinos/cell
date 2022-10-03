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
const NodeRSA = require("node-rsa");

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
   * @protected
   */
  static DEFAULT_ENCRYPTION_ALGORITHM = "aes-256-cbc";

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
   * Key to be used for encryption.
   * Its encoding is hex.
   *
   * @type {string}
   * @private
   */
  _encryptionKey;

  /**
   * Initialization vector to be used for encryption.
   * Its encoding is hex.
   *
   * @type {string}
   * @private
   */
  _encryptionIv;

  /**
   * Passphrase to be used for encrypting RSA private keys.
   * Its encoding is hex.
   *
   * @type {string}
   * @private
   */
  _encryptionPassphrase;

  /**
   * Private key to be used to sign token.
   *
   * @type {string}
   * @private
   */
  _tokenPrivateKey;

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
   * Private key to be used to sign activation link.
   *
   * @type {string}
   * @private
   */
  _activationLinkPrivateKey;

  /**
   * The lifetime of an activation link in seconds.
   *
   * @type {number}
   * @private
   */
  _activationLinkLifeTime;

  /**
   * @param {ApplicationService} applicationService - The application service to be used for authorization and authentication operations.
   * @param {Object} [options] - Options for authorization and authentication.
   * @param {string} options.propertyNameOfUniqueIdentifier - The property name of unique identifier of an account such as username or e-mail. It must be also presented in the schema of the application service.
   * @param {string} options.propertyNameOfPassword - The property name of password of an account. It must be also presented in the schema of the application service.
   * @param {string} options.encryptionKey - Key to be used for encryption.
   * @param {string} options.encryptionIv - Initialization vector to be used for encryption.
   * @param {string} options.encryptionPassphrase - Passphrase to be used for encrypting RSA private keys.
   * @param {string} options.tokenPrivateKey - Private key to be used to sign token.
   * @param {number} [options.tokenLifetime] - The lifetime of a token in seconds.
   * @param {number} [options.maxAllowedInvalidLoginAttempts] - The maximum allowed invalid login attempts of an account.
   * @param {number} [options.maxAllowedInvalidChangePasswordAttempts] - The maximum allowed change password attempts of an account.
   * @param {boolean} [options.isActivationEnabled] - Enables account activation. This can be used to lock account if the e-mail or phone number is not validated.
   * @param {string} [options.activationLinkPrivateKey] - Private key to be used to sign activation link.
   * @param {number} [options.activationLinkLifeTime] - The lifetime of an activation link in seconds.
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
      encryptionKey,
      encryptionIv,
      encryptionPassphrase,
      tokenPrivateKey,
      tokenLifetime,
      maxAllowedInvalidLoginAttempts,
      maxAllowedInvalidChangePasswordAttempts,
      isActivationEnabled,
      activationLinkPrivateKey,
      activationLinkLifeTime
    } = options;

    if (!_.isString(propertyNameOfUniqueIdentifier) || !utility.isInitialized(propertyNameOfUniqueIdentifier) ||
        !_.isString(propertyNameOfPassword) || !utility.isInitialized(propertyNameOfPassword) ||
        !_.isString(encryptionKey) || !utility.isInitialized(encryptionKey) ||
        !_.isString(encryptionIv) || !utility.isInitialized(encryptionIv) ||
        !_.isString(encryptionPassphrase) || !utility.isInitialized(encryptionPassphrase) ||
        !_.isString(tokenPrivateKey) || !utility.isInitialized(tokenPrivateKey) ||
        !_.isInteger(tokenLifetime) || tokenLifetime <= 0 ||
        !_.isInteger(maxAllowedInvalidLoginAttempts) || maxAllowedInvalidLoginAttempts <= 0 ||
        !_.isInteger(maxAllowedInvalidChangePasswordAttempts) || maxAllowedInvalidChangePasswordAttempts <= 0 ||
        !_.isBoolean(isActivationEnabled) ||
        (isActivationEnabled && (
          !_.isString(activationLinkPrivateKey) || !utility.isInitialized(activationLinkPrivateKey) ||
          !_.isInteger(activationLinkLifeTime) || activationLinkLifeTime <= 0
        )))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    super();

    this._applicationService = applicationService;
    this._propertyNameOfUniqueIdentifier = propertyNameOfUniqueIdentifier;
    this._propertyNameOfPassword = propertyNameOfPassword;
    this._encryptionKey = encryptionKey;
    this._encryptionIv = encryptionIv;
    this._encryptionPassphrase = encryptionPassphrase;
    this._tokenPrivateKey = tokenPrivateKey;
    this._tokenLifetime = tokenLifetime;
    this._maxAllowedInvalidLoginAttempts = maxAllowedInvalidLoginAttempts;
    this._maxAllowedInvalidChangePasswordAttempts = maxAllowedInvalidChangePasswordAttempts;
    this._isActivationEnabled = isActivationEnabled;
    this._activationLinkPrivateKey = activationLinkPrivateKey;
    this._activationLinkLifeTime = activationLinkLifeTime;
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
   * Gets the cipher authorization bundle from the authorization header.
   * Decrypts and decodes it.
   * Retrieves the related account and checks if it exists, active (if activation is enabled), and not blocked.
   * Encodes and encrypts a new authorization bundle.
   * Puts it under locals ((http://expressjs.com/en/5x/api.html#res.locals)).
   *
   * @param {Object} request - Represents request.
   * @param {Object} response - Represents response.
   * @param {Function} [next] - Represents the next middleware function in the application’s request-response cycle. If not presented, it sends the response.
   * @param {Object} [hooks] - Represents hooks.
   * @param {{[required]: Array<string>, [optional]: Array<string>} | string} [allowedPropertiesForHeaders] - Represents allowed properties for headers.
   * @return {Promise<void>}
   */
  async verifyPrivate (request, response, next = undefined, hooks = undefined, allowedPropertiesForHeaders = undefined)
  {
    try
    {
      if (!Validator.isValidParameterRequest(request) ||
          !Validator.isValidParameterResponse(response) ||
          (utility.isExist(next) || Validator.isValidParameterNext(next)) &&
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

      let account;

      try
      {
        const result = await this._decryptAndDecodeAuthorizationBundle(headers.authorization, this._tokenPrivateKey, this._applicationService);
        account = result.account;
      }
      catch (error)
      {
        if (error.name === "TokenExpiredError")
        {
          throw new TokenExpiredError(ErrorSafe.get().HTTP_223);
        }

        throw new InvalidTokenError(ErrorSafe.get().HTTP_222);
      }

      // check if the account exists.
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

      response.locals.account = account;
      await this._embedAuthorizationDataToLocals(response, account);

      if (utility.isExist(next))
      {
        next();
      }
      else
      {
        const data = {};
        utility.isExist(hooks.data) ? await hooks.data(data, account) : undefined;

        await this._sendResponse(request, response, 200, data);
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
      const {session} = SessionManager.generateSessionsForService(null, hooks);
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

                                  const key = crypto.generateKeySync("aes", {length: 256}).export().toString("hex");
                                  const iv = crypto.randomBytes(16).toString("hex");
                                  const {publicKey, privateKey} = crypto.generateKeyPairSync("rsa",
                                                                                             {
                                                                                               modulusLength: 4096,
                                                                                               publicKeyEncoding: {
                                                                                                 type: "pkcs1",
                                                                                                 format: "pem"
                                                                                               },
                                                                                               privateKeyEncoding: {
                                                                                                 type: "pkcs8",
                                                                                                 format: "pem",
                                                                                                 cipher: "aes-256-cbc",
                                                                                                 passphrase: this._encryptionPassphrase
                                                                                               }
                                                                                             });

                                  body.encryption = {
                                    aes: {
                                      key,
                                      iv
                                    },
                                    rsa: {
                                      publicKey,
                                      privateKey
                                    }
                                  };

                                  utility.isExist(hooks.before) ? await hooks.before(body, session) : undefined;
                                  account = await this._applicationService.createOne(body, session);
                                  utility.isExist(hooks.after) ? await hooks.after(account, session) : undefined;

                                  if (this._isActivationEnabled)
                                  {
                                    let activationCode = crypto.randomInt(0, 1000000); // generates a number between 0 and 999999.
                                    activationCode = activationCode.toString().padStart(6, "0"); // adds 0(s) if needed.

                                    const activationLink = await this._encodeAndEncryptAuthorizationBundle(account, {activationCode}, this._activationLinkPrivateKey, this._activationLinkLifeTime);

                                    const result = await this._applicationService.updateOneByIdAndVersion(account._id, account.version,
                                                                                                          {
                                                                                                            auth: {
                                                                                                              isActive: false,
                                                                                                              activationCode
                                                                                                            }
                                                                                                          },
                                                                                                          session);
                                    account = result.document;

                                    utility.isExist(hooks.activation) ? await hooks.activation(account, activationCode, activationLink, session) : undefined;
                                  }
                                },
                                undefined, session);

      if (!this._isActivationEnabled) // allows direct login after registration.
      {
        await this._embedAuthorizationDataToLocals(response, account);
      }

      const data = {};
      utility.isExist(hooks.data) ? await hooks.data(data, account) : undefined;

      await this._sendResponse(request, response, 200, data);
    }
    catch (error)
    {
      this._sendResponseWhenError(response, error);
    }
  }

  /**
   * Activates an account.
   * Gets the activation link and activation code from the body.
   * Validates the activation link and code.
   * Activates the account.
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
  async activate (request, response, next = undefined, hooks = undefined, allowedPropertiesForRequestElements = undefined)
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

      const {activationLink, activationCode} = body;

      let account, decodedToken;

      try
      {
        const result = await this._decryptAndDecodeAuthorizationBundle(activationLink, this._activationLinkPrivateKey, this._applicationService);
        account = result.account;
        decodedToken = result.decodedToken;
      }
      catch (error)
      {
        if (error.name === "JsonWebTokenError")
        {
          throw new BadRequestError(ErrorSafe.get().ACTIVATION_LINK_MALFORMED);
        }
        else if (error.name === "TokenExpiredError")
        {
          throw new BadRequestError(ErrorSafe.get().ACTIVATION_LINK_EXPIRED);
        }

        throw new BadRequestError();
      }

      if (decodedToken.data.activationCode !== account.auth.activationCode)
      {
        throw new BadRequestError(ErrorSafe.get().HTTP_22); // impossible.
      }

      if (activationCode !== account.auth.activationCode)
      {
        throw new BadRequestError(ErrorSafe.get().ACTIVATION_CODE_INVALID);
      }

      const {session} = SessionManager.generateSessionsForService(null, hooks);
      await SessionManager.exec(async () =>
                                {
                                  utility.isExist(hooks.before) ? await hooks.before(body, session) : undefined;
                                  const result = await this.applicationService.updateOneByIdAndVersion(account._id, account.version,
                                                                                                       {
                                                                                                         auth: {
                                                                                                           isActive: true,
                                                                                                           activationCode: null
                                                                                                         }
                                                                                                       },
                                                                                                       session);
                                  account = result.document;
                                  utility.isExist(hooks.after) ? await hooks.after(account, session) : undefined;
                                },
                                undefined, session);

      await this._embedAuthorizationDataToLocals(response, account);

      const data = {};
      utility.isExist(hooks.data) ? await hooks.data(data, account) : undefined;

      await this._sendResponse(request, response, 200, data);
    }
    catch (error)
    {
      this._sendResponseWhenError(response, error);
    }
  }

  /**
   * Retrieves the related account using the public key and checks if it exists, active (if activation is enabled), and not blocked.
   * Decrypts and decodes it.
   * Retrieves the related account and checks if it exists, active (if activation is enabled), and not blocked.
   * Encodes and encrypts a new authorization bundle.
   * Puts it under locals ((http://expressjs.com/en/5x/api.html#res.locals)).
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
  async authorize (request, response, next = undefined, hooks = undefined, allowedPropertiesForRequestElements = undefined)
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

      const {token: cipherToken, key: publicKey} = body;

      const account = await this._applicationService.readOne({encryption: {rsa: {publicKey}}});

      if (!utility.isExist(account))
      {
        throw new UnauthorizedError(ErrorSafe.get().HTTP_22);
      }

      let token;

      try
      {
        const privateKey = crypto.createPrivateKey({
                                                     key: account.encryption.rsa.privateKey,
                                                     passphrase: this._encryptionPassphrase
                                                   })
                                 .export({
                                           type: "pkcs8",
                                           format: "pem"
                                         })
                                 .toString("hex");

        const cipher = new NodeRSA(privateKey);
        token = cipher.decrypt(cipherToken).toString();
      }
      catch
      {
        throw new UnauthorizedError(ErrorSafe.get().HTTP_22);
      }

      try
      {
        await this._decryptAndDecodeAuthorizationBundle(token, this._tokenPrivateKey, this._applicationService);
      }
      catch (error)
      {
        if (error.name === "TokenExpiredError")
        {
          throw new TokenExpiredError(ErrorSafe.get().HTTP_223);
        }

        throw new InvalidTokenError(ErrorSafe.get().HTTP_222);
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

      response.locals.account = account;
      await this._embedAuthorizationDataToLocals(response, account);

      const data = {};
      utility.isExist(hooks.data) ? await hooks.data(data, account) : undefined;

      await this._sendResponse(request, response, 200, data);
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
      const {session} = SessionManager.generateSessionsForService(null, hooks);
      await SessionManager.exec(async () =>
                                {
                                  account = await this._applicationService.dbOperation.getNativeOps().findOne(query, {session}); // uses native DB operation to use all features of querying if needed.

                                  // check if the account not exists.
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
                                      error = new AccountBlockedError(ErrorSafe.get().HTTP_224);
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

                                  const result = await this._applicationService.updateOneByIdAndVersion(account._id, account.version, newAccountProperties, session, {bearer: hooks.bearer});
                                  account = result.document;
                                }, undefined, session);

      if (utility.isExist(error))
      {
        throw error;
      }

      await this._embedAuthorizationDataToLocals(response, account);

      const data = {};
      utility.isExist(hooks.data) ? await hooks.data(data, account) : undefined;

      await this._sendResponse(request, response, 200, data);
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

      utility.isExist(hooks.password) ? await hooks.password(oldPassword, newPassword) : undefined;

      let account, error;
      const {session} = SessionManager.generateSessionsForService(null, hooks);
      await SessionManager.exec(async () =>
                                {
                                  account = await this._applicationService.readOneById(response.locals.account._id, session, {bearer: hooks.bearer});
                                  utility.isExist(hooks.account) ? await hooks.account(account, session) : undefined;

                                  // check if the password is correct.
                                  const isPasswordCorrect = await bcrypt.compare(oldPassword, account.auth.password);
                                  const newAccountProperties = {auth: {}};

                                  if (!isPasswordCorrect)
                                  {
                                    error = new BadRequestError(ErrorSafe.get().PASSWORD_WRONG); // not thrown to increase the number of failed change password attempts or block account.

                                    newAccountProperties.auth.numberOfFailedChangePasswordAttempts = account.auth.numberOfFailedChangePasswordAttempts + 1; // if the old password is incorrect, the number of failed change password attempts must be increased.
                                    newAccountProperties.auth.lastFailedChangePasswordAttempt = new Date(); // if the old password is incorrect, the time of the attempt must be recorded.

                                    if (newAccountProperties.auth.numberOfFailedChangePasswordAttempts >= this._maxAllowedInvalidChangePasswordAttempts) // if the max change password attempts is changed, for some accounts in database instant number of failed change password attempts may be greater than the max invalid change password attempts
                                    {
                                      newAccountProperties.auth.isBlocked = true;
                                      error = new AccountBlockedError(ErrorSafe.get().HTTP_224);
                                    }
                                  }
                                  else
                                  {
                                    if (oldPassword === newPassword)
                                    {
                                      error = new BadRequestError(ErrorSafe.get().PASSWORD_UNCHANGED);
                                    }
                                    else
                                    {
                                      newAccountProperties.auth.numberOfFailedChangePasswordAttempts = 0; // if the password is correct, the number of failed change password attempts must be reset.
                                      newAccountProperties.auth.lastSuccessfulChangePassword = new Date(); // if the password is correct, the time of the change password must be recorded.

                                      newAccountProperties.auth[this._propertyNameOfPassword] = await bcrypt.hash(newPassword, 10);
                                    }
                                  }

                                  utility.isExist(hooks.before) ? await hooks.before(account, newAccountProperties, error, session) : undefined;
                                  const result = await this._applicationService.updateOneByIdAndVersion(account._id, account.version, newAccountProperties, session, {bearer: hooks.bearer});
                                  account = result.document;
                                  utility.isExist(hooks.after) ? await hooks.after(account, error, session) : undefined;

                                  if (!utility.isExist(error) &&
                                      !utility.isExist(response.locals.authorizationBundle)) // allows direct login after registration.
                                  {
                                    await this._embedAuthorizationDataToLocals(response, account);
                                  }
                                },
                                undefined, session);

      if (utility.isExist(error))
      {
        throw error;
      }

      const data = {};
      utility.isExist(hooks.data) ? await hooks.data(data, account) : undefined;

      await this._sendResponse(request, response, 200, data);
    }
    catch (error)
    {
      this._sendResponseWhenError(response, error);
    }
  }

  /**
   * Embeds authorization bundle and public key to locals.
   * They will be added to response alongside with data.
   *
   * @param {Object} response - Represents response.
   * @param {Object} account - The account.
   * @returns {Promise<void>}
   * @private
   */
  async _embedAuthorizationDataToLocals (response, account)
  {
    response.locals.authorizationBundle = await this._encodeAndEncryptAuthorizationBundle(account, {}, this._tokenPrivateKey, this._tokenLifetime);
    response.locals.publicKey = account.encryption.rsa.publicKey;
  }

  /**
   * Embeds account ID into the token payload.
   * Generates a token.
   * Encrypts token using an account-specific key.
   * Bundles the encrypted token and account ID.
   * Encrypts the bundle using a server-specific key.
   *
   * @param {Object} account - The account.
   * @param {Object} tokenPayload - Token data.
   * @param {string} tokenPrivateKey - Private key to be used to encode token.
   * @param {number} tokenLifeTime - The lifetime of the token in seconds.
   * @returns {Promise<string>} - Encrypted bundle.
   * @private
   */
  async _encodeAndEncryptAuthorizationBundle (account, tokenPayload, tokenPrivateKey, tokenLifeTime)
  {
    if (!_.isPlainObject(account) ||
        !_.isPlainObject(tokenPayload) ||
        !_.isString(tokenPrivateKey) || !utility.isInitialized(tokenPrivateKey) ||
        !_.isInteger(tokenLifeTime) || tokenLifeTime <= 0)
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    tokenPayload._account = account._id;
    const token = this._generateToken(tokenPayload, tokenPrivateKey, tokenLifeTime);

    const bundle = {
      token: this._encrypt(token, account.encryption.aes.key, account.encryption.aes.iv),
      _account: account._id
    };

    return this._encrypt(JSON.stringify(bundle), this._encryptionKey, this._encryptionIv);
  }

  /**
   * Decrypts the given bundle using a server-specific key. The bundle contains an encrypted token and the account ID.
   * Accesses the account using the account ID.
   * Decrypts the token using the account-specific key.
   * Verifies and decodes the token.
   * Cross-checks the account IDs.
   *
   * @param {string} cipherBundle - Cipher bundle.
   * @param {string} tokenPrivateKey - Private key to be used to encode token.
   * @param {ApplicationService} applicationService - Application service to access the account.
   * @returns {Promise<Object>} - The account.
   * @private
   */
  async _decryptAndDecodeAuthorizationBundle (cipherBundle, tokenPrivateKey, applicationService)
  {
    if (!_.isString(cipherBundle) ||
        !_.isString(tokenPrivateKey) || !utility.isInitialized(tokenPrivateKey) ||
        !Validator.isValidParameterApplicationService(applicationService))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    const bundle = JSON.parse(this._decrypt(cipherBundle, this._encryptionKey, this._encryptionIv));

    const account = await applicationService.readOneById(bundle._account, null, {raiseDocumentExistenceErrors: true});

    const token = this._decrypt(bundle.token, account.encryption.aes.key, account.encryption.aes.iv);
    const decodedToken = this._verifyAndDecodeToken(token, tokenPrivateKey);

    if (!utility.isSameIds(bundle._account, decodedToken.data._account))
    {
      throw new UnauthorizedError(ErrorSafe.get().HTTP_22);
    }

    return {
      account,
      decodedToken
    };
  }

  /**
   * Encrypts the given plain text using the given key.
   *
   * @param {string} plainText - Plain text to be encrypted.
   * @param {string} key - Key to be used for encryption.
   * @param {string} iv - Initialization vector to be used for encryption.
   * @returns {string} - Cipher text.
   * @private
   */
  _encrypt (plainText, key, iv)
  {
    if (!_.isString(plainText) || !utility.isInitialized(plainText) ||
        !_.isString(key) || !utility.isInitialized(key))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    const encoding = {
      input: "utf-8",
      output: "hex"
    };

    const cipher = crypto.createCipheriv(AuthController.DEFAULT_ENCRYPTION_ALGORITHM, Buffer.from(key, "hex"), Buffer.from(iv, "hex"));

    let cipherText = cipher.update(plainText, encoding.input, encoding.output);
    cipherText += cipher.final(encoding.output);

    return cipherText;
  }

  /**
   * Decrypts the given encrypted text using the given key.
   *
   * @param {string} encryptedText - Encrypted text to be decrypted.
   * @param {string} key - Key to be used for decryption.
   * @param {string} iv - Initialization vector to be used for encryption.
   * @returns {string} - Decrypted text.
   * @private
   */
  _decrypt (encryptedText, key, iv)
  {
    if (!_.isString(encryptedText) || !utility.isInitialized(encryptedText) ||
        !_.isString(key) || !utility.isInitialized(key))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    const encoding = {
      input: "hex",
      output: "utf8"
    };

    const decipher = crypto.createDecipheriv(AuthController.DEFAULT_ENCRYPTION_ALGORITHM, Buffer.from(key, "hex"), Buffer.from(iv, "hex"));

    let decryptedMessage = decipher.update(encryptedText, encoding.input, encoding.output);
    decryptedMessage += decipher.final(encoding.output);

    return decryptedMessage;
  }

  /**
   * Generates a token.
   *
   * @param {Object} payload - Token data.
   * @param {string} privateKey - Private key to be used to encode token.
   * @param {number} lifeTime - The lifetime of the token in seconds.
   * @return {string}
   * @private
   */
  _generateToken (payload, privateKey, lifeTime)
  {
    if (!_.isPlainObject(payload) ||
        !_.isString(privateKey) || !utility.isInitialized(privateKey) ||
        !_.isInteger(lifeTime) || lifeTime <= 0)
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    return jwt.sign(
      {data: payload},
      privateKey,
      {
        algorithm: "HS512",
        expiresIn: lifeTime
      }
    );
  }

  /**
   * Verifies and decodes the token.
   *
   * @param {string} encodedToken - The encoded token.
   * @param {string} privateKey - Private key to be used to decode token.
   * @return {string} - The decoded token.
   * @private
   */
  _verifyAndDecodeToken (encodedToken, privateKey)
  {
    if (!_.isString(encodedToken) ||
        !_.isString(privateKey) || !utility.isInitialized(privateKey))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    return jwt.verify(encodedToken, privateKey);
  }
}

module.exports = AuthController;
