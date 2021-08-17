const {
  InvalidArgumentsError,
  StaticClassInstantiationError
} = require("@thedolphinos/error4js");

const _ = require("lodash");

const ErrorSafe = require("../safes/ErrorSafe");
const ApplicationService = require("../services/ApplicationService");

/**
 * Validates function/method parameters.
 * Must be used as a static Class.
 */
class Validator
{
  /**
   * Static classes must not be instantiated.
   */
  constructor ()
  {
    throw new StaticClassInstantiationError("SessionManager");
  }

  /**
   * @param {Array<{pathParameter: string, localProperty: string, applicationService: ApplicationService}>} parentRoutes
   */
  static validateParentRoutes (parentRoutes)
  {
    if (!_.isArray(parentRoutes))
    {
      throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
    }

    for (const parentRoute of parentRoutes)
    {
      if (!_.isString(parentRoute.pathParameter) ||
          !_.isString(parentRoute.localProperty) ||
          !(parentRoute.applicationService instanceof ApplicationService))
      {
        throw new InvalidArgumentsError(ErrorSafe.get().DEV_1);
      }
    }
  }
}

module.exports = Validator;
