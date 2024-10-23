/*
 * Code Review: ✓
 * Test Cases: ✗
 * Guidelines - Imports: ✓
 * Guidelines - Comments: ✓
 */

import _ from "lodash";
import {ClientSession, Document} from "mongodb";
import mongoDotNotation from "mongo-dot-notation";

import {isExist, init} from "@thedolphinos/utility4js";
import {InvalidArgumentsError} from "@thedolphinos/error4js";

import ErrorSafe from "../safes/ErrorSafe";
import SessionManager from "../db/SessionManager";
import BsonType from "../db/BsonType";
import Schema from "../db/Schema";
import DbOperation from "../db/DbOperation";
import Service from "../core/Service";

/**
 * Encapsulates DB operations, providing necessary abstractions using convert and adapt methods.
 * Uses a DB operation to communicate with MongoDB. The DB operation is either provided or created from a provided schema.
 */

export interface Options
{
    schema?: Schema;
    dbOperation?: DbOperation;
    persona?: string;
}

export interface CountHooks
{
    bearer?: any;
    query?: (query: any) => Promise<void>;
    options?: (options?: any) => Promise<void>;
    before?: (query: any, options?: any) => Promise<void>;
    after?: (count: number) => Promise<void>;
}

export interface ReadHooks
{
    bearer?: any;
    query?: (query: any) => Promise<void>;
    options?: (options?: any) => Promise<void>;
    before?: (query: any, options?: any, session?: ClientSession) => Promise<void>;
    after?: (documents: Array<Document>, session?: ClientSession) => Promise<void>;
    isSessionEnabled?: boolean;
}

export interface ReadOneHooks
{
    bearer?: any;
    query?: (query: any) => Promise<void>;
    options?: (options?: any) => Promise<void>;
    before?: (query: any, options?: any, session?: ClientSession) => Promise<void>;
    after?: (document: Document | null, session?: ClientSession) => Promise<void>;
    isSessionEnabled?: boolean;
}

export interface CreateOneHooks
{
    bearer?: any;
    documentCandidate?: (documentCandidate: any) => Promise<void>;
    options?: (options?: any) => Promise<void>;
    before?: (documentCandidate: any, options?: any, session?: ClientSession) => Promise<void>;
    after?: (document: Document, session?: ClientSession) => Promise<void>;
    isSessionEnabled?: boolean;
}

export interface UpdateOneHooks
{
    bearer?: any;
    query?: (query: any) => Promise<void>;
    documentCandidate?: (documentCandidate: any) => Promise<void>;
    options?: (options?: any) => Promise<void>;
    before?: (query: any, documentCandidate: any, options?: any, session?: ClientSession) => Promise<void>;
    after?: (document: Document | null, session?: ClientSession) => Promise<void>;
    isSessionEnabled?: boolean;
}

export interface ReplaceOneHooks
{
    bearer?: any;
    query?: (query: any) => Promise<void>;
    documentCandidate?: (documentCandidate: any) => Promise<void>;
    options?: (options?: any) => Promise<void>;
    before?: (query: any, documentCandidate: any, options?: any, session?: ClientSession) => Promise<void>;
    after?: (document: Document | null, session?: ClientSession) => Promise<void>;
    isSessionEnabled?: boolean;
}

export interface DeleteOneHooks
{
    bearer?: any;
    query?: (query: any) => Promise<void>;
    options?: (options?: any) => Promise<void>;
    before?: (query: any, options?: any, session?: ClientSession) => Promise<void>;
    after?: (document: Document | null, session?: ClientSession) => Promise<void>;
    isSessionEnabled?: boolean;
}

class DbService extends Service
{
    public readonly dbOperation: DbOperation;

    constructor (options: Options)
    {
        super(Service.LAYER.DB, options.persona);

        if (isExist(options.schema) && !isExist(options.dbOperation))
        {
            this.dbOperation = new DbOperation(options.schema);
        }
        else if (!isExist(options.schema) && isExist(options.dbOperation))
        {
            this.dbOperation = options.dbOperation;
        }
        else
        {
            throw new InvalidArgumentsError(ErrorSafe.getData().DEV_1);
        }
    }

    public async count (query: any, options?: any, hooks?: CountHooks): Promise<number>
    {
        options = init(options, {});
        hooks = init(hooks, {});
        hooks.bearer = init(hooks.bearer, {});

        query = this.validateAndConvertCandidate(query, this.dbOperation.schema.definition);
        query = this.adaptQueryToRead(query);

        isExist(hooks.query) ? await hooks.query(query) : undefined;
        isExist(hooks.options) ? await hooks.options(options) : undefined;

        isExist(hooks.before) ? await hooks.before(query, options) : undefined;
        const count = await this.dbOperation.count(query, options);
        isExist(hooks.after) ? await hooks.after(count) : undefined;

        return count;
    }

    public async read (query: any, options?: any, hooks?: ReadHooks): Promise<Array<Document>>
    {
        options = init(options, {});
        hooks = init(hooks, {});
        hooks.bearer = init(hooks.bearer, {});

        query = this.validateAndConvertCandidate(query, this.dbOperation.schema.definition);
        query = this.adaptQueryToRead(query);

        isExist(hooks.query) ? await hooks.query(query) : undefined;
        isExist(hooks.options) ? await hooks.options(options) : undefined;

        let documents: Array<Document> = [];
        const {session, internalSession} = SessionManager.generateSession(options.session, hooks.isSessionEnabled);
        await SessionManager.exec(
            async () =>
            {
                isExist(hooks.before) ? await hooks.before(query, options, session) : undefined;
                documents = await this.dbOperation.read(query, {...options, session});
                isExist(hooks.after) ? await hooks.after(documents, session) : undefined;
            },
            options.session,
            internalSession
        );

        return documents;
    }

    public async readOne (query: any, options?: any, hooks?: ReadOneHooks): Promise<Document | null>
    {
        options = init(options, {});
        hooks = init(hooks, {});
        hooks.bearer = init(hooks.bearer, {});

        query = this.validateAndConvertCandidate(query, this.dbOperation.schema.definition);
        query = this.adaptQueryToRead(query);

        isExist(hooks.query) ? await hooks.query(query) : undefined;
        isExist(hooks.options) ? await hooks.options(options) : undefined;

        let document: Document | null = null;
        const {session, internalSession} = SessionManager.generateSession(options.session, hooks.isSessionEnabled);
        await SessionManager.exec(
            async () =>
            {
                isExist(hooks.before) ? await hooks.before(query, options, session) : undefined;
                document = await this.dbOperation.readOne(query, {...options, session});
                isExist(hooks.after) ? await hooks.after(document, session) : undefined;
            },
            options.session,
            internalSession
        );

        return document;
    }

    public async createOne (documentCandidate: any, options?: any, hooks?: CreateOneHooks): Promise<Document>
    {
        options = init(options, {});
        hooks = init(hooks, {});
        hooks.bearer = init(hooks.bearer, {});

        documentCandidate = this.validateAndConvertCandidate(documentCandidate, this.dbOperation.schema.definition);

        isExist(hooks.documentCandidate) ? await hooks.documentCandidate(documentCandidate) : undefined;
        isExist(hooks.options) ? await hooks.options(options) : undefined;

        let document: Document;
        const {session, internalSession} = SessionManager.generateSession(options.session, hooks.isSessionEnabled);
        await SessionManager.exec(
            async () =>
            {
                isExist(hooks.before) ? await hooks.before(documentCandidate, options, session) : undefined;
                document = await this.dbOperation.createOne(documentCandidate, {...options, session});
                isExist(hooks.after) ? await hooks.after(document, session) : undefined;
            },
            options.session,
            internalSession
        );

        // @ts-ignore
        return document;
    }

    public async updateOne (query: any, documentCandidate: any, options?: any, hooks?: UpdateOneHooks): Promise<Document | null>
    {
        options = init(options, {});
        hooks = init(hooks, {});
        hooks.bearer = init(hooks.bearer, {});

        query = this.validateAndConvertCandidate(query, this.dbOperation.schema.definition);
        documentCandidate = this.validateAndConvertCandidate(documentCandidate, this.dbOperation.schema.definition);
        documentCandidate = this.adaptDocumentCandidateToUpdate(documentCandidate);

        isExist(hooks.query) ? await hooks.query(query) : undefined;
        isExist(hooks.documentCandidate) ? await hooks.documentCandidate(documentCandidate) : undefined;
        isExist(hooks.options) ? await hooks.options(options) : undefined;

        let document: Document | null = null;
        const {session, internalSession} = SessionManager.generateSession(options.session, hooks.isSessionEnabled);
        await SessionManager.exec(
            async () =>
            {
                isExist(hooks.before) ? await hooks.before(query, options, documentCandidate, session) : undefined;
                document = await this.dbOperation.updateOne(query, documentCandidate, {...options, returnDocument: "after", session});
                isExist(hooks.after) ? await hooks.after(document, session) : undefined;
            },
            options.session,
            internalSession
        );

        return document;
    }

    public async replaceOne (query: any, documentCandidate: any, options?: any, hooks?: ReplaceOneHooks)
    {
        options = init(options, {});
        hooks = init(hooks, {});
        hooks.bearer = init(hooks.bearer, {});

        query = this.validateAndConvertCandidate(query, this.dbOperation.schema.definition);
        documentCandidate = this.validateAndConvertCandidate(documentCandidate, this.dbOperation.schema.definition);

        isExist(hooks.query) ? await hooks.query(query) : undefined;
        isExist(hooks.documentCandidate) ? await hooks.documentCandidate(documentCandidate) : undefined;
        isExist(hooks.options) ? await hooks.options(options) : undefined;

        let document: Document | null = null;
        const {session, internalSession} = SessionManager.generateSession(options.session, hooks.isSessionEnabled);
        await SessionManager.exec(
            async () =>
            {
                isExist(hooks.before) ? await hooks.before(query, options, documentCandidate, session) : undefined;
                document = await this.dbOperation.replaceOne(query, documentCandidate, {...options, returnDocument: "after", session});
                isExist(hooks.after) ? await hooks.after(document, session) : undefined;
            },
            options.session,
            internalSession
        );

        return document;
    }

    public async deleteOne (query: any, options?: any, hooks?: DeleteOneHooks): Promise<Document | null>
    {
        options = init(options, {});
        hooks = init(hooks, {});
        hooks.bearer = init(hooks.bearer, {});

        query = this.validateAndConvertCandidate(query, this.dbOperation.schema.definition, undefined);

        isExist(hooks.query) ? await hooks.query(query) : undefined;
        isExist(hooks.options) ? await hooks.options(options) : undefined;

        let document: Document | null = null;
        const {session, internalSession} = SessionManager.generateSession(options.session, hooks.isSessionEnabled);
        await SessionManager.exec(
            async () =>
            {
                isExist(hooks.before) ? await hooks.before(query, options, session) : undefined;
                document = await this.dbOperation.deleteOne(query, {...options, session});
                isExist(hooks.after) ? await hooks.after(document, session) : undefined;
            },
            options.session,
            internalSession
        );

        return document;
    }

    /**
     * Adapts query to MongoDB's read operation.
     * Converts the specified query from object notation to dot notation.
     */
    private adaptQueryToRead (query: any): any
    {
        let convertedQuery: any = mongoDotNotation.flatten(query);
        convertedQuery = isExist(convertedQuery.$set) ? convertedQuery.$set : {}; // This comes from `mongoDotNotation.flatten`.

        for (const key in convertedQuery)
        {
            if (key.endsWith(".$regex")) // Means the field is sent for regex search purposes.
            {
                const newKey = key.replace(".$regex", "");
                const value = _.cloneDeep(convertedQuery[key]); // To lose reference.
                convertedQuery[newKey] = {$regex: value, $options: "i"};
                delete convertedQuery[key];
            }
        }

        return convertedQuery;
    }

    /**
     * Adapts document candidate to MongoDB's update operation.
     * Converts the specified document candidate from object notation to dot notation.
     * If a key is provided without a value, prepares it for unset operation.
     */
    private adaptDocumentCandidateToUpdate (documentCandidate: any): any
    {
        let convertedDocumentCandidate: any = mongoDotNotation.flatten(documentCandidate);
        convertedDocumentCandidate = convertedDocumentCandidate.$set; // This comes from `mongoDotNotation.flatten`.

        for (const key in convertedDocumentCandidate)
        {
            if (!isExist(convertedDocumentCandidate[key])) // Means the field is sent for deletion.
            {
                convertedDocumentCandidate[key] = mongoDotNotation.$unset();
            }
        }

        return mongoDotNotation.flatten(convertedDocumentCandidate);
    }

    /**
     * Checks if the specified definition is forbidden for the set persona or not.
     */
    private isForbiddenForPersona (definition: any): boolean
    {
        if (!isExist(definition.forbiddenForPersonas))
        {
            return false;
        }

        if (definition.forbiddenForPersonas === Schema.FORBIDDEN_FOR_ALL_PERSONAS)
        {
            return true;
        }

        return definition.forbiddenForPersonas.includes(this.persona);
    }

    public removeForbiddenProperties (document: any): void
    {
        if (isExist(this.persona))
        {
            if (isExist(this.dbOperation.schema.definition))
            {
                this.removeForbiddenPropertiesForObject(document, this.dbOperation.schema.definition);
            }
        }
    }

    /**
     * Removes the forbidden properties of the set persona from the specified object according to the specified definition.
     *
     * This works on reference.
     */
    private removeForbiddenPropertiesForObject (object: any, definition: any): void
    {
        const isDefinitionForbiddenForPersona = this.isForbiddenForPersona(definition);

        for (const key in object)
        {
            const value: any = object[key];
            const propertyDefinition: any = definition.properties[key];

            let isRemoved: boolean = false;

            if (isExist(propertyDefinition)) // Checking this since the document may have a property that is not defined in the schema (maybe previously defined in the schema and then removed from it but remained in the DB).
            {
                if (isDefinitionForbiddenForPersona || this.isForbiddenForPersona(propertyDefinition))
                {
                    delete object[key];
                    isRemoved = true;
                }

                switch (Schema.identifyDefinitionBsonType(propertyDefinition))
                {
                    case BsonType.Boolean:
                    case BsonType.Int:
                    case BsonType.Double:
                    case BsonType.String:
                    case BsonType.ObjectId:
                    case BsonType.Date:
                    {
                        // Already removed, if forbidden.
                        break;
                    }
                    case BsonType.Object:
                    {
                        if (!isRemoved)
                        {
                            this.removeForbiddenPropertiesForObject(value, propertyDefinition);
                        }

                        break;
                    }
                    case BsonType.Array:
                    {
                        if (!isRemoved)
                        {
                            this.removeForbiddenPropertiesForArray(value, propertyDefinition);
                        }

                        break;
                    }
                    default:
                    {
                        // If the BSON type is not specified, leave the value as is.
                    }
                }
            }
        }
    }

    /**
     * Removes the forbidden properties of the set persona from the specified array according to the specified definition.
     * *
     * This works on reference.
     */
    private removeForbiddenPropertiesForArray (array: Array<any>, definition: any): void
    {
        for (let i = 0; i < array.length; i++)
        {
            const element: any = array[i];
            const propertyDefinition: any = definition.items;

            let isRemoved: boolean = false;

            if (isExist(propertyDefinition)) // Checking this since the document may have a property that is not defined in the schema (maybe previously defined in the schema and then removed from it but remained in the DB).
            {
                if (this.isForbiddenForPersona(propertyDefinition))
                {
                    array.splice(i, 1);
                    i--;
                    isRemoved = true;
                }

                switch (Schema.identifyDefinitionBsonType(definition.items))
                {
                    case BsonType.Boolean:
                    case BsonType.Int:
                    case BsonType.Double:
                    case BsonType.String:
                    case BsonType.ObjectId:
                    case BsonType.Date:
                    {
                        // Already removed, if forbidden.
                        break;
                    }
                    case BsonType.Object:
                    {
                        if (!isRemoved)
                        {
                            this.removeForbiddenPropertiesForObject(element, propertyDefinition);
                        }

                        break;
                    }
                    case BsonType.Array:
                    {
                        if (!isRemoved)
                        {
                            this.removeForbiddenPropertiesForObject(element, propertyDefinition);
                        }

                        break;
                    }
                }
            }
        }
    }
}

export default DbService;
