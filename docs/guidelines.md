# Guidelines

## Naming

### File

* Class: PascalCase
* Enum: SCREAMING_SNAKE_CASE
* Other: kebab-case

### Directory

* kebab-case

## Imports

* Imports should be ordered by category.
* Separate categories with a new line.

### Import Order by Category

1. Node.js Core Modules:
    * path
    * fs
    * process
    * http
    * https
    * crypto
2. Third-Party Packages:
    * lodash as _
    * express
    * mongo
    * node-rsa
    * bcrypt
    * jsonwebtoken
3. dolphinOS Packages:
    * utility4js
        * isExist
        * isInitialized
        * isValidNumber
        * isValidDate
        * toUTCDateString
        * toPromise
        * assignIfExist
        * isValidEnum
        * isValidEnumValue
        * toEnum
        * traverseRequireExecuteDeep
        * isObjectId
        * isValidId
        * isSameIds
        * toObjectId
        * init
        * removePropertiesDeeply
        * removePropertiesFromObjectDeeply
        * removePropertiesFromArrayDeeply
        * removeNotExistedPropertiesDeeply
        * removeNotExistedPropertiesFromObjectDeeply
        * removeNotExistedPropertiesFromArrayDeeply
    * error4js
        * BaseError
        * DeveloperError
        * InvalidArgumentsError
        * StaticClassInstantiationError
        * FileNotExistError
        * DirectoryNotExistError
        * DbError
        * DocumentNotFoundError
        * MoreThan1DocumentFoundError
        * HTTPError
        * ServerError
        * ClientError
        * InternalServerError
        * BadRequestError
        * UnauthorizedError
        * ForbiddenError
        * HeadersMissingError
        * HeaderParameterMissingError
        * PathParametersMissingError
        * PathParameterMissingError
        * QueryStringMissingError
        * QueryStringParameterMissingError
        * BodyMissingError
        * BodyParameterMissingError
        * RequiredPropertiesMissingError
        * InvalidCredentialsError
        * InvalidTokenError
        * TokenExpiredError
        * AccountBlockedError
        * DATA
4. Project-Specific Modules:
    * Cell
    * Logger
    * Validator
    * Interceptor
    * ERROR_DATA
    * Safe (according to the order introduced)
        * ErrorSafe
        * LanguageSafe
        * DbConnectionSafe
    * DbConnection
    * SessionManager
    * Server
    * Injector
    * BsonType
    * Schema
    * DbOperation
    * Service
    * DbService
    * ApplicationService
    * ControllerService
    * DataType
    * Controller
    * AuthController
    * CrudController
    * Router

## Comments

* When something that requires further attention is encounter but don’t have time to address it immediately, leave a TODO comment.

### Function Description

* Explains the function.
    * Starts with a verb in the third-person singular.

(Empty line)

* @private/@protected/@public
    * Use if the function is inside a class.
* @static
    * Use if the function is inside a class.

(Empty line)

* @param (0 or n):
    * Specify the type.
    * Specify if optional.
    * Explain the parameter, starting with a dash.
* @returns (1):
    * Specify the type.
    * If nothing is returned, specify void.
    * Explain the return value, starting with a dash.

(Empty line)

* @throws (0 or n):
    * Explain the error, starting with a dash.
    * Separate different errors with a new entry.
    * If the same error is thrown in different places, it is counted as one entry.

(Empty line)

* @example (0 or n):
    * No explanation before examples.
    * Examples can span multiple lines.
    * Separate different examples with a new entry.
    * If there are multiple examples, separate each with an empty line.

## Class

### Class Members

* variables
    * static
    * instance
    * getter/setter (under each corresponding instance) (no method/parameter description)
* methods
    * constructor
    * instance
    * static
        * validate parameters (no method/parameter description)
            * _isValidParameterX
            * _validateParameterX
