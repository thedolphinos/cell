import crypto from "node:crypto";

import {ClientSession, Document} from "mongodb";

import {isExist, isInitialized, init, isSameIds} from "@thedolphinos/utility4js";
import {InvalidArgumentsError, BadRequestError, UnauthorizedError, ForbiddenError, InvalidCredentialsError, InvalidTokenError, TokenExpiredError, AccountBlockedError} from "@thedolphinos/error4js";

import NodeRSA from "node-rsa";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import Validator from "../helpers/Validator";
import ErrorSafe from "../safes/ErrorSafe";
import SessionManager from "../db/SessionManager";
import ApplicationService from "../services/ApplicationService";
import Controller from "../core/Controller";
import {AllowedPropertiesForRequestElements, AllowedProperties, SpecialAllowedPropertyAll} from "../core/Router";

export interface Options
{
    propertyNameOfUserIdentifier: string;
    propertyNameOfPassword: string;
    encryptionKey: string;
    encryptionIv: string;
    encryptionPassphrase: string;
    tokenPrivateKey: string;
    tokenLifetime: number;
    maxAllowedInvalidLoginAttempts: number;
    maxAllowedInvalidChangePasswordAttempts: number;
    isActivationEnabled: boolean;
    activationLinkPrivateKey?: string; // Required when `isActivationEnabled` is true.
    activationLinkLifeTime?: number; // Required when `isActivationEnabled` is true.
}

export interface VerifyPublicHooks
{
    bearer?: any;
    headers?: (headers: any) => Promise<void>;
}

export interface VerifyPrivateHooks
{
    bearer?: any;
    headers?: (headers: any) => Promise<void>;
    data?: (data: any, account: Document) => Promise<void>;
}

export interface RegisterHooks
{
    bearer?: any;
    body?: (body: any) => Promise<void>;
    userIdentifier?: (userIdentifier: any) => Promise<void>;
    password?: (password: any) => Promise<void>;
    query?: (query: any) => Promise<void>;
    isSessionEnabled?: boolean;
    before?: (body: any, session?: ClientSession) => Promise<void>;
    after?: (body: any, session?: ClientSession) => Promise<void>;
    activation?: (account: Document, activationCode: string, activationLink: string) => Promise<void>; // If activation is enabled.
    data?: (data: any, account: Document) => Promise<void>;
}

export interface ActivateHooks
{
    bearer?: any;
    body?: (body: any) => Promise<void>;
    isSessionEnabled?: boolean;
    before?: (account: Document, body: any, session?: ClientSession) => Promise<void>;
    after?: (account: Document, session?: ClientSession) => Promise<void>;
    data?: (data: any, account: Document) => Promise<void>;
}

export interface LoginHooks
{
    bearer?: any;
    body?: (body: any) => Promise<void>;
    query?: (query: any) => Promise<void>;
    isSessionEnabled?: boolean;
    data?: (data: any, account: Document) => Promise<void>;
}

export interface AuthorizeHooks
{
    body?: (body: any) => Promise<void>;
    data?: (data: any, account: Document) => Promise<void>;
}

export interface ChangePasswordHooks
{
    bearer?: any;
    body?: (body: any) => Promise<void>;
    password?: (oldPassword: string, newPassword: string) => Promise<void>;
    isSessionEnabled?: boolean;
    account?: (account: Document, session?: ClientSession) => Promise<void>;
    data?: (data: any, account: Document) => Promise<void>;
}

/**
 * To use this class, the user (schema name can change) schema type must contain the below fields:
 * {
 *     [propertyNameOfUserIdentifier]: string,
 *     auth: {
 *         [propertyNameOfPassword]: string,  // Hashed.
 *         isActive: boolean, // If activation is enabled.
 *         activationCode: string, // If activation is enabled.
 *         isBlocked: boolean, // Controlled by `numberOfFailedLoginAttempts` and `numberOfFailedChangePasswordAttempts`.
 *         numberOfFailedLoginAttempts: number,
 *         numberOfFailedChangePasswordAttempts: number,
 *         lastFailedLoginAttempt: Date,
 *         lastSuccessfulLogin: Date,
 *         lastFailedChangePasswordAttempt: Date,
 *         lastSuccessfulChangePassword: Date,
 *     },
 *     encryption: {
 *         aes: {
 *             key: string,
 *             iv: string,
 *         },
 *         rsa: {
 *             publicKey: string,
 *             privateKey: string
 *         }
 *     }
 * }
 */

class AuthController extends Controller
{
    private static readonly ENCRYPTION_ALGORITHM = "aes-256-cbc";

    protected readonly applicationService: ApplicationService;

    private readonly propertyNameOfUserIdentifier: string; // The property name of the unique identifier of an account, such as username or e-mail. It must also be presented in the schema of the application service.
    private readonly propertyNameOfPassword: string; // The property name of the password of an account. It must also be presented in the schema of the application service.

    private readonly encryptionKey: string; // Key to be used for encryption. Encoded in hex.
    private readonly encryptionIv: string; // Initialization vector to be used for encryption. Encoded in hex.
    private readonly encryptionPassphrase: string; // Passphrase to be used for encrypting RSA private keys. Encoded in hex.

    private readonly tokenPrivateKey: string; // Private key to be used to sign token.
    private readonly tokenLifetime: number; // In seconds.

    private readonly maxAllowedInvalidLoginAttempts: number;
    private readonly maxAllowedInvalidChangePasswordAttempts: number;

    private readonly isActivationEnabled: boolean; // Controls account validation requirement.
    private readonly activationLinkPrivateKey?: string; // Private key to be used to sign activation link.
    private readonly activationLinkLifeTime?: number;

    constructor (applicationService: ApplicationService, options: Options)
    {
        if (options.tokenLifetime <= 0 ||
            options.maxAllowedInvalidLoginAttempts <= 0 ||
            options.maxAllowedInvalidChangePasswordAttempts <= 0 ||
            (options.isActivationEnabled && (
                !isInitialized(options.activationLinkPrivateKey) ||
                !isInitialized(options.activationLinkLifeTime) || options.activationLinkLifeTime <= 0
            )))
        {
            throw new InvalidArgumentsError(ErrorSafe.getData().DEV_1);
        }

        super();

        this.applicationService = applicationService;

        this.propertyNameOfUserIdentifier = options.propertyNameOfUserIdentifier;
        this.propertyNameOfPassword = options.propertyNameOfPassword;

        this.encryptionKey = options.encryptionKey;
        this.encryptionIv = options.encryptionIv;
        this.encryptionPassphrase = options.encryptionPassphrase;

        this.tokenPrivateKey = options.tokenPrivateKey;
        this.tokenLifetime = options.tokenLifetime;

        this.maxAllowedInvalidLoginAttempts = options.maxAllowedInvalidLoginAttempts;
        this.maxAllowedInvalidChangePasswordAttempts = options.maxAllowedInvalidChangePasswordAttempts;

        this.isActivationEnabled = options.isActivationEnabled;
        if (this.isActivationEnabled)
        {
            this.activationLinkPrivateKey = options.activationLinkPrivateKey;
            this.activationLinkLifeTime = options.activationLinkLifeTime;
        }
    }

    /**
     * This does not contain any logic. Hooks should be used to place logic.
     */
    public async verifyPublic (request: any, response: any, next?: any, hooks ?: VerifyPublicHooks, allowedPropertiesForHeaders?: AllowedProperties | SpecialAllowedPropertyAll): Promise<void>
    {
        try
        {
            // if (isExist(allowedPropertiesForHeaders) && !Validator.isValidParameterAllowedPropertiesForRequestElements({headers: allowedPropertiesForHeaders}))
            // {
            //     throw new InvalidArgumentsError(ErrorSafe.getData().DEV_1);
            // } TODO

            hooks = init(hooks, {});
            hooks.bearer = init(hooks.bearer, {});

            const headers = AuthController.extractAndAuthorizeHeaders(request, allowedPropertiesForHeaders);

            isExist(hooks.headers) ? await hooks.headers(headers) : undefined;

            next();
        }
        catch (error)
        {
            this.sendResponseWhenError(response, error);
        }
    }

    /**
     * Client must send `authorization` property in the header.
     *
     * Verifies private requests (which are closed to public and must be authorized and authenticated) using the authorization header.
     * Token must be sent using the authorization header must be sent.
     * Gets the cipher authorization bundle from the authorization header.
     * Decrypts and decodes it.
     * Retrieves the related account and checks if it exists, active (if activation is enabled), and not blocked.
     * Encodes and encrypts a new authorization bundle.
     * Puts it under locals ((http://expressjs.com/en/5x/api.html#res.locals)).
     *
     */
    public async verifyPrivate (request: any, response: any, next?: any, hooks?: VerifyPrivateHooks, allowedPropertiesForHeaders?: AllowedProperties): Promise<void>
    {
        try
        {
            if (isExist(allowedPropertiesForHeaders) && !Validator.isValidParameterAllowedPropertiesForRequestElements({headers: allowedPropertiesForHeaders}))
            {
                throw new InvalidArgumentsError(ErrorSafe.getData().DEV_1);
            }

            hooks = init(hooks, {});
            hooks.bearer = init(hooks.bearer, {});

            const headers = AuthController.extractAndAuthorizeHeaders(request, allowedPropertiesForHeaders, true);

            isExist(hooks.headers) ? await hooks.headers(headers) : undefined;

            if (!isExist(response.locals))
            {
                response.locals = {};
            }

            if (!isExist(headers.authorization))
            {
                throw new UnauthorizedError(ErrorSafe.getData().AUTHORIZATION_HEADER_MISSING);
            }

            let account;

            try
            {
                const result = await this.decryptAndDecodeAuthorizationBundle(headers.authorization, this.tokenPrivateKey);
                account = result.account;
            }
            catch (error: any)
            {
                if (error.name === "TokenExpiredError")
                {
                    throw new TokenExpiredError(ErrorSafe.getData().HTTP_223);
                }

                throw new InvalidTokenError(ErrorSafe.getData().HTTP_222);
            }

            // check if the account exists.
            if (!isExist(account))
            {
                throw new UnauthorizedError(ErrorSafe.getData().HTTP_22);
            }

            // check if the account is inactive (if activation is enabled).
            if (this.isActivationEnabled && !account.auth.isActive)
            {
                throw new ForbiddenError(ErrorSafe.getData().ACCOUNT_INACTIVE);
            }

            // check if the account is blocked.
            if (account.auth.isBlocked)
            {
                throw new ForbiddenError(ErrorSafe.getData().ACCOUNT_BLOCKED);
            }

            response.locals.account = account;
            response.locals.authorizationBundle = await this.generateEncryptedAuthorizationBundle(account, {}, this.tokenPrivateKey, this.tokenLifetime);
            response.locals.publicKey = account.encryption.rsa.publicKey;

            if (isExist(next))
            {
                next();
            }
            else
            {
                const data = {};
                isExist(hooks.data) ? await hooks.data(data, account) : undefined;

                await this.sendResponse(request, response, 200, data);
            }
        }
        catch (error)
        {
            this.sendResponseWhenError(response, error);
        }
    }

    public async register (request: any, response: any, next?: any, hooks: RegisterHooks = {}, allowedPropertiesForRequestElements?: AllowedPropertiesForRequestElements): Promise<void>
    {
        try
        {
            hooks.bearer = init(hooks.bearer, {});

            AuthController.extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
            AuthController.extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
            AuthController.extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString, false);
            const body = AuthController.extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body, true);

            isExist(hooks.body) ? await hooks.body(body) : undefined;

            const userIdentifier: string = body[this.propertyNameOfUserIdentifier];
            const password: string = body[this.propertyNameOfPassword];

            if (!isInitialized(userIdentifier) ||
                !isInitialized(password))
            {
                throw new BadRequestError(ErrorSafe.getData().HTTP_21);
            }

            isExist(hooks.userIdentifier) ? await hooks.userIdentifier(userIdentifier) : undefined;
            isExist(hooks.password) ? await hooks.password(password) : undefined;

            const query: any = {};
            query[this.propertyNameOfUserIdentifier] = userIdentifier;

            isExist(hooks.query) ? await hooks.query(query) : undefined;

            let activationCode: string | null = null;
            let activationLink: string | null = null;

            let account: Document | null;
            const {session} = SessionManager.generateSession(undefined, hooks.isSessionEnabled);
            await SessionManager.exec(
                async () =>
                {
                    account = await this.applicationService.dbService.dbOperation.readOne(query, {session}); // Using DB operation to use all querying features when needed.

                    // An account with the specified user identifier has already been registered.
                    if (isExist(account))
                    {
                        throw new ForbiddenError(ErrorSafe.getData().ACCOUNT_ALREADY_EXIST);
                    }

                    body.auth = {};
                    body.auth[this.propertyNameOfPassword] = await bcrypt.hash(password, 10);

                    if (this.isActivationEnabled)
                    {
                        body.auth.isActive = false;
                    }

                    body.auth.isBlocked = false;
                    body.auth.numberOfFailedLoginAttempts = 0;
                    body.auth.numberOfFailedChangePasswordAttempts = 0;

                    const key: string = crypto.generateKeySync("aes", {length: 256}).export().toString("hex");
                    const iv: string = crypto.randomBytes(16).toString("hex");
                    const keyPair: {publicKey: string, privateKey: string} = crypto.generateKeyPairSync(
                        "rsa",
                        {
                            modulusLength: 4096,
                            publicKeyEncoding: {
                                type: "pkcs1",
                                format: "pem"
                            },
                            privateKeyEncoding: {
                                type: "pkcs8",
                                format: "pem",
                                cipher: "aes-256-cbc",
                                passphrase: this.encryptionPassphrase
                            }
                        }
                    );

                    body.encryption = {
                        aes: {
                            key,
                            iv
                        },
                        rsa: {
                            publicKey: keyPair.publicKey,
                            privateKey: keyPair.privateKey
                        }
                    };

                    isExist(hooks.before) ? await hooks.before(body, session) : undefined;
                    account = await this.applicationService.createOne(body, session);
                    isExist(hooks.after) ? await hooks.after(account, session) : undefined;

                    if (this.isActivationEnabled)
                    {
                        activationCode = "";

                        for (let i = 0; i < 6; i++)
                        {
                            const randomDigit: number = crypto.randomInt(0, 10); // Generating a 1-digit random number between 0 and 9, both included.
                            activationCode += randomDigit.toString();
                        }

                        // @ts-ignore
                        activationLink = await this.generateEncryptedAuthorizationBundle(account, {activationCode}, this.activationLinkPrivateKey, this.activationLinkLifeTime); // Symmetric encryption.

                        account = await this.applicationService.updateOneByIdAndVersion(
                            account._id,
                            account.version,
                            {
                                auth: {
                                    isActive: false,
                                    activationCode
                                }
                            },
                            session
                        );
                    }
                },
                undefined,
                session
            );

            if (this.isActivationEnabled)
            {
                isExist(hooks.activation) ? await hooks.activation(account, activationCode, activationLink) : undefined;
            }
            else
            {
                // @ts-ignore
                response.locals.authorizationBundle = await this.generateEncryptedAuthorizationBundle(account, {}, this.tokenPrivateKey, this.tokenLifetime);
                // @ts-ignore
                response.locals.publicKey = account.encryption.rsa.publicKey;
            }

            const data = {};
            // @ts-ignore
            isExist(hooks.data) ? await hooks.data(data, account) : undefined;

            await this.sendResponse(request, response, 200, data);
        }
        catch (error)
        {
            this.sendResponseWhenError(response, error);
        }
    }

    async activate (request: any, response: any, next?: any, hooks: ActivateHooks = {}, allowedPropertiesForRequestElements?: AllowedPropertiesForRequestElements): Promise<void>
    {
        try
        {
            hooks.bearer = init(hooks.bearer, {});

            AuthController.extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
            AuthController.extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
            AuthController.extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString, false);
            const body = AuthController.extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body, true);

            isExist(hooks.body) ? await hooks.body(body) : undefined;

            const {activationLink, activationCode} = body;

            let account: Document | null;
            let tokenPayload: {[key: string]: any};

            try
            {
                if (!this.isActivationEnabled)
                {
                    throw new Error();
                }

                const result = await this.decryptAndDecodeAuthorizationBundle(activationLink, this.activationLinkPrivateKey);
                account = result.account;
                tokenPayload = result.tokenPayload;
            }
            catch (error: any)
            {
                if (error.name === "JsonWebTokenError")
                {
                    throw new BadRequestError(ErrorSafe.getData().ACTIVATION_LINK_MALFORMED);
                }
                else if (error.name === "TokenExpiredError")
                {
                    throw new BadRequestError(ErrorSafe.getData().ACTIVATION_LINK_EXPIRED);
                }

                throw new BadRequestError();
            }

            if (!isExist(tokenPayload) ||
                !isExist(tokenPayload.activationCode) ||
                tokenPayload.activationCode !== account.auth.activationCode ||
                activationCode !== account.auth.activationCode)
            {
                throw new BadRequestError(ErrorSafe.getData().ACTIVATION_CODE_INVALID);
            }

            const {session} = SessionManager.generateSession(undefined, hooks.isSessionEnabled);
            await SessionManager.exec(
                async () =>
                {
                    // @ts-ignore
                    isExist(hooks.before) ? await hooks.before(account, body, session) : undefined;
                    account = await this.applicationService.updateOneByIdAndVersion(
                        // @ts-ignore
                        account._id,
                        // @ts-ignore
                        account.version,
                        {
                            auth: {
                                isActive: true,
                                activationCode: null
                            }
                        },
                        session
                    );
                    // @ts-ignore
                    isExist(hooks.after) ? await hooks.after(account, session) : undefined;
                },
                undefined,
                session
            );

            response.locals.authorizationBundle = await this.generateEncryptedAuthorizationBundle(account, {}, this.tokenPrivateKey, this.tokenLifetime);
            response.locals.publicKey = account.encryption.rsa.publicKey;

            const data = {};
            isExist(hooks.data) ? await hooks.data(data, account) : undefined;

            await this.sendResponse(request, response, 200, data);
        }
        catch (error)
        {
            this.sendResponseWhenError(response, error);
        }
    }

    public async login (request: any, response: any, next?: any, hooks: LoginHooks = {}, allowedPropertiesForRequestElements?: AllowedPropertiesForRequestElements): Promise<void>
    {
        try
        {
            hooks.bearer = init(hooks.bearer, {});

            AuthController.extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
            AuthController.extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
            AuthController.extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString, false);
            const body = AuthController.extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body, true);

            isExist(hooks.body) ? await hooks.body(body) : undefined;

            const userIdentifier: string = body[this.propertyNameOfUserIdentifier];
            const password: string = body[this.propertyNameOfPassword];

            if (!isInitialized(userIdentifier) ||
                !isInitialized(password))
            {
                throw new BadRequestError(ErrorSafe.getData().HTTP_21);
            }

            const query: any = {};
            query[this.propertyNameOfUserIdentifier] = userIdentifier;

            isExist(hooks.query) ? await hooks.query(query) : undefined;

            let account: Document | null;
            let error: any = null;
            const {session} = SessionManager.generateSession(undefined, hooks.isSessionEnabled);
            await SessionManager.exec(
                async () =>
                {
                    account = await this.applicationService.dbService.dbOperation.readOne(query, {session}); // Using DB operation to use all querying features when needed.

                    // Check if the account does not exist.
                    if (!isExist(account))
                    {
                        throw new InvalidCredentialsError(ErrorSafe.getData().HTTP_221);
                    }

                    // Check if the password is correct.
                    const isPasswordCorrect = await bcrypt.compare(password, account.auth[this.propertyNameOfPassword]);
                    const newAccountProperties: any = {auth: {}};

                    if (!isPasswordCorrect)
                    {
                        error = new InvalidCredentialsError(ErrorSafe.getData().HTTP_221); // Not throwing the error immediately to increase the number of failed login attempts or block account.

                        newAccountProperties.auth.numberOfFailedLoginAttempts = account.auth.numberOfFailedLoginAttempts + 1; // If the password is incorrect, the number of failed login attempts must be increased.
                        newAccountProperties.auth.lastFailedLoginAttempt = new Date(); // If the password is incorrect, the time of the attempt must be recorded.

                        if (newAccountProperties.auth.numberOfFailedLoginAttempts >= this.maxAllowedInvalidLoginAttempts)
                        {
                            newAccountProperties.auth.isBlocked = true;
                            error = new AccountBlockedError(ErrorSafe.getData().HTTP_224);
                        }
                    }
                    else
                    {
                        // Check if the account is inactive. Only if the password is correct.
                        if (this.isActivationEnabled && !account.auth.isActive)
                        {
                            throw new ForbiddenError(ErrorSafe.getData().ACCOUNT_INACTIVE);
                        }

                        // Check if the account is blocked. Only if the password is correct.
                        if (account.auth.isBlocked)
                        {
                            throw new ForbiddenError(ErrorSafe.getData().ACCOUNT_BLOCKED);
                        }

                        newAccountProperties.auth.numberOfFailedLoginAttempts = 0; // If the password is correct, the number of failed login attempts must be reset.
                        newAccountProperties.auth.lastSuccessfulLogin = new Date(); // If the password is correct, the time of the login must be recorded.
                    }

                    account = await this.applicationService.updateOneByIdAndVersion(account._id, account.version, newAccountProperties, session, {bearer: hooks.bearer});

                },
                undefined,
                session
            );

            if (isExist(error))
            {
                throw error;
            }

            response.locals.authorizationBundle = await this.generateEncryptedAuthorizationBundle(account, {}, this.tokenPrivateKey, this.tokenLifetime);
            response.locals.publicKey = account.encryption.rsa.publicKey;

            const data = {};
            isExist(hooks.data) ? await hooks.data(data, account) : undefined;

            await this.sendResponse(request, response, 200, data);
        }
        catch (error)
        {
            this.sendResponseWhenError(response, error);
        }
    }

    async authorize (request: any, response: any, next?: any, hooks: AuthorizeHooks = {}, allowedPropertiesForRequestElements?: AllowedPropertiesForRequestElements): Promise<void>
    {
        try
        {
            AuthController.extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
            AuthController.extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
            AuthController.extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString, false);
            const body = AuthController.extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body, true);

            isExist(hooks.body) ? await hooks.body(body) : undefined;

            const {token: encryptedToken, key: publicKey} = body;

            const accountRelatedToPublicKey: Document = await this.applicationService.readOne({encryption: {rsa: {publicKey}}});

            if (!isExist(accountRelatedToPublicKey))
            {
                throw new UnauthorizedError(ErrorSafe.getData().HTTP_22);
            }

            let encryptedAuthorizationBundle: string;
            let account: Document;
            let tokenPayload: any;

            try
            {
                const privateKey = crypto.createPrivateKey({key: accountRelatedToPublicKey.encryption.rsa.privateKey, passphrase: this.encryptionPassphrase})
                                         .export({type: "pkcs8", format: "pem"})
                                         .toString("hex");
                const cipher = new NodeRSA(privateKey);

                encryptedAuthorizationBundle = cipher.decrypt(encryptedToken).toString();
            }
            catch
            {
                throw new UnauthorizedError(ErrorSafe.getData().HTTP_22);
            }

            try
            {
                const result = await this.decryptAndDecodeAuthorizationBundle(encryptedAuthorizationBundle, this.tokenPrivateKey);
                account = result.account;
            }
            catch (error: any)
            {
                if (error.name === "TokenExpiredError")
                {
                    throw new TokenExpiredError(ErrorSafe.getData().HTTP_223);
                }

                throw new InvalidTokenError(ErrorSafe.getData().HTTP_222);
            }

            // Check if the account related to the sent public key is the same as the account related to the token.
            if (isSameIds(accountRelatedToPublicKey._id, account._id))
            {
                throw new ForbiddenError(ErrorSafe.getData().ACCOUNT_INACTIVE);
            }

            // Check if the account is inactive (when activation is enabled).
            if (this.isActivationEnabled && !accountRelatedToPublicKey.auth.isActive)
            {
                throw new ForbiddenError(ErrorSafe.getData().ACCOUNT_INACTIVE);
            }

            // Check if the account is blocked.
            if (accountRelatedToPublicKey.auth.isBlocked)
            {
                throw new ForbiddenError(ErrorSafe.getData().ACCOUNT_BLOCKED);
            }

            response.locals.account = account;
            response.locals.authorizationBundle = await this.generateEncryptedAuthorizationBundle(accountRelatedToPublicKey, {}, this.tokenPrivateKey, this.tokenLifetime);
            response.locals.publicKey = accountRelatedToPublicKey.encryption.rsa.publicKey;

            const data = {};
            isExist(hooks.data) ? await hooks.data(data, account) : undefined;

            await this.sendResponse(request, response, 200, data);
        }
        catch (error)
        {
            this.sendResponseWhenError(response, error);
        }
    }

    async changePassword (request: any, response: any, next?: any, hooks: ChangePasswordHooks = {}, allowedPropertiesForRequestElements?: AllowedPropertiesForRequestElements): Promise<void>
    {
        try
        {
            let account: Document | null | undefined = response.locals.account;

            // Verify private must be used before but not used.
            if (!isExist(account))
            {
                throw new InvalidArgumentsError(ErrorSafe.getData().DEV_1);
            }

            hooks.bearer = init(hooks.bearer, {});

            AuthController.extractAndAuthorizeHeaders(request, allowedPropertiesForRequestElements.headers, false);
            AuthController.extractAndAuthorizePathParameters(request, allowedPropertiesForRequestElements.pathParameters, false);
            AuthController.extractAndAuthorizeQueryString(request, allowedPropertiesForRequestElements.queryString, false);
            const body = AuthController.extractAndAuthorizeBody(request, allowedPropertiesForRequestElements.body, true);

            isExist(hooks.body) ? await hooks.body(body) : undefined;

            const propertyNameOfPassword = `${this.propertyNameOfPassword.charAt(0).toUpperCase()}${this.propertyNameOfPassword.slice(1)}`;
            const oldPassword = body[`old${propertyNameOfPassword}`];
            const newPassword = body[`new${propertyNameOfPassword}`];

            if (!isInitialized(oldPassword) ||
                !isInitialized(newPassword))
            {
                throw new BadRequestError(ErrorSafe.getData().HTTP_21);
            }

            isExist(hooks.password) ? await hooks.password(oldPassword, newPassword) : undefined;

            let error: any = null;
            const {session} = SessionManager.generateSession(undefined, hooks.isSessionEnabled);
            await SessionManager.exec(
                async () =>
                {
                    account = await this.applicationService.readOneById(account._id, session, session, {bearer: hooks.bearer});
                    isExist(hooks.account) ? await hooks.account(account, session) : undefined;

                    // Check if the password is correct.
                    const isPasswordCorrect = await bcrypt.compare(oldPassword, account.auth.password);
                    const newAccountProperties: any = {auth: {}};

                    if (!isPasswordCorrect)
                    {
                        error = new BadRequestError(ErrorSafe.getData().PASSWORD_WRONG); // Not throwing the error immediately to increase the number of failed login attempts or block account.

                        newAccountProperties.auth.numberOfFailedLoginAttempts = account.auth.numberOfFailedLoginAttempts + 1; // If the old password is incorrect, the number of failed login attempts must be increased.
                        newAccountProperties.auth.lastFailedChangePasswordAttempt = new Date(); // If the password is incorrect, the time of the attempt must be recorded.

                        if (newAccountProperties.auth.numberOfFailedChangePasswordAttempts >= this.maxAllowedInvalidChangePasswordAttempts)
                        {
                            newAccountProperties.auth.isBlocked = true;
                            error = new AccountBlockedError(ErrorSafe.getData().HTTP_224);
                        }
                    }
                    else
                    {
                        // Check if the new password is different than the old password.
                        if (oldPassword === newPassword)
                        {
                            error = new BadRequestError(ErrorSafe.getData().PASSWORD_UNCHANGED);
                        }
                        else
                        {
                            newAccountProperties.auth.numberOfFailedChangePasswordAttempts = 0; // If the password is correct, the number of failed change password attempts must be reset.
                            newAccountProperties.auth.lastSuccessfulChangePassword = new Date(); // If the password is correct, the time of the change password must be recorded.

                            newAccountProperties.auth[this.propertyNameOfPassword] = await bcrypt.hash(newPassword, 10);
                        }
                    }

                    account = await this.applicationService.updateOneByIdAndVersion(account._id, account.version, newAccountProperties, session, {bearer: hooks.bearer});
                },
                undefined,
                session
            );

            if (isExist(error))
            {
                throw error;
            }

            const data = {};
            isExist(hooks.data) ? await hooks.data(data, account) : undefined;

            await this.sendResponse(request, response, 200, data);
        }
        catch (error)
        {
            this.sendResponseWhenError(response, error);
        }
    }

    /**
     * > Encrypted "Authorization Bundle" (symmetric app key)
     * ----> Authorization Bundle: Encrypted "Token" (symmetric account key) + "Account ID"
     * --------> Token: Sign "Payload" (symmetric app key) (vulnerable)
     * ------------> Payload: "Account ID" + "Some Data"
     *
     * 1) Generate -> "Payload"
     * 2) +Sign -> "Token"
     * 3) +Encrypt -> "Token"
     * 4) Generate -> "Authorization Bundle"
     * 5) +Encrypt -> "Authorization Bundle"
     *
     * +: Reverse of Decrypt.
     */
    private async generateEncryptedAuthorizationBundle (account: Document, tokenPayload: any, tokenPrivateKey: string, tokenLifeTime: number): Promise<string>
    {
        tokenPayload._account = account._id;

        const token = jwt.sign(
            JSON.stringify(tokenPayload),
            tokenPrivateKey,
            {
                algorithm: "HS512",
                expiresIn: tokenLifeTime
            }
        );

        const encryptedToken = this.encrypt(token, account.encryption.aes.key, account.encryption.aes.iv);

        const authorizationBundle = {
            token: encryptedToken,
            _account: account._id
        };

        return this.encrypt(JSON.stringify(authorizationBundle), this.encryptionKey, this.encryptionIv);
    }

    /**
     * > Encrypted "Authorization Bundle" (symmetric app key)
     * ----> Authorization Bundle: Encrypted "Token" (symmetric account key) + "Account ID"
     * --------> Token: Sign "Payload" (symmetric app key) (vulnerable)
     * ------------> Payload: "Account ID" + "Some Data"
     *
     * 1) +Decrypt -> Encrypted "Authorization Bundle" (symmetric app key)
     * 2) Check -> If the account exists using the account ID from "Authorization Bundle".
     * 3) +Decrypt -> Encrypted "Token" from "Authorization Bundle"
     * 4) +Verify -> "Token"
     * 5) Check -> The account ID from "Payload" against "Authorization Bundle"
     *
     * +: Reverse of Encrypt.
     */
    private async decryptAndDecodeAuthorizationBundle (encryptedAuthorizationBundle: string, tokenPrivateKey: string): Promise<{account: Document, tokenPayload: any}>
    {
        // 1)
        const authorizationBundle: any = JSON.parse(this.decrypt(encryptedAuthorizationBundle, this.encryptionKey, this.encryptionIv));

        // 2)
        const account: Document | null = await this.applicationService.readOneById(authorizationBundle._account);

        if (!isExist(account))
        {
            throw new UnauthorizedError(ErrorSafe.getData().HTTP_22);
        }

        // 3)
        const token = this.decrypt(authorizationBundle.token, account.encryption.aes.key, account.encryption.aes.iv);

        // 4)
        const tokenPayload: any = JSON.parse(<string>jwt.verify(token, tokenPrivateKey));

        // 5)
        if (!isSameIds(authorizationBundle._account, tokenPayload._account))
        {
            throw new UnauthorizedError(ErrorSafe.getData().HTTP_22);
        }

        return {
            account,
            tokenPayload
        };
    }

    private encrypt (plainText: string, key: string, iv: string): string
    {
        const encoding = {
            input: "utf-8",
            output: "hex"
        };

        const cipher = crypto.createCipheriv(AuthController.ENCRYPTION_ALGORITHM, Buffer.from(key, "hex"), Buffer.from(iv, "hex"));

        // @ts-ignore
        let cipherText: string = cipher.update(plainText, encoding.input, encoding.output);
        // @ts-ignore
        cipherText += cipher.final(encoding.output);

        return cipherText;
    }

    private decrypt (encryptedText: string, key: string, iv: string)
    {
        const encoding = {
            input: "hex",
            output: "utf8"
        };

        const decipher = crypto.createDecipheriv(AuthController.ENCRYPTION_ALGORITHM, Buffer.from(key, "hex"), Buffer.from(iv, "hex"));

        // @ts-ignore
        let decryptedMessage: string = decipher.update(encryptedText, encoding.input, encoding.output);
        // @ts-ignore
        decryptedMessage += decipher.final(encoding.output);

        return decryptedMessage;
    }
}

export default AuthController;
