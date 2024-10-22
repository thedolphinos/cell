/*
 * Code Review: ✓
 * Test Cases: ✗
 * Guidelines - Imports: ✓
 * Guidelines - Comments: ✓
 */

import _ from "lodash";
import {Collection, Db} from "mongodb";

import {isExist, isInitialized, init} from "@thedolphinos/utility4js";
import {DeveloperError} from "@thedolphinos/error4js";

import Logger from "../core/Logger";
import ErrorSafe from "../safes/ErrorSafe";
import LanguageSafe from "../safes/LanguageSafe";
import DbConnectionSafe from "../safes/DbConnectionSafe";
import BsonType from "./BsonType";

/**
 * Defines a schema and represents it on MongoDB.
 * Works as an interface between the framework and a MongoDB collection.
 *
 * Its instance should be used in an application service that represents the same notion.
 */

class Schema
{
    public static readonly FORBIDDEN_FOR_ALL_PERSONAS: string = "*";

    private readonly dbName: string;
    public readonly collectionName: string;

    public readonly definition: any = {}; // https://docs.mongodb.com/manual/reference/operator/query/jsonSchema/

    private readonly isAddCommonProperties: boolean = false; // Controls the addition of the common properties (_id, version, isSoftDeleted, createdAt, updatedAt, softDeletedAt) to the definition.
    public readonly isHistoryEnabled: boolean = false; // Controls the version-based data storage mechanism, where a root document is created to track versions, and a new document connected to the root is created with each change. This allows tracking of all changes made to the document.
    private readonly isValidationEnabled: boolean = true; // Controls MongoDB-level schema validation.

    private readonly db: Db;
    public readonly collection: Collection;

    public readonly rootSchema?: Schema; // When `isHistoryEnabled` is true. Used by root DB service created in application service.

    constructor (dbName: string, collectionName: string, definition?: any, options?: {isAddCommonProperties?: boolean, isHistoryEnabled?: boolean, isValidationEnabled?: boolean})
    {
        this.dbName = dbName;
        this.collectionName = collectionName;

        if (isExist(definition))
        {
            this.definition = definition;
        }

        if (isExist(options?.isAddCommonProperties))
        {
            this.isAddCommonProperties = options.isAddCommonProperties;
        }
        if (isExist(options?.isHistoryEnabled))
        {
            this.isHistoryEnabled = options.isHistoryEnabled;
        }
        if (isExist(options?.isValidationEnabled))
        {
            this.isValidationEnabled = options.isValidationEnabled;
        }

        this.db = DbConnectionSafe.getData().mongoClient.db(dbName);
        this.collection = this.db.collection(collectionName);

        if (this.isAddCommonProperties)
        {
            /*
             * Adds the common properties (_id, version, isSoftDeleted, createdAt, updatedAt, softDeletedAt), overriding them even if already specified in the definition.
             * `updatedAt` is not added if history is enabled, since when documents are not updated.
             * Adds an index to bring documents that are not soft deleted first.
             */

            this.definition.properties = init(this.definition.properties, {});
            this.definition.required = init(this.definition.required, []);

            this.definition.properties._id = {bsonType: BsonType.ObjectId};
            this.definition.required.push("_id");

            this.definition.properties.version = {bsonType: BsonType.Int};
            this.definition.required.push("version");

            this.definition.properties.isSoftDeleted = {
                bsonType: BsonType.Boolean,
                forbiddenForPersonas: [Schema.FORBIDDEN_FOR_ALL_PERSONAS]
            };
            this.definition.required.push("isSoftDeleted");

            this.definition.properties.createdAt = {
                bsonType: BsonType.Date,
                forbiddenForPersonas: [Schema.FORBIDDEN_FOR_ALL_PERSONAS]
            };
            this.definition.required.push("createdAt");

            this.definition.properties.updatedAt = {
                bsonType: BsonType.Date,
                forbiddenForPersonas: [Schema.FORBIDDEN_FOR_ALL_PERSONAS]
            };

            this.definition.properties.softDeletedAt = {
                bsonType: BsonType.Date,
                forbiddenForPersonas: [Schema.FORBIDDEN_FOR_ALL_PERSONAS]
            };

            this.collection.createIndex({isSoftDeleted: 1});
        }

        if (this.isHistoryEnabled)
        {
            /*
             * Adds the necessary common properties (_id, version, createdAt) if adding common properties is not enabled, overriding them even if already specified in the definition.
             * Adds the history properties (isRecent, _root), overriding them even if already specified in the definition.
             * Adds an index to bring documents that are recent first.
             */

            this.definition.properties = init(this.definition.properties, {});
            this.definition.required = init(this.definition.required, []);

            if (!this.isAddCommonProperties)
            {
                this.definition.properties._id = {bsonType: BsonType.ObjectId};
                this.definition.required.push("_id");

                this.definition.properties.version = {bsonType: BsonType.Int};
                this.definition.required.push("version");

                this.definition.properties.createdAt = {
                    bsonType: BsonType.Date,
                    forbiddenForPersonas: [Schema.FORBIDDEN_FOR_ALL_PERSONAS]
                };
                this.definition.required.push("createdAt");
            }

            this.definition.properties.isRecent = {
                bsonType: BsonType.Boolean,
                forbiddenForPersonas: [Schema.FORBIDDEN_FOR_ALL_PERSONAS]
            };
            this.definition.required.push("isRecent");

            this.definition.properties._root = {
                bsonType: BsonType.ObjectId,
                forbiddenForPersonas: [Schema.FORBIDDEN_FOR_ALL_PERSONAS]
            };
            this.definition.required.push("_root");

            this.rootSchema = new Schema(
                dbName,
                `root${collectionName.charAt(0).toUpperCase()}${collectionName.substring(1)}`,
                {
                    bsonType: BsonType.Object,
                    additionalProperties: false,
                    forbiddenForPersonas: Schema.FORBIDDEN_FOR_ALL_PERSONAS
                },
                {
                    isAddCommonProperties: true,
                    isHistoryEnabled: false,
                    isValidationEnabled: true
                }
            );

            this.collection.createIndex({isRecent: -1});
            this.collection.createIndex({_root: 1, version: -1}, {unique: true});
        }

        this.createCollection(); // Developers should be careful when updating the schema definition and running an operation that depends on the schema definition. The realization of the updates on the MongoDB side might take some time, and the constructor cannot be async.
    }

    private async createCollection (): Promise<void>
    {
        const collMod = this.collectionName;
        const validator = this.isValidationEnabled ? {$jsonSchema: this.generateJsonSchema()} : {};
        const validationLevel = this.isValidationEnabled ? "moderate" : "off";

        try
        {
            await this.db.createCollection(collMod, {validator, validationLevel});
        }
        catch (error: any)
        {
            switch (error.code)
            {
                case 48:
                {
                    /*
                     * `NamespaceExists` error occurs when creating a collection with an already-existing name.
                     * It is expected to happen each time Cell runs after the first run.
                     * However, Cell needs to update the collection in case its definition changes.
                     */
                    try
                    {
                        await this.db.command({collMod, validator, validationLevel});
                    }
                    catch (error: any)
                    {
                        switch (error.code)
                        {
                            case 9:
                            {
                                /*
                                 * `FailedToParse`
                                 */
                                throw new DeveloperError(ErrorSafe.getData().DB_INVALID_SCHEMA);
                            }
                            default:
                            {
                                Logger.error(`MongoDB level error is occurred: (CODE ${error.code}) ${error.message} ${error}`, 9);
                            }
                        }
                    }

                    break;
                }
                case 9:
                {
                    /*
                     * `FailedToParse` error occurs when JSON schema is invalid.
                     * This stems from `generateJsonSchema`.
                     * However, if there is no bug in the method, this is highly likely to be an error of developers while coding `definition`.
                     * 
                     * This happens in 2 places, either when directly creating a collection or modifying it when it was already created.
                     */
                    throw new DeveloperError(ErrorSafe.getData().DB_INVALID_SCHEMA);
                }
                default:
                {
                    Logger.error(`MongoDB level error is occurred: (CODE ${error.code}) ${error.message} ${error}`, 9);
                }
            }
        }
    }

    private generateJsonSchema (): any
    {
        const definitionClone = _.cloneDeep(this.definition);
        this.convertDefinitionToJSONSchema(definitionClone);

        return definitionClone;
    }

    /**
     * Converts `definition` to MongoDB's JSON schema by removing framework specific keys (isMultilingual, forbiddenForPersonas).
     *
     * This works on reference.
     */
    private convertDefinitionToJSONSchema (definition: any)
    {
        if (isInitialized(definition))
        {
            const isMultilingual: boolean = init(definition.isMultilingual, false);

            delete definition.isMultilingual;
            delete definition.forbiddenForPersonas;

            switch (Schema.identifyDefinitionBsonType(definition))
            {
                case BsonType.Object:
                {
                    if (isMultilingual)
                    {
                        this.makeDefinitionMultilingual(definition);
                    }

                    for (const property in definition.properties)
                    {
                        const subDefinition: any = definition.properties[property];
                        this.convertDefinitionToJSONSchema(subDefinition);
                    }

                    break;
                }
                case BsonType.Array:
                {
                    this.convertDefinitionToJSONSchema(definition.items);

                    break;
                }
                default:
                {
                    if (isMultilingual)
                    {
                        this.makeDefinitionMultilingual(definition);
                    }
                }
            }
        }
    }

    /**
     * Makes the definition multilingual by using the languages of the language safe.
     * Moves the definition 1 level below by creating language keys above.
     *
     * This works on reference.
     */
    private makeDefinitionMultilingual (definition: any)
    {
        const languages = LanguageSafe.getData();

        if (isInitialized(languages))
        {
            const definitionClone: any = _.cloneDeep(definition);

            // Not to lose reference to the definition.
            for (const key in definition)
            {
                delete definition[key];
            }

            // Put each language under the original definition.
            definition.bsonType = BsonType.Object;
            definition.properties = {};

            for (const language of languages)
            {
                definition.properties[language] = definitionClone;
            }
        }
    }

    /**
     * Identifies the BSON type of the given definition.
     *
     * @example
     * bsonType: "int" -> "int"
     *
     * @example
     * bsonType: ["int", null] -> "int"
     *
     * @example
     * bsonType: ["int", "double"] -> null
     */
    public static identifyDefinitionBsonType (definition: any): string | null
    {
        const bsonType: string | Array<string | null> = definition.bsonType;

        if (_.isString(bsonType))
        {
            return bsonType;
        }

        if (_.isArray(bsonType))
        {
            let identifiedBsonType = null;

            for (const bsonTypeElement of bsonType)
            {
                if (isExist(bsonTypeElement))
                {
                    if (isInitialized(identifiedBsonType))
                    {
                        return null;
                    }

                    identifiedBsonType = bsonTypeElement;
                }
            }

            return identifiedBsonType;
        }

        return null;
    }
}

export default Schema;
