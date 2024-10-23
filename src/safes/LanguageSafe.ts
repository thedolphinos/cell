/*
 * Code Review: ✓
 * Test Cases: ✗
 * Guidelines - Imports: ✓
 * Guidelines - Comments: ✓
 */

import Safe from "../core/Safe";

/**
 * Stores the languages of the framework.
 *
 * This is expected to be set by the developer in the init interceptor if multilingual schemas will be used.
 */

export type LanguageData = Array<string>;

class LanguageSafe extends Safe
{
    protected data: LanguageData | undefined;
}

export default LanguageSafe;
