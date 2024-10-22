/*
 * Code Review: ✓
 * Test Cases: ✗
 * Guidelines - Imports: ✓
 * Guidelines - Comments: ✓
 */

import _ from "lodash";
import {ClientSession, ObjectId, Document} from "mongodb";

import {isExist, isInitialized, init} from "@thedolphinos/utility4js";
import {DeveloperError, InvalidArgumentsError, DocumentNotFoundError, MoreThan1DocumentFoundError, BadRequestError} from "@thedolphinos/error4js";

import ErrorSafe from "../safes/ErrorSafe";
import SessionManager from "../db/SessionManager";
import Schema from "../db/Schema";
import DbOperation from "../db/DbOperation";
import Service from "../core/Service";
import DbService from "../services/DbService";

/**
 * Encapsulates a DB service, providing necessary abstractions.
 * Uses a DB service to communicate with MongoDB. The DB service is either provided or created from a provided schema or DB operation.
 */

type Options = {
    schema?: Schema,
    dbOperation?: DbOperation,
    dbService?: DbService,
    persona?: string
    raiseDocumentExistenceErrors?: boolean
}

type CountHooks = {
    bearer?: any,
    query?: (query: any) => Promise<void>,
    options?: (options: any) => Promise<void>,
    before?: (query: any, options: any) => Promise<void>,
    after?: (count: number) => Promise<void>
}

type ReadHooks = {
    bearer?: any,
    query?: (query: any) => Promise<void>,
    options?: (options: any) => Promise<void>,
    before?: (query: any, options: any, session?: ClientSession) => Promise<void>,
    after?: (documents: Array<Document>, session?: ClientSession) => Promise<void>
    isSessionEnabled?: boolean
}

type ReadOneHooks = {
    bearer?: any,
    query?: (query: any) => Promise<void>,
    options?: (options: any) => Promise<void>,
    before?: (query: any, options: any, session?: ClientSession) => Promise<void>,
    after?: (document: Document | null, session?: ClientSession) => Promise<void>,
    raiseDocumentExistenceErrors?: boolean,
    isSessionEnabled?: boolean
}

type CreateOneHooks = {
    bearer?: any,
    documentCandidate?: (documentCandidate: any) => Promise<void>,
    before?: (documentCandidate: any, session?: ClientSession) => Promise<void>,
    after?: (document: Document, session?: ClientSession) => Promise<void>
    isSessionEnabled?: boolean
}

type UpdateOneHooks = {
    bearer?: any,
    query?: (query: any) => Promise<void>,
    documentCandidate?: (documentCandidate: any) => Promise<void>,
    before?: (query: any, document: Document, documentCandidate: any, session?: ClientSession) => Promise<void>,
    after?: (document: Document | null, session?: ClientSession) => Promise<void>,
    raiseDocumentExistenceErrors?: boolean,
    isSessionEnabled?: boolean
}

type SoftDeleteOneHooks = {
    bearer?: any,
    query?: (query: any) => Promise<void>,
    before?: (query: any, document: Document, session?: ClientSession) => Promise<void>,
    after?: (document: Document | null | undefined, session?: ClientSession) => Promise<void>, // When history is enabled, `document` comes undefined.
    raiseDocumentExistenceErrors?: boolean,
    isSessionEnabled?: boolean
}

type DeleteOneHooks = {
    bearer?: any,
    query?: (query: any) => Promise<void>,
    before?: (query: any, document: Document, session?: ClientSession) => Promise<void>,
    after?: (document: Document | null | undefined, session?: ClientSession) => Promise<void>, // When history is enabled, `document` comes undefined.
    raiseDocumentExistenceErrors?: boolean,
    isSessionEnabled?: boolean
}

class ApplicationService extends Service
{
    public readonly dbService: DbService;
    private readonly rootDbService?: DbService;
    private readonly raiseDocumentExistenceErrors: boolean;

    constructor (options: Options)
    {
        super(Service.LAYER.APPLICATION, options.persona);

        if (isExist(options.schema) && !isExist(options.dbOperation) && !isExist(options.dbService))
        {
            this.dbService = new DbService({schema: options.schema, persona: options.persona});
        }
        else if (!isExist(options.schema) && isExist(options.dbOperation) && !isExist(options.dbService))
        {
            this.dbService = new DbService({dbOperation: options.dbOperation, persona: options.persona});
        }
        else if (!isExist(options.schema) && !isExist(options.dbOperation) && isExist(options.dbService))
        {
            this.dbService = options.dbService;
        }
        else
        {
            throw new InvalidArgumentsError(ErrorSafe.getData().DEV_1);
        }

        if (this.dbService.dbOperation.schema.isHistoryEnabled)
        {
            this.rootDbService = new DbService({schema: this.dbService.dbOperation.schema.rootSchema});
        }

        this.raiseDocumentExistenceErrors = init(options.raiseDocumentExistenceErrors, false);
    }

    public async count (query: any, options?: any, hooks?: CountHooks): Promise<number>
    {
        options = init(options, {});
        hooks = init(hooks, {});
        hooks.bearer = init(hooks.bearer, {});

        query = this.validateAndConvertCandidate(query, this.dbService.dbOperation.schema.definition);
        query = this.adaptQuery(query);

        isExist(hooks.query) ? await hooks.query(query) : undefined;
        isExist(hooks.options) ? await hooks.options(options) : undefined;

        isExist(hooks.before) ? await hooks.before(query, options) : undefined;
        const count = await this.dbService.count(query, options, {bearer: hooks.bearer});
        isExist(hooks.after) ? await hooks.after(count) : undefined;

        return count;
    }

    public async read (query: any, options?: any, externalSession?: ClientSession, hooks?: ReadHooks): Promise<Array<Document>>
    {
        options = init(options, {});
        hooks = init(hooks, {});
        hooks.bearer = init(hooks.bearer, {});

        query = this.validateAndConvertCandidate(query, this.dbService.dbOperation.schema.definition);
        query = this.adaptQuery(query);

        isExist(hooks.query) ? await hooks.query(query) : undefined;
        isExist(hooks.options) ? await hooks.options(options) : undefined;

        let documents: Array<Document> = [];
        const {session, internalSession} = SessionManager.generateSession(externalSession, hooks.isSessionEnabled);
        await SessionManager.exec(
            async () =>
            {
                isExist(hooks.before) ? await hooks.before(query, options, session) : undefined;
                documents = await this.dbService.read(query, {...options, session}, {bearer: hooks.bearer});
                isExist(hooks.after) ? await hooks.after(documents, session) : undefined;
            },
            externalSession,
            internalSession
        );

        return documents;
    }

    public async readOne (query: any, options?: any, externalSession?: ClientSession, hooks?: ReadOneHooks, hooksOfSpecializedVersion?: ReadOneHooks): Promise<Document | null>
    {
        options = init(options, {});
        hooks = init(hooks, {});
        hooks.bearer = init(hooks.bearer, {});

        hooks = isInitialized(hooksOfSpecializedVersion) ? _.merge(hooks, hooksOfSpecializedVersion, {bearer: hooks.bearer}) : hooks;

        query = this.validateAndConvertCandidate(query, this.dbService.dbOperation.schema.definition);
        query = this.adaptQuery(query);

        isExist(hooks.query) ? await hooks.query(query) : undefined;
        isExist(hooks.options) ? await hooks.options(options) : undefined;

        let document: Document | null = null;
        const {session, internalSession} = SessionManager.generateSession(externalSession, hooks.isSessionEnabled);
        await SessionManager.exec(
            async () =>
            {
                isExist(hooks.before) ? await hooks.before(query, options, session) : undefined;
                document = await this.dbService.readOne(query, {...options, session}, {bearer: hooks.bearer});
                isExist(hooks.after) ? await hooks.after(document, session) : undefined;
            },
            externalSession,
            internalSession
        );

        if (isExist(hooks.raiseDocumentExistenceErrors)) // If this is set in hooks, ignore instance's variables.
        {
            if (hooks.raiseDocumentExistenceErrors && !isExist(document))
            {
                throw new DocumentNotFoundError(ErrorSafe.getData().DB_1);
            }
        }
        else
        {
            if (this.raiseDocumentExistenceErrors && !isExist(document))
            {
                throw new DocumentNotFoundError(ErrorSafe.getData().DB_1);
            }
        }

        return document;
    }

    // For history.
    public async readRecentOne (query: any, options?: any, externalSession?: ClientSession, hooks?: ReadOneHooks, hooksOfSpecializedVersion?: ReadOneHooks): Promise<Document | null>
    {
        if (!this.dbService.dbOperation.schema.isHistoryEnabled)
        {
            throw new DeveloperError({"code": "UNASSIGNED", "message": {"en": "History is not enabled."}});
        }

        options = init(options, {});
        hooks = init(hooks, {});
        hooks.bearer = init(hooks.bearer, {});

        hooks = isInitialized(hooksOfSpecializedVersion) ? _.merge(hooks, hooksOfSpecializedVersion, {bearer: hooks.bearer}) : hooks;

        query = this.validateAndConvertCandidate(query, this.dbService.dbOperation.schema.definition);
        query = this.adaptQuery(query);

        isExist(hooks.query) ? await hooks.query(query) : undefined;
        isExist(hooks.options) ? await hooks.options(options) : undefined;

        let document: Document | null = null;
        const {session, internalSession} = SessionManager.generateSession(externalSession, hooks.isSessionEnabled);
        await SessionManager.exec(
            async () =>
            {
                isExist(hooks.before) ? await hooks.before(query, options, session) : undefined;
                document = await this.dbService.readOne(query, {...options, session}, {bearer: hooks.bearer});
                isExist(hooks.after) ? await hooks.after(document, session) : undefined;
            },
            externalSession,
            internalSession
        );

        if (isExist(hooks.raiseDocumentExistenceErrors)) // If this is set in hooks, ignore instance's variables.
        {
            if (hooks.raiseDocumentExistenceErrors && !isExist(document))
            {
                throw new DocumentNotFoundError(ErrorSafe.getData().DB_1);
            }
        }
        else
        {
            if (this.raiseDocumentExistenceErrors && !isExist(document))
            {
                throw new DocumentNotFoundError(ErrorSafe.getData().DB_1);
            }
        }

        return document;
    }

    // Specialized version of `readOne`.
    public async readOneById (_id: ObjectId | string, options?: any, externalSession?: ClientSession, hooks?: ReadOneHooks): Promise<Document | null>
    {
        options = init(options, {});
        hooks = init(hooks, {});
        hooks.bearer = init(hooks.bearer, {});

        // @ts-ignore
        _id = this.validateAndConvertObjectIdCandidate(_id);

        return this.readOne({_id}, options, externalSession, undefined, hooks);
    }

    // Specialized version of `readRecentOne`.
    public async readRecentOneById (_id: ObjectId | string, options?: any, externalSession?: ClientSession, hooks?: ReadOneHooks): Promise<Document | null>
    {
        if (!this.dbService.dbOperation.schema.isHistoryEnabled)
        {
            throw new DeveloperError({"code": "UNASSIGNED", "message": {"en": "History is not enabled."}});
        }

        options = init(options, {});
        hooks = init(hooks, {});
        hooks.bearer = init(hooks.bearer, {});

        // @ts-ignore
        _id = this.validateAndConvertObjectIdCandidate(_id);

        return this.readRecentOne({_id}, options, externalSession, undefined, hooks);
    }

    // Specialized version of `readOne`.
    public async readOneByIdAndVersion (_id: ObjectId | string, version: number, options?: any, externalSession?: ClientSession, hooks?: ReadOneHooks): Promise<Document | null>
    {
        options = init(options, {});
        hooks = init(hooks, {});
        hooks.bearer = init(hooks.bearer, {});

        // @ts-ignore
        _id = this.validateAndConvertObjectIdCandidate(_id);
        // @ts-ignore
        version = this.validateAndConvertVersion(version);

        const document = await this.readOne({_id}, options, externalSession, undefined, hooks);

        if (isExist(document))
        {
            this._checkVersion(document.version, version);
        }

        return document;
    }

    // Specialized version of `readRecentOne`.
    public async readRecentOneByIdAndVersion (_id: ObjectId | string, version: number, options?: any, externalSession?: ClientSession, hooks?: ReadOneHooks): Promise<Document | null>
    {
        if (!this.dbService.dbOperation.schema.isHistoryEnabled)
        {
            throw new DeveloperError({"code": "UNASSIGNED", "message": {"en": "History is not enabled."}});
        }

        options = init(options, {});
        hooks = init(hooks, {});
        hooks.bearer = init(hooks.bearer, {});

        // @ts-ignore
        _id = this.validateAndConvertObjectIdCandidate(_id);
        // @ts-ignore
        version = this.validateAndConvertVersion(version);

        const document = await this.readRecentOne({_id}, options, externalSession, undefined, hooks);

        if (isExist(document))
        {
            this._checkVersion(document.version, version);
        }

        return document;
    }

    public async createOne (documentCandidate: any, externalSession?: ClientSession, hooks?: CreateOneHooks): Promise<Document>
    {
        hooks = init(hooks, {});
        hooks.bearer = init(hooks.bearer, {});

        documentCandidate = this.validateAndConvertCandidate(documentCandidate, this.dbService.dbOperation.schema.definition);

        isExist(hooks.documentCandidate) ? await hooks.documentCandidate(documentCandidate) : undefined;

        let document: Document;
        let rootDocument: Document;
        const {session, internalSession} = SessionManager.generateSession(externalSession, hooks.isSessionEnabled);
        await SessionManager.exec(
            async () =>
            {
                if (this.dbService.dbOperation.schema.isHistoryEnabled)
                {
                    const rootDocumentCandidate = {
                        version: 0,
                        isSoftDeleted: false,
                        createdAt: new Date()
                    };

                    // @ts-ignore
                    rootDocument = await this.rootDbService.createOne(rootDocumentCandidate, {session}, {bearer: hooks.bearer});
                    documentCandidate._root = rootDocument._id;
                    documentCandidate.isRecent = true;
                }

                documentCandidate = {
                    ...documentCandidate,
                    version: 0,
                    isSoftDeleted: false,
                    createdAt: new Date()
                };

                if (this.dbService.dbOperation.schema.isHistoryEnabled)
                {
                    documentCandidate = {
                        ...documentCandidate,
                        isRecent: true,
                        _root: rootDocument._id
                    };
                }

                isExist(hooks.before) ? await hooks.before(documentCandidate, session) : undefined;
                document = await this.dbService.createOne(documentCandidate, {session}, {bearer: hooks.bearer});
                isExist(hooks.after) ? await hooks.after(document, session) : undefined;
            },
            externalSession,
            internalSession
        );

        // @ts-ignore
        return document;
    }

    public async updateOne (query: any, documentCandidate: any, externalSession?: ClientSession, hooks?: UpdateOneHooks, hooksOfSpecializedVersion?: UpdateOneHooks): Promise<Document | null>
    {
        hooks = init(hooks, {});
        hooks.bearer = init(hooks.bearer, {});
        hooksOfSpecializedVersion = init(hooksOfSpecializedVersion, {});

        hooks = isInitialized(hooksOfSpecializedVersion) ? _.merge(hooks, hooksOfSpecializedVersion, {bearer: hooks.bearer}) : hooks;

        query = this.validateAndConvertCandidate(query, this.dbService.dbOperation.schema.definition);
        query = this.adaptQuery(query);
        documentCandidate = this.validateAndConvertCandidate(documentCandidate, this.dbService.dbOperation.schema.definition);

        isExist(hooks.query) ? await hooks.query(query) : undefined;
        isExist(hooks.documentCandidate) ? await hooks.documentCandidate(documentCandidate) : undefined;

        let document: Document | null = null;
        const {session, internalSession} = SessionManager.generateSession(externalSession, hooks.isSessionEnabled, false);
        await SessionManager.exec(
            async () =>
            {
                const documents = await this.read(query, undefined, session, {bearer: hooks.bearer});
                this._checkDocumentSingularity(documents, hooks.raiseDocumentExistenceErrors);

                document = documents[0];
                if (!isExist(document))
                {
                    return;
                }
                const readDocument = _.clone(document);

                if (!this.dbService.dbOperation.schema.isHistoryEnabled)
                {
                    documentCandidate = {
                        ...documentCandidate,
                        version: document.version + 1,
                        updatedAt: new Date()
                    };

                    isExist(hooks.before) ? await hooks.before(query, document, documentCandidate, session) : undefined;
                    document = await this.dbService.updateOne({_id: document._id}, documentCandidate, {session}, {bearer: hooks.bearer});
                    isExist(hooks.after) ? await hooks.after(document, session) : undefined;
                }
                else
                {
                    const update = {
                        isRecent: false,
                        updatedAt: new Date()
                    };

                    document = await this.dbService.updateOne({_root: document._root, isRecent: true}, update, {session}, {bearer: hooks.bearer});

                    delete document._id;
                    delete document.updatedAt;

                    documentCandidate = {
                        ...document,
                        ...documentCandidate,
                        version: document.version + 1,
                        createdAt: new Date(),
                        isRecent: true
                    };

                    isExist(hooks.before) ? await hooks.before(query, readDocument, documentCandidate, session) : undefined;
                    document = await this.dbService.createOne(documentCandidate, {session});
                    isExist(hooks.after) ? await hooks.after(document, session) : undefined;
                }

            },
            externalSession,
            internalSession
        );

        return document;
    }

    // Specialized version of `updateOne`.
    public async updateOneByIdAndVersion (_id: ObjectId | string, version: number, documentCandidate: any, externalSession?: ClientSession, hooks?: UpdateOneHooks): Promise<Document | null>
    {
        hooks = init(hooks, {});
        hooks.bearer = init(hooks.bearer, {});

        // @ts-ignore
        _id = this.validateAndConvertObjectIdCandidate(_id);
        // @ts-ignore
        version = this.validateAndConvertVersion(version);
        documentCandidate = this.validateAndConvertCandidate(documentCandidate, this.dbService.dbOperation.schema.definition);

        let document: Document | null = null;
        const {session, internalSession} = SessionManager.generateSession(externalSession, hooks.isSessionEnabled, false);
        await SessionManager.exec(
            async () =>
            {
                document = await this.updateOne({_id}, documentCandidate, session, undefined, hooks);
                if (!isExist(document))
                {
                    return;
                }

                this._checkVersion(document.version - 1, version);
            },
            externalSession,
            internalSession
        );

        return document;
    }

    // When history is enabled, returns undefined and passes document as undefined to after hook.
    public async softDeleteOne (query: any, externalSession?: ClientSession, hooks?: SoftDeleteOneHooks, hooksOfSpecializedVersion?: SoftDeleteOneHooks): Promise<Document | null | undefined>
    {
        hooks = init(hooks, {});
        hooks.bearer = init(hooks.bearer, {});
        hooksOfSpecializedVersion = init(hooksOfSpecializedVersion, {});

        hooks = isInitialized(hooksOfSpecializedVersion) ? _.merge(hooks, hooksOfSpecializedVersion, {bearer: hooks.bearer}) : hooks;

        query = this.validateAndConvertCandidate(query, this.dbService.dbOperation.schema.definition);
        query = this.adaptQuery(query);

        isExist(hooks.query) ? await hooks.query(query) : undefined;

        let document: Document | null | undefined = null;
        const {session, internalSession} = SessionManager.generateSession(externalSession, hooks.isSessionEnabled, false);
        await SessionManager.exec(
            async () =>
            {
                const documents = await this.read(query, undefined, session, {bearer: hooks.bearer});
                this._checkDocumentSingularity(documents, hooks.raiseDocumentExistenceErrors);

                document = documents[0];
                if (!isExist(document))
                {
                    return;
                }
                const readDocument = _.clone(document);

                if (!this.dbService.dbOperation.schema.isHistoryEnabled)
                {
                    const documentCandidate = {
                        version: document.version + 1,
                        isSoftDeleted: true,
                        softDeletedAt: new Date()
                    };

                    isExist(hooks.before) ? await hooks.before(query, document, session) : undefined;
                    document = await this.dbService.updateOne({_id: document._id}, documentCandidate, {session}, {bearer: hooks.bearer});
                    isExist(hooks.after) ? await hooks.after(document, session) : undefined;
                }
                else
                {
                    const update = {
                        isSoftDeleted: true,
                        softDeletedAt: new Date()
                    };

                    isExist(hooks.before) ? await hooks.before(query, readDocument, session) : undefined;
                    // @ts-ignore
                    await this.rootDbService.dbOperation.getNativeOps().updateOne({_id: document._root}, {$set: update, $inc: {version: 1}}, {session});
                    await this.dbService.dbOperation.getNativeOps().updateMany({_root: document._root}, {$set: update}, {session});
                    document = undefined;
                    isExist(hooks.after) ? await hooks.after(document, session) : undefined;
                }

            },
            externalSession,
            internalSession
        );

        return document;
    }

    // Specialized version of `softDeleteOne`.
    public async softDeleteOneByIdAndVersion (_id: ObjectId | string, version: number, externalSession?: ClientSession, hooks?: SoftDeleteOneHooks): Promise<Document | null | undefined>
    {
        hooks = init(hooks, {});
        hooks.bearer = init(hooks.bearer, {});

        // @ts-ignore
        _id = this.validateAndConvertObjectIdCandidate(_id);
        // @ts-ignore
        version = this.validateAndConvertVersion(version);

        let document: Document | null | undefined = null;
        const {session, internalSession} = SessionManager.generateSession(externalSession, hooks.isSessionEnabled, false); // TODO: all falses once were true, review, and reconsider. Also, consider making it true, when history is enabled.
        await SessionManager.exec(
            async () =>
            {
                document = await this.softDeleteOne({_id}, session, undefined, hooks);
                if (!isExist(document))
                {
                    return;
                }

                this._checkVersion(document.version - 1, version);
            },
            externalSession,
            internalSession
        );

        return document;
    }

    // When history is enabled, returns undefined and passes document as undefined to after hook.
    async deleteOne (query: any, externalSession?: ClientSession, hooks?: DeleteOneHooks, hooksOfSpecializedVersion?: DeleteOneHooks): Promise<Document | null | undefined>
    {
        hooks = init(hooks, {});
        hooks.bearer = init(hooks.bearer, {});
        hooksOfSpecializedVersion = init(hooksOfSpecializedVersion, {});

        hooks = isInitialized(hooksOfSpecializedVersion) ? _.merge(hooks, hooksOfSpecializedVersion, {bearer: hooks.bearer}) : hooks;

        query = this.validateAndConvertCandidate(query, this.dbService.dbOperation.schema.definition);
        query = this.adaptQuery(query);

        isExist(hooks.query) ? await hooks.query(query) : undefined;

        let document: Document | null | undefined = null;
        const {session, internalSession} = SessionManager.generateSession(externalSession, hooks.isSessionEnabled, false);
        await SessionManager.exec(
            async () =>
            {
                const documents = await this.read(query, undefined, session, {bearer: hooks.bearer});
                this._checkDocumentSingularity(documents, hooks.raiseDocumentExistenceErrors);

                document = documents[0];
                if (!isExist(document))
                {
                    return;
                }
                const readDocument = _.clone(document);

                if (!this.dbService.dbOperation.schema.isHistoryEnabled)
                {
                    isExist(hooks.before) ? await hooks.before(query, document, session) : undefined;
                    document = await this.dbService.deleteOne({_id: document._id}, {session}, {bearer: hooks.bearer});
                    isExist(hooks.after) ? await hooks.after(document, session) : undefined;
                }
                else
                {
                    isExist(hooks.before) ? await hooks.before(query, readDocument, session) : undefined;
                    // @ts-ignore
                    await this.rootDbService.dbOperation.getNativeOps().deleteOne({_id: document._root}, {session});
                    await this.dbService.dbOperation.getNativeOps().deleteMany({_root: document._root}, {session});
                    document = undefined;
                    isExist(hooks.after) ? await hooks.after(document, session) : undefined;
                }
            },
            externalSession,
            internalSession
        );

        return document;
    }

    async deleteOneByIdAndVersion (_id: ObjectId | string, version: number, externalSession?: ClientSession, hooks?: SoftDeleteOneHooks): Promise<Document | null | undefined>
    {
        hooks = init(hooks, {});
        hooks.bearer = init(hooks.bearer, {});

        // @ts-ignore
        _id = this.validateAndConvertObjectIdCandidate(_id);
        // @ts-ignore
        version = this.validateAndConvertVersion(version);

        let document: Document | null | undefined = null;
        const {session, internalSession} = SessionManager.generateSession(externalSession, hooks.isSessionEnabled, false);
        await SessionManager.exec(
            async () =>
            {
                document = await this.deleteOne({_id}, session, undefined, hooks);
                if (!isExist(document))
                {
                    return;
                }

                this._checkVersion(document.version, version);
            },
            externalSession,
            internalSession
        );

        return document;
    }

    _checkVersion (documentVersion: number, version: number)
    {
        if (documentVersion < version)
        {
            throw new BadRequestError(ErrorSafe.getData().DOCUMENT_INVALID_VERSION, documentVersion, version);
        }
        else if (documentVersion > version)
        {
            throw new BadRequestError(ErrorSafe.getData().DOCUMENT_MODIFIED, documentVersion, version);
        }
    }

    _checkDocumentSingularity (documents: Array<Document>, isRaiseDocumentExistenceErrors?: boolean)
    {
        if (isExist(isRaiseDocumentExistenceErrors))
        {
            if (isRaiseDocumentExistenceErrors)
            {
                switch (documents.length)
                {
                    case 0:
                        throw new DocumentNotFoundError(ErrorSafe.getData().DB_1);
                    case 1:
                        break;
                    default:
                        throw new MoreThan1DocumentFoundError(ErrorSafe.getData().DB_2);
                }
            }
        }
        else
        {
            if (this.raiseDocumentExistenceErrors)
            {
                switch (documents.length)
                {
                    case 0:
                        throw new DocumentNotFoundError(ErrorSafe.getData().DB_1);
                    case 1:
                        break;
                    default:
                        throw new MoreThan1DocumentFoundError(ErrorSafe.getData().DB_2);
                }
            }
        }
    }

    adaptQuery (query: any)
    {
        if (isExist(query.$query)) // TODO: why? what is $query? where is it coming from?
        {
            if (!isInitialized(query.$query))
            {
                query.$query = {};
            }

            query.$query.isSoftDeleted = false;

            if (this.dbService.dbOperation.schema.isHistoryEnabled)
            {
                query.$query.isRecent = true;
            }
        }
        else
        {
            query.isSoftDeleted = false;

            if (this.dbService.dbOperation.schema.isHistoryEnabled)
            {
                query.isRecent = true;
            }
        }

        return query;
    }
}

export default ApplicationService;
