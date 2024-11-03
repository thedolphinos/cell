/*
 * Code Review: ✓
 * Test Cases: ✗
 * Guidelines - Imports: ✓
 * Guidelines - Comments: ✓
 */

/**
 * The framework's data storage mechanism.
 *
 * This implements a singleton pattern, ensuring that only one instance of the class can exist at any time.
 * It provides a global point of access to this instance and allows storing and retrieving data in a thread-safe manner.
 */

class Safe
{
    private static instances: Map<new () => Safe, Safe> = new Map();

    protected data: any;

    constructor () {}

    private static getInstance<T extends Safe> (this: new () => T): T
    {
        if (!Safe.instances.has(this))
        {
            Safe.instances.set(this, new this());
        }

        return Safe.instances.get(this) as T;
    }

    public static getData (): any
    {
        const instance: Safe = this.getInstance();
        return instance.data;
    }

    public static setData (value: any): void
    {
        const instance: Safe = this.getInstance();
        instance.data = value;
    }
}

export default Safe;
