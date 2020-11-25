const {StaticClassInstantiationError} = require("@thedolphinos/error4js");

class Validator
{
  constructor ()
  {
    throw new StaticClassInstantiationError("Validator");
  }
}

module.exports = Validator;
