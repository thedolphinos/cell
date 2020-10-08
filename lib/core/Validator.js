const {InvalidArgumentsError, StaticClassInstantiationError} = require("@thedolphinos/error4js");
const utility = require("@thedolphinos/utility4js");
const _ = require("lodash");

const ApplicationService = require("../services/ApplicationService");

/**
 * Validates function/method parameters.
 * Must be used as a static class.
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
      throw new InvalidArgumentsError();
    }

    for (const parentRoute of parentRoutes)
    {
      if (!_.isString(parentRoute.pathParameter) ||
          !_.isString(parentRoute.localProperty) ||
          !(parentRoute.applicationService instanceof ApplicationService))
      {
        throw new InvalidArgumentsError();
      }
    }
  }
}

module.exports = Validator;
