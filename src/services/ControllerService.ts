/*
 * Code Review: ✓
 * Test Cases: ✗
 * Guidelines - Imports: ✓
 * Guidelines - Comments: ✓
 */

import _ from "lodash";
import {ClientSession, ObjectId, Document} from "mongodb";

import {isExist, isInitialized, init} from "@thedolphinos/utility4js";
import {InvalidArgumentsError, BadRequestError} from "@thedolphinos/error4js";
import {flatten} from "mongo-dot-notation";

import ErrorSafe from "../safes/ErrorSafe";
import LanguageSafe from "../safes/LanguageSafe";
import SessionManager from "../db/SessionManager";
import BsonType from "../db/BsonType";
import Schema from "../db/Schema";
import DbOperation from "../db/DbOperation";
import Service from "../core/Service";
import DbService from "./DbService";
import ApplicationService, {UpdateOneHooks} from "./ApplicationService";

/**
 * Encapsulates an application service, providing necessary abstractions.
 * Uses an application service to communicate with MongoDB. The application service is either provided or created from a provided schema, DB operation, or DB service.
 */

export interface Options
{
    schema?: Schema;
    dbOperation?: DbOperation;
    dbService?: DbService;
    applicationService?: ApplicationService;
    persona?: string;
}

export interface SearchHooks
{
    bearer?: any;
    skip?: (skip: Array<string>) => Promise<void>;
    query?: (query: any) => Promise<void>;
    options?: (options: any) => Promise<void>;
    before?: (query: any, options: any, session?: ClientSession) => Promise<void>;
    after?: (documents: Array<Document>, count: number, session?: ClientSession) => Promise<void>;
    isSessionEnabled?: boolean;
}

export interface ReadHooks
{
    bearer?: any;
    skip?: (skip: Array<string>) => Promise<void>;
    query?: (query: any) => Promise<void>;
    options?: (options: any) => Promise<void>;
    before?: (query: any, options: any, session?: ClientSession) => Promise<void>;
    after?: (documents: Array<Document>, count: number, session?: ClientSession) => Promise<void>;
    isSessionEnabled?: boolean;
}

export interface ReadOneByIdHooks
{
    bearer?: any;
    before?: (_id: ObjectId, session?: ClientSession) => Promise<void>;
    after?: (document: Document | null, session?: ClientSession) => Promise<void>;
    isSessionEnabled?: boolean;
}

export interface CreateOneHooks
{
    bearer?: any;
    fields?: (fields: any) => Promise<void>;
    skip?: (skip: Array<string>) => Promise<void>;
    before?: (fields: any, session?: ClientSession) => Promise<void>;
    after?: (document: Document, session?: ClientSession) => Promise<void>;
    isSessionEnabled?: boolean;
}

export interface UpdateOneByIdAndVersionHooks
{
    bearer?: any;
    fields?: (fields: any) => Promise<void>;
    skip?: (skip: Array<string>) => Promise<void>;
    before?: (_id: ObjectId, version: number, fields: any, session?: ClientSession) => Promise<void>;
    after?: (document: Document | null, session?: ClientSession) => Promise<void>;
    isSessionEnabled?: boolean;
    applicationService?: UpdateOneHooks
}

export interface SoftDeleteOneByIdAndVersionHooks
{
    bearer?: any;
    before?: (_id: ObjectId, version: number, session?: ClientSession) => Promise<void>;
    after?: (document: Document | null | undefined, session?: ClientSession) => Promise<void>;
    isSessionEnabled?: boolean;
}

export interface DeleteOneByIdAndVersionHooks
{
    bearer?: any;
    before?: (_id: ObjectId, version: number, session?: ClientSession) => Promise<void>;
    after?: (document: Document | null | undefined, session?: ClientSession) => Promise<void>;
    isSessionEnabled?: boolean;
}

export interface SoftDeleteManyByIdAndVersionHooks
{
    bearer?: any;
    before?: (_id: ObjectId, version: number, session?: ClientSession) => Promise<void>;
    after?: (document: Document | null | undefined, session?: ClientSession) => Promise<void>;
    isSessionEnabled?: boolean;
}

class ControllerService extends Service
{
    public readonly applicationService: ApplicationService;

    constructor (options: Options)
    {
        super(Service.LAYER.CONTROLLER, options.persona);

        if (isExist(options.schema) && !isExist(options.dbOperation) && !isExist(options.dbService) && !isExist(options.applicationService))
        {
            this.applicationService = new ApplicationService({schema: options.schema, persona: options.persona});
        }
        else if (!isExist(options.schema) && isExist(options.dbOperation) && !isExist(options.dbService) && !isExist(options.applicationService))
        {
            this.applicationService = new ApplicationService({dbOperation: options.dbOperation, persona: options.persona});
        }
        else if (!isExist(options.schema) && !isExist(options.dbOperation) && isExist(options.dbService) && !isExist(options.applicationService))
        {
            this.applicationService = new ApplicationService({dbService: options.dbService, persona: options.persona});
        }
        else if (!isExist(options.schema) && !isExist(options.dbOperation) && !isExist(options.dbService) && isExist(options.applicationService))
        {
            this.applicationService = options.applicationService;
        }
        else
        {
            throw new InvalidArgumentsError(ErrorSafe.getData().DEV_1);
        }
    }

    public async search (value: string, query: any, searchFields: Array<string>, options?: any, externalSession?: ClientSession, hooks?: SearchHooks): Promise<{documents: Array<Document>, count: number}>
    {
        options = init(options, {});
        hooks = init(hooks, {});
        hooks.bearer = init(hooks.bearer, {});

        const skip: Array<string> = [];
        isExist(hooks.skip) ? await hooks.skip(skip) : undefined;
        this.authorizeCandidate(query, this.applicationService.dbService.dbOperation.schema.definition, skip);

        query = this.validateAndConvertCandidate(query, this.applicationService.dbService.dbOperation.schema.definition);
        query = this.applicationService.adaptQuery(query); // Since this is going through an application service.
        query["$or"] = []; // To combine query with search fields.
        for (const searchField of searchFields)
        {
            const searchElement: any = {};
            searchElement[searchField] = {$regex: value, $options: "i"};
            query.$or.push(searchElement);
        }

        isExist(hooks.query) ? await hooks.query(query) : undefined;
        isExist(hooks.options) ? await hooks.options(options) : undefined;

        let documents: Array<Document> = [];
        let count: number = 0;
        const {session, internalSession} = SessionManager.generateSession(externalSession, hooks.isSessionEnabled);
        await SessionManager.exec(
            async () =>
            {
                isExist(hooks.before) ? await hooks.before(query, options, session) : undefined;
                let convertedQuery: any = flatten(query);
                convertedQuery = isExist(convertedQuery.$set) ? convertedQuery.$set : {};
                documents = await this.applicationService.dbService.dbOperation.read(convertedQuery, {...options, session});
                count = await this.applicationService.dbService.dbOperation.count(query, {...options, session});
                isExist(hooks.after) ? await hooks.after(documents, count, session) : undefined;
            },
            externalSession,
            internalSession
        );

        return {
            documents,
            count
        };
    }

    public async read (query: any, options?: any, externalSession?: ClientSession, hooks?: ReadHooks): Promise<{documents: Array<Document>, count: number}>
    {
        options = init(options, {});
        hooks = init(hooks, {});
        hooks.bearer = init(hooks.bearer, {});

        const skip: Array<string> = [];
        isExist(hooks.skip) ? await hooks.skip(skip) : undefined;
        this.authorizeCandidate(query, this.applicationService.dbService.dbOperation.schema.definition, skip);

        query = this.validateAndConvertCandidate(query, this.applicationService.dbService.dbOperation.schema.definition);

        isExist(hooks.query) ? await hooks.query(query) : undefined;
        isExist(hooks.options) ? await hooks.options(options) : undefined;

        let documents: Array<Document> = [];
        let count: number = 0;
        const {session, internalSession} = SessionManager.generateSession(externalSession, hooks.isSessionEnabled);
        await SessionManager.exec(
            async () =>
            {
                isExist(hooks.before) ? await hooks.before(query, options, session) : undefined;
                documents = await this.applicationService.read(query, options, session, {bearer: hooks.bearer});
                count = await this.applicationService.count(query, {...options, session}, {bearer: hooks.bearer});
                isExist(hooks.after) ? await hooks.after(documents, count, session) : undefined;
            },
            externalSession,
            internalSession
        );

        return {
            documents,
            count
        };
    }

    public async readOneById (_id: string | ObjectId, externalSession?: ClientSession, hooks?: ReadOneByIdHooks): Promise<Document | null>
    {
        hooks = init(hooks, {});
        hooks.bearer = init(hooks.bearer, {});

        // @ts-ignore
        _id = this.validateAndConvertObjectIdCandidate(_id);

        let document: Document | null = null;
        const {session, internalSession} = SessionManager.generateSession(externalSession, hooks.isSessionEnabled);
        await SessionManager.exec(
            async () =>
            {
                // @ts-ignore
                isExist(hooks.before) ? await hooks.before(_id, session) : undefined;
                document = await this.applicationService.readOneById(_id, undefined, session, {bearer: hooks.bearer});
                isExist(hooks.after) ? await hooks.after(document, session) : undefined;
            },
            externalSession,
            internalSession
        );

        return document;
    }

    public async createOne (fields: any, externalSession?: ClientSession, hooks?: CreateOneHooks): Promise<Document>
    {
        hooks = init(hooks, {});
        hooks.bearer = init(hooks.bearer, {});

        isExist(hooks.fields) ? await hooks.fields(fields) : undefined;

        const skip: Array<string> = [];
        isExist(hooks.skip) ? await hooks.skip(skip) : undefined;
        this.authorizeCandidate(fields, this.applicationService.dbService.dbOperation.schema.definition, skip);

        fields = this.validateAndConvertCandidate(fields, this.applicationService.dbService.dbOperation.schema.definition);

        let document: Document;
        const {session, internalSession} = SessionManager.generateSession(externalSession, hooks.isSessionEnabled);
        await SessionManager.exec(
            async () =>
            {
                isExist(hooks.before) ? await hooks.before(fields, session) : undefined;
                document = await this.applicationService.createOne(fields, session, {bearer: hooks.bearer});
                isExist(hooks.after) ? await hooks.after(document, session) : undefined;
            },
            externalSession,
            internalSession
        );

        // @ts-ignore
        return document;
    }

    public async updateOneByIdAndVersion (_id: string | ObjectId, version: string | number, fields: any, externalSession?: ClientSession, hooks?: UpdateOneByIdAndVersionHooks): Promise<Document | null>
    {
        hooks = init(hooks, {});
        hooks.bearer = init(hooks.bearer, {});

        // @ts-ignore
        _id = this.validateAndConvertObjectIdCandidate(_id);
        // @ts-ignore
        version = this.validateAndConvertVersion(version);

        isExist(hooks.fields) ? await hooks.fields(fields) : undefined;

        const skip: Array<string> = [];
        isExist(hooks.skip) ? await hooks.skip(skip) : undefined;
        this.authorizeCandidate(fields, this.applicationService.dbService.dbOperation.schema.definition, skip);

        fields = this.validateAndConvertCandidate(fields, this.applicationService.dbService.dbOperation.schema.definition);

        let document: Document | null = null;
        const {session, internalSession} = SessionManager.generateSession(externalSession, hooks.isSessionEnabled);
        await SessionManager.exec(
            async () =>
            {
                // @ts-ignore
                isExist(hooks.before) ? await hooks.before(_id, version, fields, session) : undefined;
                document = await this.applicationService.updateOneByIdAndVersion(_id, version, fields, session, {bearer: hooks.bearer, ...hooks.applicationService});
                isExist(hooks.after) ? await hooks.after(document, session) : undefined;
            },
            externalSession,
            internalSession
        );

        return document;
    }

    public async softDeleteOneByIdAndVersion (_id: string | ObjectId, version: string | number, externalSession?: ClientSession, hooks?: SoftDeleteOneByIdAndVersionHooks): Promise<Document | null | undefined>
    {
        hooks = init(hooks, {});
        hooks.bearer = init(hooks.bearer, {});

        // @ts-ignore
        _id = this.validateAndConvertObjectIdCandidate(_id);
        // @ts-ignore
        version = this.validateAndConvertVersion(version);

        let document: Document | null | undefined = null;
        const {session, internalSession} = SessionManager.generateSession(externalSession, hooks.isSessionEnabled);
        await SessionManager.exec(
            async () =>
            {
                // @ts-ignore
                isExist(hooks.before) ? await hooks.before(_id, version, session) : undefined;
                document = await this.applicationService.softDeleteOneByIdAndVersion(_id, version, session, {bearer: hooks.bearer});
                isExist(hooks.after) ? await hooks.after(document, session) : undefined;
            },
            externalSession,
            internalSession
        );

        return document;
    }

    public async deleteOneByIdAndVersion (_id: string | ObjectId, version: string | number, externalSession?: ClientSession, hooks?: DeleteOneByIdAndVersionHooks): Promise<Document | null | undefined>
    {
        hooks = init(hooks, {});
        hooks.bearer = init(hooks.bearer, {});

        // @ts-ignore
        _id = this.validateAndConvertObjectIdCandidate(_id);
        // @ts-ignore
        version = this.validateAndConvertVersion(version);

        let document: Document | null | undefined = null;
        const {session, internalSession} = SessionManager.generateSession(externalSession, hooks.isSessionEnabled);
        await SessionManager.exec(
            async () =>
            {
                // @ts-ignore
                isExist(hooks.before) ? await hooks.before(_id, version, session) : undefined;
                document = await this.applicationService.deleteOneByIdAndVersion(_id, version, session, {bearer: hooks.bearer});
                isExist(hooks.after) ? await hooks.after(document, session) : undefined;
            },
            externalSession,
            internalSession
        );

        return document;
    }

    public async softDeleteManyByIdAndVersion (documents: Array<{_id: string | ObjectId, version: string | number}>, externalSession?: ClientSession, hooks?: SoftDeleteManyByIdAndVersionHooks): Promise<Array<Document | null | undefined>>
    {
        hooks = init(hooks, {});
        hooks.bearer = init(hooks.bearer, {});

        for (const document of documents)
        {
            // @ts-ignore
            document._id = this.validateAndConvertObjectIdCandidate(document._id);
            // @ts-ignore
            document.version = this.validateAndConvertVersion(document.version);
        }

        const successfulDocuments: Array<Document | null | undefined> = [];

        for (const {_id, version} of documents)
        {
            try
            {
                const {session, internalSession} = SessionManager.generateSession(externalSession, hooks.isSessionEnabled);
                await SessionManager.exec(
                    async () =>
                    {
                        // @ts-ignore
                        isExist(hooks.before) ? await hooks.before(_id, version, session) : undefined;
                        // @ts-ignore
                        const document: Document | null | undefined = await this.applicationService.softDeleteOneByIdAndVersion(_id, version, session, {bearer: hooks.bearer});
                        isExist(hooks.after) ? await hooks.after(document, session) : undefined;

                        successfulDocuments.push(document);
                    },
                    externalSession,
                    internalSession
                );
            }
            catch (error)
            {
            }
        }

        return successfulDocuments;
    }

    private authorizeCandidate (candidate: any, schemaDefinition: any, skip: Array<string>)
    {
        // The schema definition is not initialized, but the client sends the candidate.
        if (!isInitialized(schemaDefinition))
        {
            throw new BadRequestError(ErrorSafe.getData().HTTP_21);
        }

        if (isExist(candidate))
        {
            switch (Schema.identifyDefinitionBsonType(schemaDefinition))
            {
                case BsonType.Object:
                {
                    // The candidate is defined as an object in the schema definition, but the client sent something else.
                    if (!_.isPlainObject(candidate))
                    {
                        throw new BadRequestError(ErrorSafe.getData().HTTP_21);
                    }

                    if (schemaDefinition.isMultilingual)
                    {
                        for (const language in candidate)
                        {
                            // The client sent the candidate with a language that is not defined in the language safe.
                            if (!LanguageSafe.getData().includes(language))
                            {
                                throw new BadRequestError(ErrorSafe.getData().LANGUAGE);
                            }

                            const languageCandidate = candidate[language];

                            for (const key in languageCandidate)
                            {
                                if (!skip.includes(key) && !isExist(schemaDefinition.properties[key]))
                                {
                                    throw new BadRequestError(ErrorSafe.getData().HTTP_21); // the client sent a candidate which is not defined in the schema.
                                }

                                this.authorizeCandidate(languageCandidate[key], schemaDefinition.properties[key], []); // TODO: skip is first level only for now. Dot notation can be used to indicate deeper skips.
                            }
                        }
                    }
                    else
                    {
                        for (const key in candidate)
                        {
                            if (skip.includes(key))
                            {
                                continue;
                            }

                            if (!isExist(schemaDefinition.properties[key]))
                            {
                                throw new BadRequestError(ErrorSafe.getData().HTTP_21); // the client sent a candidate which is not defined in the schema.
                            }

                            this.authorizeCandidate(candidate[key], schemaDefinition.properties[key], []);
                        }
                    }

                    break;
                }
                case BsonType.Array:
                {
                    if (_.isArray(candidate))
                    {
                        for (let i = 0; i < candidate.length; i++)
                        {
                            const item = candidate[i];

                            this.authorizeCandidate(item, schemaDefinition.items, []);
                        }
                    }
                    else if (_.isPlainObject(candidate)) // TODO: I don't understand this comment?: it can be an object in regex based reads
                    {
                        this.authorizeCandidate(candidate, schemaDefinition.items, []);
                    }
                    // The candidate is defined as an arrayu- in the schema definition, but the client sent something else.
                    else
                    {
                        throw new BadRequestError(ErrorSafe.getData().HTTP_21);
                    }

                    break;
                }
                default:
                {
                    // TODO: review this code below ???
                    if (_.isPlainObject(candidate))
                    {
                        if (isExist(candidate.$regex))
                        {
                            candidate = candidate.$regex;
                        }

                        if (schemaDefinition.isMultilingual)
                        {
                            for (const language in candidate)
                            {
                                if (!LanguageSafe.getData().includes(language))
                                {
                                    throw new BadRequestError(ErrorSafe.getData().LANGUAGE);
                                }

                                const value = candidate[language];

                                this.authorizeCandidate(value, schemaDefinition, []);
                            }
                        }
                        else
                        {
                            this.authorizeCandidate(candidate, schemaDefinition, []);
                        }
                    }
                }
            }
        }
    }
}

export default ControllerService;
