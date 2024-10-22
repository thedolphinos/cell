/*
 * Code Review: ✓
 * Test Cases: ✗
 * Guidelines - Imports: ✓
 * Guidelines - Comments: ✗
 */

import {toUTCDateString} from "@thedolphinos/utility4js";

class Logger
{
    private static isEnabled: boolean = false;
    private static level: number; // TODO: when refactored logs, 9 is set to all logs. Review them some time.

    private constructor () {}

    private static isLoggable (level: number): boolean
    {
        return level <= Logger.level;
    }

    private static generateMessage (message: string): string
    {
        return `${toUTCDateString()}: ${message}`;
    }

    public static enable (level: number): void
    {
        Logger.isEnabled = true;
        Logger.level = level;
    }

    public static info (message: string, level: number): void
    {
        if (!Logger.isEnabled)
        {
            return;
        }

        if (Logger.isLoggable(level))
        {
            console.info(Logger.generateMessage(message));
        }
    }

    public static warn (message: string, level: number): void
    {
        if (!Logger.isEnabled)
        {
            return;
        }

        if (Logger.isLoggable(level))
        {
            console.warn(Logger.generateMessage(message));
        }
    }

    public static error (message: string, level: number): void
    {
        if (!Logger.isEnabled)
        {
            return;
        }

        if (Logger.isLoggable(level))
        {
            console.error(Logger.generateMessage(message));
        }
    }
}

export default Logger;
