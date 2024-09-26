const SingularSafe = require("../core/SingularSafe");

/**
 * Stores the database connection of the framework.
 */
class DbConnectionSafe extends SingularSafe
{
}

module.exports = Object.freeze(new DbConnectionSafe());
