# Fundamental Conventions

- todo: When you feel something, and you don't have time to act, leave a todo!

# Import Conventions

- Import order:
    - Node.js Modules
        - path
        - fs
        - http
        - https
        - util
        - crypto
    - dolphinOS Modules
        - error4js
            - BaseError
            - DeveloperError
            - InvalidArgumentsError
            - StaticClassInstantiationError
            - FileNotExistError
            - DirectoryNotExistError
            - DbError
            - DocumentNotFoundError
            - MoreThan1DocumentFoundError
            - HTTPError
            - ServerError
            - ClientError
            - InternalServerError
            - BadRequestError
            - UnauthorizedError
            - ForbiddenError
            - HeadersMissingError
            - HeaderParameterMissingError
            - PathParametersMissingError
            - PathParameterMissingError
            - QueryStringMissingError
            - QueryStringParameterMissingError
            - BodyMissingError
            - BodyParameterMissingError
            - RequiredPropertiesMissingError
            - InvalidCredentialsError
            - InvalidTokenError
            - AccountBlockedError
            - TokenExpiredError
            - DATA
        - utility4js
        - cell
            - Error
            - Cell
            - Logger
            - Safe
            - DbSafe
            - LanguageSafe
            - Injector
            - BsonType
            - Schema
            - DbOperation
            - SessionManager
            - DbService
            - ApplicationService
            - ControllerService
            - DataType
            - Controller
            - AuthController
            - CrudController
            - Router
            - Validator
    - 3rd Party Modules
        - lodash as _
        - mongodb
            - MongoError
            - Int32
            - Double
            - ObjectId
            - MongoClient
            - Collection
            - ClientSession
        - express
        - bcrypt
        - jsonwebtoken as jwt
        - aws-sdk as AWS
        - mongo-dot-notation as mongoDotNotation
        - mimemessage
        - validator
        - node-email-validator as emailValidator
    - Own Modules
        - Cell
        - Logger
        - Safe
        - SingularSafe
        - ErrorSafe
        - DbConnectionSafe
        - DbSafe
        - LanguageSafe
        - Interceptor
        - Server
        - DbConnection
        - Injector
        - BsonType
        - Schema
        - DbOperation
        - SessionManager
        - Service
        - DbService
        - ApplicationService
        - ControllerService
        - DataType
        - Controller
        - AuthController
        - CrudController
        - Router
        - Validator
        - ERROR_DATA
- An empty line must be inserted between the categories.
- In selective imports, if more than 1 module is imported, modules must be on separate lines.

# Structure Conventions

- Class member order:
    - variables
        - static
        - instance
        - getter/setter (under each corresponding instance) (no method/parameter description)
    - methods
        - constructor
        - instance
        - static
            - validate parameters (no method/parameter description)
                - _isValidParameterX
                - _validateParameterX
- Comment tag order:
    - @typedef (above each corresponding @param or @typedef)
    - @type
    - @param (if default value is provided it must be included in the comment (e.g. Default is `"ALL"`.))
    - @return
    - @public/@protected/@private
