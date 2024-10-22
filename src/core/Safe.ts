/*
 * Code Review: ✓
 * Test Cases: ✗
 * Guidelines - Imports: ✓
 * Guidelines - Comments: ✓
 */

import {isExist, isInitialized} from "@thedolphinos/utility4js";

/**
 * The framework's data storage mechanism.
 *
 * This implements a singleton pattern, ensuring that only one instance of the class can exist at any time.
 * It provides a global point of access to this instance and allows storing and retrieving data in a thread-safe manner.
 */

class Safe
{
    protected static instance: Safe;

    protected data: any;

    protected constructor () {}

    protected static getInstance (): Safe
    {
        if (!isExist(Safe.instance))
        {
            Safe.instance = new Safe();
        }

        return Safe.instance;
    }

    public static getData (): any
    {
        const safe: Safe = Safe.getInstance();
        return safe.data;
    }

    public static setData (value: any): void
    {
        const safe: Safe = Safe.getInstance();
        safe.data = value;
    }
}

export default Safe;
