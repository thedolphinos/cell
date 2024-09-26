const {StaticClassInstantiationError} = require("@thedolphinos/error4js");

/**
 * Contains BSON types for schema definitions.
 * See: https://docs.mongodb.com/manual/reference/bson-types/
 */
class BsonType
{
    /**
     * Static classes must not be instantiated.
     */
    constructor ()
    {
        throw new StaticClassInstantiationError("BsonType");
    }

    /**
     * Gets the BSON type alias of boolean.
     *
     * @returns {string}
     */
    static get Boolean ()
    {
        return "bool";
    }

    /**
     * Gets the BSON type alias of 32-bit integer number.
     *
     * @returns {string}
     */
    static get Int ()
    {
        return "int";
    }

    /**
     * Gets the BSON type alias of 64-bit IEEE 754-2008 binary floating point number.
     *
     * @returns {string}
     */
    static get Double ()
    {
        return "double";
    }

    /**
     * Gets the BSON type alias of UTF-8 encoded string.
     *
     * @returns {string}
     */
    static get String ()
    {
        return "string";
    }

    /**
     * Gets the BSON type alias of small, likely unique, fast to generate, and ordered IDs.
     * It is 12 bytes in length,
     *   - a 4-byte timestamp value, representing the ObjectId’s creation, measured in seconds since the Unix epoch
     *   - a 5-byte random value
     *   - a 3-byte incrementing counter, initialized to a random value
     *
     * @returns {string}
     */
    static get ObjectId ()
    {
        return "objectId";
    }

    /**
     * Gets the BSON type alias of 64-bit integer number, representing Epoch time.
     *
     * @returns {string}
     */
    static get Date ()
    {
        return "date";
    }

    /**
     * Gets the BSON type alias of object.
     *
     * @returns {string}
     */
    static get Object ()
    {
        return "object";
    }

    /**
     * Gets the BSON type alias of array.
     *
     * @returns {string}
     */
    static get Array ()
    {
        return "array";
    }
}

module.exports = BsonType;
