/*
 * Code Review: ✓
 * Test Cases: ✗
 * Guidelines - Imports: ✓
 * Guidelines - Comments: ✓
 */

import {ObjectId, Document, Collection, CountDocumentsOptions, AggregateOptions, Filter, FindOptions, InsertOneOptions, UpdateFilter, FindOneAndUpdateOptions, FindOneAndReplaceOptions, FindOneAndDeleteOptions} from "mongodb";

import {init} from "@thedolphinos/utility4js";

import Schema from "./Schema";

/**
 * Encapsulates native MongoDB operations.
 * Uses a schema to communicate with MongoDB.
 */

class DbOperation
{
    public readonly schema: Schema;

    constructor (schema: Schema)
    {
        this.schema = schema;
    }

    getNativeOps (): Collection
    {
        return this.schema.collection;
    }

    /**
     * Counts the matching documents with the specified query and options.
     *
     * https://docs.mongodb.com/manual/reference/method/db.collection.countDocuments/
     */
    async count (query?: Filter<Document>, options?: CountDocumentsOptions): Promise<number>
    {
        return this.getNativeOps().countDocuments(query, options);
    }

    /**
     * Executes the specified pipeline.
     *
     * https://docs.mongodb.com/manual/reference/method/db.collection.aggregate/
     */
    async aggregate (pipeline?: Array<Document>, options?: AggregateOptions): Promise<Array<Document>>
    {
        const result = this.getNativeOps().aggregate(pipeline, options);
        return result.toArray();
    }

    /**
     * Fetches the matching documents with the specified query and options.
     *
     * https://docs.mongodb.com/manual/reference/method/db.collection.find/
     */
    async read (query: Filter<Document>, options?: FindOptions): Promise<Array<Document>>
    {
        const result = this.getNativeOps().find(query, options);
        return result.toArray();
    }

    /**
     * Fetches the first matching document with the specified query and options.
     *
     * https://docs.mongodb.com/manual/reference/method/db.collection.findOne/
     */
    async readOne (query: Filter<Document>, options?: FindOptions): Promise<Document | null>
    {
        return this.getNativeOps().findOne(query, options);
    }

    /**
     * Fetches the matching document with the specified ID and options.
     *
     * This method is a specialized version of the method `readOne`.
     */
    async readOneById (_id: ObjectId, options?: FindOptions): Promise<Document | null>
    {
        return this.readOne({_id}, options);
    }

    /**
     * Creates the specified document candidate with the specified options.
     *
     * https://docs.mongodb.com/manual/reference/method/db.collection.insertOne/
     */
    async createOne (documentCandidate: Document, options?: InsertOneOptions): Promise<Document>
    {
        const result = await this.getNativeOps().insertOne(documentCandidate, options);
        // @ts-ignore
        return this.readOneById(result.insertedId, options);
    }

    /**
     * Updates the first matching document with the specified query and options by using the specified document candidate.
     *
     * https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndUpdate/
     */
    async updateOne (query: Filter<Document>, newDocumentPropertyCandidates: UpdateFilter<Document>, options?: FindOneAndUpdateOptions): Promise<Document | null>
    {
        options = init(options, {})
        return this.getNativeOps().findOneAndUpdate(query, newDocumentPropertyCandidates, options);
    }

    /**
     * Updates the matching document with the specified ID and options by using the specified document candidate.
     *
     * This method is a specialized version of the method `updateOne`.
     */
    async updateOneById (_id: ObjectId, newDocumentPropertyCandidates: UpdateFilter<Document>, options?: FindOneAndUpdateOptions): Promise<Document | null>
    {
        return this.updateOne({_id}, newDocumentPropertyCandidates, options);
    }

    /**
     * Replaces the first matching document with the specified query and options by using the specified document candidate.
     *
     * https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndReplace/
     */
    async replaceOne (query: Filter<Document>, newDocumentCandidate: Document, options?: FindOneAndReplaceOptions): Promise<Document | null>
    {
        options = init(options, {})
        return this.getNativeOps().findOneAndReplace(query, newDocumentCandidate, options);
    }

    /**
     * Replaces the matching document with the specified ID and options by using the specified document candidate.
     *
     * This method is a specialized version of the method `replaceOneById`.
     */
    async replaceOneById (_id: ObjectId, newDocumentCandidate: Document, options?: FindOneAndReplaceOptions): Promise<Document | null>
    {
        return this.replaceOne({_id}, newDocumentCandidate, options);
    }

    /**
     * Deletes the first matching document with the specified query and options by using the specified document candidate.
     *
     * https://docs.mongodb.com/manual/reference/method/db.collection.findOneAndDelete/
     */
    async deleteOne (query: Filter<Document>, options?: FindOneAndDeleteOptions): Promise<Document | null>
    {
        return this.getNativeOps().findOneAndDelete(query, options || {});
    }

    /**
     * Deletes the matching document with the specified ID and options by using the specified document candidate.
     *
     * This method is a specialized version of the method `deleteOneById`.
     */
    async deleteOneById (_id: ObjectId, options?: FindOneAndDeleteOptions): Promise<Document | null>
    {
        return this.deleteOne({_id}, options);
    }
}

export default DbOperation;
