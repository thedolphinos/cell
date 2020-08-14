"use strict";

const SingularSafe = require("../core/SingularSafe");

/**
 * Stores the db connection.
 *
 * @since 0.8.0
 */
class DbConnectionSafe extends SingularSafe
{
}

module.exports = Object.freeze(new DbConnectionSafe());
