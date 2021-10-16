# @thedolphinos/cell

A framework to build server side applications using MongoDB, Node.js and Express.

# 1. [Cell](https://github.com/thedolphinos/cell/blob/master/lib/core/Cell.js)

Cell is the initiation point of the framework. You can start the application by calling the method `createLife` with the argument `config`.

## 1.1. Flow of the method `createLife`

- Logger sends an info log that indicates the execution is started.
- Activation of Node.js event handlers for uncaught exception and unhandled rejection.
- Validation of `config`.
- Setting errors to `ErrorSafe` where you can easily access.
- Interception of `init`. You are advised to set languages to `LanguageSafe` here.
- If DB is enabled,
    - Establishing the DB connection.
    - Interception of `dbConnection`. You are advised to register your DBs here.
- If server is enabled,
    - Interception of `app`. You are advised to add define Express settings, and add middlewares and routes here.
    - Creating the server.
- Interception of `final`. You are advised to introduce your injectors (if you need any) here.
- Logger sends an info log that indicates the execution completed successfully.

## 1.2. `config`

Where you can manage servers, DBs, interceptors, and errors. It is in JSON format.

### 1.2.1. Server

Where you can manage servers. You don't have to define it, if you don't want the application to serve.

- `isEnabled`: Allows enabling/disabling both HTTP and HTTPS servers.
- `options`: Container for HTTP and HTTPS servers. You don't have to define it, if `config.server.isEnabled` is false.
- `options.http`: Container for HTTP server.
- `options.http.isEnabled`: Allows enabling/disabling HTTP server.
- `options.http.config`: Container for HTTP server configurations. You don't have to define it, if `config.server.options.http.isEnabled` is false.
- `options.http.config.port`: Represents port number of HTTP server.
- `options.https`: Container for HTTPS server.
- `options.https.isEnabled`: Allows enabling/disabling HTTPS server.
- `options.https.config`: Container for HTTPS server configurations. You don't have to define it, if `config.server.options.https.isEnabled` is false.
- `options.https.config.port`: Represents port number of HTTPS server.
- `options.https.config.sslTlsCertificate`: Container for SSL/TLS certificate.
- `options.https.config.sslTlsCertificate.key`: Represent the path of the private key of the SSL/TLS certificate.
- `options.https.config.sslTlsCertificate.cert`: Represent the path of the public key of the SSL/TLS certificate.
- `options.https.config.sslTlsCertificate.ca`: Represent the path of the certificate authority of the SSL/TLS certificate.

```
{
  ...,
  server: {
    isEnabled: true,
    options: {
      http: {
        isEnabled: true,
        config: {
          port: 3000
        }
      },
      https: {
        isEnabled: true,
        config: {
          port: 3001,
          sslTlsCertificate: {
            key: "xyz_key_data_comes_here",
            cert: "xyz_cert_data_comes_here",
            ca: "xyz_ca_data_comes_here"
          }
        }
      }
    }
  },
  ...
}
```

### 1.2.2. DB

Where you can manage DBs. You don't have to define it, if you don't want to use a DB in the application.

- `connection`: Container for DB connection.
- `connection.uri`: DB connection [URI](https://docs.mongodb.com/manual/reference/connection-string/).
- `connection.options`: DB connection [options](https://docs.mongodb.com/manual/reference/connection-string/#connection-options). You don't have to define it.

```
  ...,
  db: {
    connection: {
      uri: "mongodb+srv://xyz_username:xyz_password@xyz_something.mongodb.net/xyz_db?retryWrites=true&w=majority",
      options: {
        useNewUrlParser: true,
        useUnifiedTopology: true
      }
    }
  },
  ...
```

### 1.2.3 Interceptors

Where you can manage interceptors. You don't have to define it, if you don't want to use interceptors. However, if you want to build a complex application, they are where you build the application logic.

- `init`: Container for init interceptor which works after setting the errors to the error safe and before opening the DB connection. You don't have to define it.
- `init.path`: Represent the path of init interceptor.
- `dbConnection`: Container for DB connection interceptor which works after opening the DB connection and before running the Express. You don't have to define it.
- `dbConnection.path`: Represent the path of DB connection interceptor.
- `app`: Container for app interceptor which works after running the Express and before creating the server. You don't have to define it.
- `app.path`: Represent the path of app interceptor.
- `final`: Container for final interceptor which works after creating the server. You don't have to define it.
- `final.path`: Represent the path of final interceptor.

```
  ...,
  interceptors: {
    init: {
      path: path.join(__dirname, "../interceptors/init.interceptor.js")
    },
    app: {
      path: path.join(__dirname, "../interceptors/app.interceptor.js")
    },
    dbConnection: {
      path: path.join(__dirname, "../interceptors/dbConnection.interceptor.js")
    },
    final: {
      path: path.join(__dirname, "../interceptors/final.interceptor.js")
    }
  },
  ...
```

### 1.2.4. Errors

Where you can add a new error or override errors. You don't have to define it, if you don't want to add a new error or override errors.
\
\
In overridden errors, since Cell uses [the module `DATA` of the package `@thedolphinos/error4js`](https://github.com/thedolphinos/error4js/blob/master/lib/DATA.json) and overrides it with [Cell module `ERROR_DATA`](https://github.com/thedolphinos/cell/blob/master/lib/helpers/ERROR_DATA.json), structure of error data must be identical of the form of `DATA` and `ERROR_DATA`. The first level keys (e.g. BASE, DEV_0, DOCUMENT_INVALID_VERSION, etc.) and the second level keys (code, message) must not be updated. To override, you should update the value of `code` which must be a string, and the value of `message` which must be an object where the keys must be the languages and the values must be a string.
\
\
In newly added errors, you are free to choose any structure. However, if you are going to use [@thedolphinos/error4js](https://github.com/thedolphinos/error4js)'s error structure which you can observe in [`BaseError`](https://github.com/thedolphinos/error4js/blob/master/lib/core/BaseError.js), again structure of error data must be identical of the form of `DATA` and `ERROR_DATA`.

```
  ...,
  error: {
    "BASE": {
      "code": "ERR_UNKNOWN",
      "message": {
        "en": "An unknown error is occurred.",
        "tr": "Bilinmeyen bir hata oluştu."
      }
    },
    "UNSUPPORTED_ACTION": {
      "code": "900",
      "message": {
        "en": "Oops! Something went wrong.",
        "tr": "Eyvah! Bir şeyler yanlış gitti."
      }
    }
  },
  ...
```
