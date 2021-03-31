const {
  InvalidArgumentsError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  InvalidCredentialsError,
  InvalidTokenError,
  TokenExpiredError,
  AccountBlockedError
} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const Controller = require("../core/Controller");
const ErrorSafe = require("../safes/ErrorSafe");
const SessionManager = require("../db/SessionManager");
const ApplicationService = require("../services/ApplicationService");

/**
 * Contains generic methods for authentication.
 */
class AuthController extends Controller
{
  /**
   * @param {ApplicationService} applicationService
   * @param {Object} [options]
   * @param {number} [options.maxAllowedInvalidLoginAttempts]
   * @param {number} [options.maxAllowedInvalidChangePasswordAttempts]
   * @param {number} [options.tokenLifetime]
   * @param {string} options.tokenSecret
   * @param {string} options.propertyNameOfUniqueIdentifier
   * @param {string} options.propertyNameOfPassword
   */
  constructor (applicationService, options = undefined)
  {
    if (!_.isPlainObject(options))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    options.maxAllowedInvalidLoginAttempts = utility.init(options.maxAllowedInvalidLoginAttempts, 5);
    options.tokenLifetime = utility.init(options.tokenLifetime, 43200); // 12 hours.

    if (!(applicationService instanceof ApplicationService) ||
        !utility.isValidNumber(options.maxAllowedInvalidLoginAttempts) ||
        !utility.isValidNumber(options.tokenLifetime) ||
        !_.isString(options.tokenSecret) ||
        !_.isString(options.propertyNameOfUniqueIdentifier) ||
        !_.isString(options.propertyNameOfPassword))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    super();

    this._applicationService = applicationService;

    this._maxAllowedInvalidLoginAttempts = options.maxAllowedInvalidLoginAttempts;
    this._maxAllowedInvalidChangePasswordAttempts = options.maxAllowedInvalidChangePasswordAttempts;
    this._tokenLifetime = options.tokenLifetime;
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
   * @param {Object} [allowedProperties]
   * @return {Promise<void>}
   */
  async register (request, response, next = undefined, hooks = undefined, allowedProperties = undefined)
  {
    try
    {
      hooks = utility.init(hooks, {});
      allowedProperties = utility.init(allowedProperties, {});
      allowedProperties.body = utility.init(allowedProperties.body, []);

      allowedProperties.body = _.union(allowedProperties.body, [this._propertyNameOfUniqueIdentifier, this._propertyNameOfPassword]);
      let body = this._extractBody(request, allowedProperties.body);

      utility.isExist(hooks.body) ? await hooks.body(body) : undefined;

      const uniqueIdentifier = body[this._propertyNameOfUniqueIdentifier];
      const password = body[this._propertyNameOfPassword];

      if (!_.isString(uniqueIdentifier) ||
          !_.isString(password))
      {
        throw new BadRequestError(ErrorSafe.get().HTTP_21);
      }

      const query = {};
      query[this._propertyNameOfUniqueIdentifier] = uniqueIdentifier;

      let data;
      const session = SessionManager.startSession();
      await SessionManager.exec(async () =>
                                {
                                  let account = await this._applicationService.readOne(query, session);

                                  // check if the account is exist.
                                  if (utility.isExist(account))
                                  {
                                    throw new ForbiddenError(ErrorSafe.get().AUTH_ACCOUNT_EXIST);
                                  }

                                  body.auth = {
                                    isBlocked: false,
                                    numberOfFailedLoginAttempts: 0,
                                    numberOfFailedChangePasswordAttempts: 0
                                  };
                                  body[this._propertyNameOfPassword] = await bcrypt.hash(password, 10);

                                  utility.isExist(hooks.before) ? await hooks.before(body) : undefined;
                                  account = await this._applicationService.createOne(body, session);
                                  utility.isExist(hooks.after) ? await hooks.after(account) : undefined;

                                  const payload = {_account: account._id};
                                  utility.isExist(hooks.payload) ? await hooks.payload(payload, account) : undefined;
                                  const token = this._generateToken(payload);

                                  data = utility.isExist(hooks.data) ? await hooks.data(data) : {
                                    account,
                                    token
                                  };
                                }, undefined, session);

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
   * @param {Object} [allowedProperties]
   * @return {Promise<void>}
   */
  async login (request, response, next = undefined, hooks = undefined, allowedProperties = undefined)
  {
    try
    {
      hooks = utility.init(hooks, {});
      hooks.bearer = utility.init(hooks.bearer, {});
      allowedProperties = utility.init(allowedProperties, {});
      allowedProperties.body = utility.init(allowedProperties.body, []);

      allowedProperties.body = _.union(allowedProperties.body, [this._propertyNameOfUniqueIdentifier, this._propertyNameOfPassword]);
      let body = this._extractBody(request, allowedProperties.body);

      utility.isExist(hooks.body) ? await hooks.body(body) : undefined;

      const uniqueIdentifier = body[this._propertyNameOfUniqueIdentifier];
      const password = body[this._propertyNameOfPassword];

      if (!_.isString(uniqueIdentifier) ||
          !_.isString(password))
      {
        throw new BadRequestError(ErrorSafe.get().AUTH_LOGIN_CREDENTIALS_MISSING);
      }

      const query = {};
      query[this._propertyNameOfUniqueIdentifier] = {
        $regex: `^${_.escapeRegExp(uniqueIdentifier)}$`,
        $options: "i"
      };

      let data;
      let error;
      const session = SessionManager.startSession();
      await SessionManager.exec(async () =>
                                {
                                  let account = await this._applicationService.dbOperation.getNativeOps().findOne(query, {session});

                                  // check if the account is exist.
                                  if (!utility.isExist(account))
                                  {
                                    throw new InvalidCredentialsError(ErrorSafe.get().HTTP_221);
                                  }

                                  // check if the password is correct.
                                  const isPasswordCorrect = await bcrypt.compare(password, account.password);
                                  const newAccountProperties = {auth: {}};

                                  if (!isPasswordCorrect)
                                  {
                                    error = new InvalidCredentialsError(ErrorSafe.get().HTTP_221); // not thrown to increase the number of failed login attempts or block account.

                                    newAccountProperties.auth.numberOfFailedLoginAttempts = account.auth.numberOfFailedLoginAttempts + 1; // if the password is incorrect, the number of failed login attempts must be increased.
                                    newAccountProperties.auth.lastFailedLoginAttempt = new Date(); // if the password is incorrect, the time of the attempt must be recorded.

                                    if (newAccountProperties.auth.numberOfFailedLoginAttempts >= this._maxAllowedInvalidLoginAttempts) // if the max invalid login attempts is changed, for some accounts in database instant number of failed login attempts may be greater than the max invalid login attempts
                                    {
                                      newAccountProperties.auth.isBlocked = true;
                                    }
                                  }
                                  else
                                  {
                                    // check if the account is blocked.
                                    if (account.auth.isBlocked)
                                    {
                                      throw new AccountBlockedError(ErrorSafe.get().HTTP_231);
                                    }

                                    newAccountProperties.auth.numberOfFailedLoginAttempts = 0; // if the password is correct, the number of failed login attempts must be reset.
                                    newAccountProperties.auth.lastSuccessfulLogin = new Date(); // if the password is correct, the time of the login must be recorded.
                                  }

                                  account = await this._applicationService.updateOneByIdAndVersion(account._id, account.version, newAccountProperties, session, {bearer: hooks.bearer});

                                  const payload = {_account: account._id};
                                  utility.isExist(hooks.payload) ? await hooks.payload(payload, account) : undefined;
                                  const token = this._generateToken(payload);

                                  data = utility.isExist(hooks.data) ? await hooks.data(data) : {
                                    account,
                                    token
                                  };
                                }, undefined, session);

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
   * Changes password of the account.
   *
   * @param {Object} request
   * @param {Object} response
   * @param {Function} [next]
   * @param {Object} [hooks]
   * @param {Object} [allowedProperties]
   * @return {Promise<void>}
   */
  async changePassword (request, response, next = undefined, hooks = undefined, allowedProperties = undefined)
  {
    try
    {
      hooks = utility.init(hooks, {});
      hooks.bearer = utility.init(hooks.bearer, {});
      allowedProperties = utility.init(allowedProperties, {});
      allowedProperties.body = utility.init(allowedProperties.body, []);

      const _id = utility.isExist(hooks._id) ? await hooks._id() : undefined;

      const toBeCamelCasedPropertyNameOfPassword = `${this._propertyNameOfPassword.charAt(0).toUpperCase()}${this._propertyNameOfPassword.slice(1)}`;
      const propertyNameOfOldPassword = `old${toBeCamelCasedPropertyNameOfPassword}`;
      const propertyNameOfNewPassword = `new${toBeCamelCasedPropertyNameOfPassword}`;
      allowedProperties.body = _.union(allowedProperties.body, [this._propertyNameOfUniqueIdentifier, propertyNameOfOldPassword, propertyNameOfNewPassword]);
      let body = this._extractBody(request, allowedProperties.body);

      utility.isExist(hooks.body) ? await hooks.body(body) : undefined;

      const oldPassword = body[propertyNameOfOldPassword];
      const newPassword = body[propertyNameOfNewPassword];

      if (!_.isString(oldPassword) ||
          !_.isString(newPassword))
      {
        throw new BadRequestError(ErrorSafe.get().AUTH_LOGIN_CREDENTIALS_MISSING);
      }

      let data;
      let error;
      const session = SessionManager.startSession();
      await SessionManager.exec(async () =>
                                {
                                  let account = await this._applicationService.readOneById(_id, session, {bearer: hooks.bearer});
                                  utility.isExist(hooks.account) ? await hooks.account(account) : undefined;

                                  // check if the account is exist.
                                  if (!utility.isExist(account))
                                  {
                                    throw new InvalidCredentialsError(ErrorSafe.get().HTTP_221);
                                  }

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
                                    }
                                  }
                                  else
                                  {
                                    // check if the account is blocked.
                                    if (account.auth.isBlocked)
                                    {
                                      throw new AccountBlockedError(ErrorSafe.get().HTTP_231);
                                    }

                                    newAccountProperties.auth.numberOfFailedChangePasswordAttempts = 0; // if the password is correct, the number of failed change password attempts must be reset.
                                    newAccountProperties.auth.lastSuccessfulChangePassword = new Date(); // if the password is correct, the time of the change password must be recorded.

                                    newAccountProperties[this._propertyNameOfPassword] = await bcrypt.hash(newPassword, 10);
                                  }

                                  utility.isExist(hooks.before) ? await hooks.before(newAccountProperties, oldPassword, newPassword) : undefined;
                                  account = await this._applicationService.updateOneByIdAndVersion(account._id, account.version, newAccountProperties, session, {bearer: hooks.bearer});
                                  utility.isExist(hooks.after) ? await hooks.after(account) : undefined;

                                  const payload = {_account: account._id};
                                  utility.isExist(hooks.payload) ? await hooks.payload(payload, account) : undefined;
                                  const token = this._generateToken(payload);

                                  data = utility.isExist(hooks.data) ? await hooks.data(data) : {
                                    account,
                                    token
                                  };
                                }, undefined, session);

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
   * @param {Object} [allowedProperties]
   * @return {Promise<void>}
   */
  async verifyPrivate (request, response, next, hooks = undefined, allowedProperties = undefined)
  {
    try
    {
      hooks = utility.init(hooks, {});
      hooks.bearer = utility.init(hooks.bearer, {});
      allowedProperties = utility.init(allowedProperties, {});
      allowedProperties.headers = utility.init(allowedProperties.headers, ["authorization"]);

      const headers = request.headers;
      utility.isExist(hooks.headers) ? await hooks.headers(headers) : undefined;

      if (!utility.isExist(request.locals))
      {
        request.locals = {};
      }

      if (!utility.isExist(headers.authorization))
      {
        throw new UnauthorizedError(ErrorSafe.get().AUTH_DATA_MISSING);
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

      // check if the account is blocked.
      if (account.auth.isBlocked)
      {
        throw new UnauthorizedError(ErrorSafe.get().AUTH_ACCOUNT_BLOCKED);
      }

      request.locals.oldToken = decodedToken.data;
      const payload = {_account: account._id};
      utility.isExist(hooks.payload) ? await hooks.payload(payload, account) : undefined;
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

    return jwt.sign({data: payload}, this._tokenSecret, {expiresIn: this._tokenLifetime});
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
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    return jwt.verify(encodedToken, this._tokenSecret);
  }
}

module.exports = AuthController;
