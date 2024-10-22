/*
 * Code Review: ✓
 * Test Cases: ✗
 * Guidelines - Imports: ✓
 * Guidelines - Comments: ✓
 */

import Safe from "../core/Safe";
import DbConnection from "../db/DbConnection";

/**
 * Stores the DB connection instance, which is used as a MongoDB client and connects to a cluster.
 *
 * This is set in Cell.run.
 */

class DbConnectionSafe extends Safe
{
    protected data: DbConnection | undefined;
}

export default DbConnectionSafe;
