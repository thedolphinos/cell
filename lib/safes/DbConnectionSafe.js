"use strict";

const SingularSafe = require("../core/SingularSafe");

/**
 * Stores the database connection of the framework.
 *
 * @since 0.8.0
 */
class DbConnectionSafe extends SingularSafe
{
}

module.exports = Object.freeze(new DbConnectionSafe());
