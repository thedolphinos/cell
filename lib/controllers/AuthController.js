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

const SessionManager = require("../db/SessionManager");
const ApplicationService = require("../services/ApplicationService");
const Controller = require("../core/Controller");

/**
 * Contains generic methods for authentication.
 */
class AuthController extends Controller
{
  /**
   * @param {ApplicationService} applicationService
   * @param {Object} [options]
   * @param {number} [options.maxAllowedInvalidLoginAttempts]
   * @param {number} [options.tokenLifetime]
   * @param {string} options.tokenSecret
   * @param {string} options.propertyNameOfUniqueIdentifier
   * @param {string} options.propertyNameOfPassword
   */
  constructor (applicationService, options = undefined)
  {
    if (!_.isPlainObject(options))
    {
      throw new InvalidArgumentsError();
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
      throw new InvalidArgumentsError();
    }

    super();

    this._applicationService = applicationService;

    this._maxInvalidLoginAttempts = options.maxAllowedInvalidLoginAttempts;
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
        throw new BadRequestError();
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
                                    throw new ForbiddenError({en: "The account is already exist."});
                                  }

                                  body.auth = {
                                    isBlocked: false,
                                    numberOfFailedLoginAttempts: 0
                                  };
                                  body[this._propertyNameOfPassword] = await bcrypt.hash(password, await bcrypt.genSalt(10));

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
        throw new BadRequestError({en: "Login credentials are missing."});
      }

      const query = {};
      query[this._propertyNameOfUniqueIdentifier] = uniqueIdentifier;

      let data;
      let error;
      const session = SessionManager.startSession();
      await SessionManager.exec(async () =>
                                {
                                  let account = await this._applicationService.readOne(query, session, {bearer: hooks.bearer});

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
                                      throw new AccountBlockedError();
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

      const headers = this._extractHeaders(request, allowedProperties.headers);
      utility.isExist(hooks.headers) ? await hooks.headers(headers) : undefined;

      if (!utility.isExist(request.locals))
      {
        request.locals = {};
      }

      if (!utility.isExist(headers.authorization))
      {
        throw new UnauthorizedError({en: "Authorization data is missing."});
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

      const account = await this._applicationService.readOneById(decodedToken.data._account, undefined, {bearer: hooks.bearer});

      // check if the account is exist.
      if (!utility.isExist(account))
      {
        throw new UnauthorizedError();
      }

      // check if the account is blocked.
      if (account.auth.isBlocked)
      {
        throw new UnauthorizedError({en: "Account is blocked."});
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
      throw new InvalidArgumentsError();
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
      throw new InvalidArgumentsError();
    }

    return jwt.verify(encodedToken, this._tokenSecret);
  }
}

module.exports = AuthController;
