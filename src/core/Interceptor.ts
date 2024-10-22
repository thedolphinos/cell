/*
 * Code Review: ✓
 * Test Cases: ✗
 * Guidelines - Imports: ✓
 * Guidelines - Comments: ✗
 */

import _ from "lodash";

import {InvalidArgumentsError} from "@thedolphinos/error4js";

import Validator from "../helpers/Validator";

class Interceptor
{
    private readonly asyncInterceptorFunction: any;

    constructor (path: string)
    {
        try
        {
            Validator.validateFilePath(path);
        }
        catch (error: any)
        {
            throw new InvalidArgumentsError({"code": "UNASSIGNED", "message": {"en": error.message}});
        }

        const asyncInterceptorFunction: Function = require(path);

        if (!_.isFunction(asyncInterceptorFunction))
        {
            throw new InvalidArgumentsError({"code": "UNASSIGNED", "message": {"en": "Path does not export a function."}});
        }

        this.asyncInterceptorFunction = asyncInterceptorFunction;
    }

    /**
     * Executes the async interception function with provided arguments.
     */
    async intercept (...args: any[]): Promise<void>
    {
        await this.asyncInterceptorFunction(...args);
    }
}

export = Interceptor;
