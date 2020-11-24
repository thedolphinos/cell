const utility = require("@thedolphinos/utility4js");
const {Error} = utility;
const {StaticClassInstantiationError} = Error;

class Validator
{
  constructor ()
  {
    throw new StaticClassInstantiationError("Validator");
  }
}

module.exports = Validator;
