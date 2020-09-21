"use strict";

const Safe = require("../core/Safe");

/**
 * Stores databases of the database connection.
 */
class DbSafe extends Safe
{
}

module.exports = Object.freeze(new DbSafe());
