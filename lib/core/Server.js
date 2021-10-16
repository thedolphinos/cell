const http = require("http");
const https = require("https");

const {InvalidArgumentsError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");

const _ = require("lodash");

const Logger = require("./Logger");
const ErrorSafe = require("../safes/ErrorSafe");

/**
 * Contains the server logic of the framework.
 */
class Server
{
  /**
   * Creates a server instance.
   *
   * @param {Function} requestListener
   * @param {Object} options
   * @param {Object} options.http
   * @param {boolean} options.http.isEnabled
   * @param {Object} [options.http.config]
   * @param {number} options.http.config.port
   * @param {Object} options.https
   * @param {boolean} options.https.isEnabled
   * @param {Object} [options.https.config]
   * @param {number} options.https.config.port
   * @param {Object} options.https.config.sslTlsCertificate
   * @param {string} options.https.config.sslTlsCertificate.key
   * @param {string} options.https.config.sslTlsCertificate.cert
   * @param {string} options.https.config.sslTlsCertificate.ca
   */
  constructor (requestListener, options = Server.DEFAULT_OPTIONS)
  {
    this._validateConstructorParams(requestListener, options);

    this._http = undefined;
    this._https = undefined;
    this._requestListener = requestListener;
    this._options = options;
  }

  /**
   * Creates HTTP and/or HTTPS server(s).
   *
   * @return {Promise<void>}
   */
  async create ()
  {
    Logger.info("Trying to create the server...");

    if (this._options.http.isEnabled)
    {
      this._http = await http.createServer(null, this._requestListener);
      this._http.on("listening", this._onListening);
      this._http.on("close", this._onClose);
      this._http.listen(this._options.http.config.port);
    }

    if (this._options.https.isEnabled)
    {
      this._https = await https.createServer(this._options.https.config.sslTlsCertificate, this._requestListener);
      this._https.on("listening", this._onListening);
      this._https.on("close", this._onClose);
      this._https.listen(this._options.https.config.port);
    }
  }

  /**
   * Closes the created HTTP and/or HTTPS server(s).
   *
   * @return {Promise<void>}
   */
  async close ()
  {
    Logger.info("Trying to close the server...");

    try
    {
      const promises = [];

      if (this._options.http.isEnabled)
      {
        promises.push(utility.toPromise(this._http.close.bind(this._http))());
      }

      if (this._options.https.isEnabled)
      {
        promises.push(utility.toPromise(this._https.close.bind(this._https))());
      }

      await Promise.all(promises);
    }
    catch (error)
    {
      Logger.error(error);
    }
  }

  /**
   * Event listener for the `listening` event.
   *
   * @private
   */
  _onListening ()
  {
    Logger.info(`The server is listening on port ${this.address().port}.`);
  };

  /**
   * Event listener for the `close` event.
   *
   * @private
   */
  _onClose ()
  {
    Logger.info("The server is closed.");
  };

  /* VARIABLES */
  static DEFAULT_OPTIONS = {
    http: {
      isEnabled: true,
      config: {
        port: 80
      }
    },
    https: {
      isEnabled: false
    }
  };

  /* VALIDATE PARAMS */
  /**
   * Validates the parameters of the constructor method.
   *
   * @param {Function} requestListener
   * @param {Object} options
   * @private
   */
  _validateConstructorParams (requestListener, options)
  {
    if (!_.isFunction(requestListener) ||
        !Server._isValidOptions(options))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }
  }

  /**
   * Checks if the specified options are valid.
   *
   * @param {Object} options
   * @return {boolean}
   * @private
   */
  static _isValidOptions (options)
  {
    if (!_.isPlainObject(options) ||
        !_.isPlainObject(options.http) ||
        !_.isBoolean(options.http.isEnabled) ||
        (options.http.isEnabled && !_.isPlainObject(options.http.config)) ||
        (utility.isExist(options.http.config) && !_.isPlainObject(options.http.config)) ||
        !_.isPlainObject(options.https) ||
        !_.isBoolean(options.https.isEnabled) ||
        (options.https.isEnabled && !_.isPlainObject(options.https.config)) ||
        (utility.isExist(options.https.config) && !_.isPlainObject(options.https.config)))
    {
      return false;
    }

    const httpConfig = options.http.config;

    if (utility.isExist(httpConfig) &&
        httpConfig.isEnabled &&
        !utility.isValidNumber(httpConfig.port))
    {
      return false;
    }

    const httpsConfig = options.https.config;

    if (utility.isExist(httpsConfig) &&
        httpsConfig.isEnabled &&
        (!utility.isValidNumber(httpsConfig.port) ||
         !_.isPlainObject(httpsConfig.sslTlsCertificate) ||
         !_.isString(httpsConfig.sslTlsCertificate.key) ||
         !_.isString(httpsConfig.sslTlsCertificate.cert) ||
         !_.isString(httpsConfig.sslTlsCertificate.ca)))
    {
      return false;
    }

    return true;
  }
}

module.exports = Server;
