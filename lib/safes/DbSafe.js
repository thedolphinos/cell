"use strict";

const Safe = require("../core/Safe");

/**
 * Stores databases of the database connection.
 *
 * @since 0.4.0
 */
class DbSafe extends Safe
{
}

module.exports = Object.freeze(new DbSafe());
