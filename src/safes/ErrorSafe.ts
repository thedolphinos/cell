/*
 * Code Review: ✓
 * Test Cases: ✗
 * Guidelines - Imports: ✓
 * Guidelines - Comments: ✓
 */

import Safe from "../core/Safe";

/**
 * Stores the error data of the framework.
 *
 * Errors are first initialized with data from the error4js library.
 * Then, they are updated with the framework's error data.
 * Finally, they are updated with the custom error data from the configuration.
 *
 * This is set in Cell.run.
 */

export interface ErrorData
{
    [error: string]: {
        code: string;
        message: {
            [language: string]: string;
        };
        statusCode?: number;
    };
}

class ErrorSafe extends Safe
{
    protected data: ErrorData | undefined;
}

export default ErrorSafe;
