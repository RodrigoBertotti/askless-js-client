# Documentation

:checkered_flag: [Português (Portuguese)](portugues_documentacao.md)

Documentation of the JavaScript Client. 
[Click here](https://github.com/WiseTap/askless) to access 
the server side in Node.js.


 ## Important links
 *  [Getting Started](../README.md): Regard to the JavaScript Client.
 *  [Getting Started (server)](https://github.com/WiseTap/askless): Askless back-end server in Node.js.
 *  [chat (example)](../example/chat-js/index.js): Chat between the colors blue and green.
 *  [catalog (example)](../example/catalog-js/index.js): Users adding and removing products from a catalog.

## `init(...)` - Configuring the client

The client can be initialized with the method `init`.

### Params

#### serverUrl

The URL of the server, must start with `ws://` or `wss://`. Example: `ws://192.168.2.1:3000`.

#### projectName
 Name for this project. 
 If `!= null`: the field `projectName` on server side must have the same name (optional).

#### logger

 Allow to customize the behavior of internal logs and enable/disable the default logger (optional).

#####  Params:
  
###### useDefaultLogger
 If `true`: the default logger will be used (optional). Set to `false` on a production environment. Default: `false`

###### customLogger

 Allows the implementation of a custom logger (optional). Let it `null` on a production environment

##### Example

    // Reuse this instance in different pages of your App
    export const asklessClient = new AsklessClient(); 

...

    asklessClient.init({
        serverUrl: 'ws://192.168.2.1:3000',
        projectName: 'MyApp',
        logger: {
            useDefaultLogger: false,
            customLogger: (message, level, additionalData) => {
                if(level !== 'debug'){
                    console.log(level + ": "+ message);
                    if(additionalData != null){
                        console.log(additionalData);
                    }
                }
            }
        }
    });

## `connect(...)`- Connecting to the server

Try to perform a connection with the server.

In the server side, you can implement [grantConnection](https://github.com/WiseTap/askless/blob/master/documentation/english_documentation.md#grantconnection)
to accept or deny connections attempts from the client.

Returns the result of the connection attempt.

### Params

#### `ownClientId`
The ID of the user defined in your application.
This field must NOT be `null` when the user is logging in, 
otherwise must be `null` (optional).

#### `headers`
Allows informing the token of the respective `ownClientId` (and/or additional data)
so that the server can be able to accept or deny the connection attempt (optional).

### Example

    asklessClient.connect({
        ownClientId: ownClientId,
        headers: {
            'Authorization': 'Bearer abcd'
        }
    }).then((response) => {
        console.log(response.isSuccess());
    });

### Accepting or rejecting a connection attempt

On the server side, you can implement [grantConnection](https://github.com/WiseTap/askless/blob/master/documentation/english_documentation.md#grantconnection)
to accept or deny connection attempts from the client.

#### Best practices

*Before reading this subsection, is necessary read the [create](#create) section.*

A simple way of authentication would be the client inform the email 
and password in the `header` field of the `connect` method:

    // Not recommended
    asklessClient.connect({
        headers: {
            "email" : "me@example.com",
            "password": "123456"
        }
    });
    
The problem of using this way is that the user would have to keep informing the e-mail and
password every time that he wants to access the application.

To avoid this, is **recommended** the creation of a route that allows 
to inform the e-mail and password in the body of a request and receive
the corresponding **ownClientId** and a **token** as response.
In this way, the token can be set in the `headers` field of the `connect` method.

#### Example
    
    // 'token' is an example of a route to
    // request a token on the server side
    // by informing the e-mail and password
    asklessClient.create({ 
        route: 'token',
        body: {
            'email' : 'me@example.com',
            'password': '123456'
        }
    }).then((loginResponse) => {
       if(loginResponse.isSuccess()){        
       
           // Save the token locally:
           myLocalRepository.saveToken(
               loginResponse.output['ownClientId'], 
               loginResponse.output['Authorization']
           );
           
           // Reconnect informing the token and ownClientId
           // obtained in the last response
           asklessClient.connect({
               ownClientId: loginResponse.output['ownClientId'],
               headers: {
                   'Authorization' : loginResponse.output['Authorization']
               }
           }).then((connection) => {
               if(connection.isSuccess()){
                   console.log("Connected as me@example.com!");
               }else{
                   console.log("Failed to connect, connecting again as unlogged user...");
                   asklessClient.connect();
               }
           })
       }
    });

## `init` and `connect`
Where must you call `init` and `connect`? 

`init` must be called **only once**, preferably where the application starts,
therefore, is recommended that the initialization occur on `main.dart`.

`connect` can be called multiple times, 
since the user can do login and logout.

| Where                                                                                                              |     `connect`      |       `init`       |
| -----------------------------------------------------------------------------------------------------------------: |:------------------:|:------------------:|
| main.dart                                                                                                          | :heavy_check_mark: | :heavy_check_mark: |
| When the user do login                                                                                             | :heavy_check_mark: | :x:                |
| After a disconnect (example: user did logout) *                                                                    | :heavy_check_mark: | :x:                |
| override `build` of a widget                                                                                       | :x:                | :x:                |
| override `init` of a shared widget                                                                                 | :x:                | :x:                |
| override `init` of a widget that appears **only once**, when the App starts (e.g. in a `loading_app.dart` file)    | :heavy_check_mark: | :heavy_check_mark: |

\* After a logout, it may be necessary for the user to read data from server,
therefore, even after a logout can be done a `connect` with  
`ownClientId` being `null`.

## `reconnect()` - Reconnecting
Reconnects to the server using the same credentials
as the previous informed in `connect`.

Returns the result of the connection attempt.

## `disconnect()` - Disconnecting from the server
Stop the connection with the server and clear the credentials `headers` and `ownClientId`.

## `connection`
Get the status of the connection with the server.

## `disconnectReason`
May indicate the reason of no connection.

## `addOnConnectionChange(...)`

### Params

`listener` Adds a `listener` that will be triggered
every time the status of connection with 
the server changes.

`runListenerNow` Default: true. If `true`: the `listener` is called
right after being added (optional).

## `removeOnConnectionChange(listener)`
Removes the added `listener `.

## `create(...)`

 Creates data in the server.

#### Params

  `body` The data that will be created.

  `route` The path of the route.

  `query` Additional data (optional).

  `neverTimeout` Default: `false` (optional). If `true`: the
  request will be performed as soon as possible,
   without timeout.
  If `false`: the field `requestTimeoutInSeconds` defined in the server side
  will be the timeout.

#### Example
 
    asklessClient
        .create({
            route: 'product',
            body: {
                'name' : 'Video Game',
                'price' : 500,
                'discount' : 0.1
            }
        }).then((response) => {
            console.log(response.isSuccess() ? 'Success' : 'Error');
        });
      

## `read(...)`
 Read data once.

#### Params

 `route` The path of the route.

 `query` Additional data (optional), 
 here can be added a filter to indicate to the server
 which data this client will receive.

 `neverTimeout` Default: `false` (optional). If `true`: the
 request will be performed as soon as possible,
 without timeout.
 If `false`: the field `requestTimeoutInSeconds` defined in the server side
 will be the timeout.

#### Example
 
    asklessClient
        .read({
            route: 'allProducts',
            query: {
                'nameContains' : 'game'
            },
            neverTimeout: true
        }).then((res) => {
            for (let key in res.output) {
                if(res.output.hasOwnProperty(key)){
                    console.log(res.output[key]);
                }
            }
        });
      

## `listen(...)`

 Get realtime data using `stream`.
 
 Returns a [Listening](#listening).

### Params

 `route` The path of the route.

 `query` Additional data (optional), 
 here can be added a filter to indicate to the server
 which data this client will receive.

### Example

    const listeningForNewGamingProducts = asklessClient
        .listen({
            route: 'allProducts',
            query: {
                'nameContains' : 'game'
            },
            listener: (newRealtimeData:NewDataForListener) => {
                for (let outputKey in newRealtimeData.output) {
                    if(newRealtimeData.output.hasOwnProperty(outputKey)){
                        console.log("product has been added: ");
                        console.log(newRealtimeData[outputKey]);
                    }
                }
            }
        });
        
**important**: Stop listening to the route
    
 Is necessary to stop listening when is appropriated,
 like when the user go to another screen of the application:
    
    listeningForNewGamingProducts.close();

## `update(...)`
 Updates data in the server.

#### Params

 `body` The entire data or field(s) that will be updated.

 `route` The path route.

 `query` Additional data (optional).

  `neverTimeout` Default: `false` (optional). If `true`: the
  request will be performed as soon as possible,
   without timeout.
  If `false`: the field `requestTimeoutInSeconds` defined in the server side
  will be the timeout.

#### Example

    asklessClient
        .update({
            route: 'allProducts',
            query: {
                'nameContains' : 'game'
            },
            body: {
                'discount' : 0.8
            },
        }).then((res) => {
            console.log(res.isSuccess() ? 'Success' : 'Error '+res.error.code);
        });

## `delete(...)`
 Removes data from server.

### Params

 `route` The path route.

 `query` Additional data, indicate here which data will be removed.

 `neverTimeout` Default: `false` (optional). If `true`: the
 request will be performed as soon as possible,
 without timeout.
 If `false`: the field `requestTimeoutInSeconds` defined in the server side
 will be the timeout.

#### Example

    asklessClient
        .delete({
            route: 'product',
            query: {
                'id': 1
            },
        }).then((res) => {
            console.log(res.isSuccess() ? 'Success' : 'Error '+res.error.code);
        });

## Classes
## `ResponseCli`
The response of an operation in the server.

### Fields

#### `clientRequestId`
 Request ID generated by the client. 

#### `output`
 Result of operation in the server.

 Do NOT use this field tho check if the operation
 failed (because it can be null even in case of success),
 instead use `isSuccess()`.

#### `isSuccess()`  
 Returns `true` if the response is a success.

#### `error`  
 Is the response error in case where `isSuccess() == false`.
 
## `Listening`
 Listening for new data from the server. Is the return of the [listen](#listen) method.

## Fields

### `close()`
 Stop receiving realtime data from server.

### `setListener(listener)`
 Sets a new listener.
