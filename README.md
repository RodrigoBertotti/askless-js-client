# DISCONTINUED
The JavaScript Client of Askless is discontinued, 
if is useful for you, you can show interest in a continuation of Askless JS Client by sending me an email: rodrigo@wisetap.com

For Flutter Devs, check the Flutter Client of Askless here: [askless-flutter-client](https://github.com/RodrigoBertotti/askless-flutter-client)

---

# Askless - JavaScript client

JavaScript client of Askless framework, which facilitates building realtime servers for JavaScript and Flutter Apps
allowing to:

- :handshake: perform a websocket connection to exchange data that:

    - :vibration_mode: supports streams on the client side in Flutter

    - :computer: supports JavaScript clients: Web and Node.js

    - :arrow_right_hook: it retries to send data automatically in case of connectivity issues between the client and the server
 
    - :label: handles multiples and identical `listen` requests from a client as a single one in the server

- :pencil2: create your own CRUD operations with any database you like (**C**reate, **R**ead, **U**pdate and **D**elete)

- :no_entry: restrict client access to CRUD operations

- :mega: notify in real-time clients who are listening for changes in a route, you can choose:

    - :no_pedestrians: only specify clients will receive the data

    - :heavy_check_mark: all clients will receive the data
    
- :lock: accept and deny connection attempts

This is the client side in JavaScript, 
[click here](https://github.com/WiseTap/askless)
 to access the server side in Node.js.

## Important links
*  [Documentation](documentation/english_documentation.md)
*  [chat (example)](example/chat-js/index.js): Chat between the colors blue and green.
*  [catalog (example)](example/catalog-js/index.js): Users adding and removing products from a catalog.
*  [Getting Started (server)](https://github.com/WiseTap/askless)

## Getting Started

![Alt Text](example/tracking-web/tracking-web-client.gif)

The "Getting Started" is a example for a Node.js client, but it can
be easily changed to SPA's (Vue, Angular, React) by changing
how the library is imported (step 3).
 
1 - First create the server, [click here](https://github.com/WiseTap/askless) and 
follow the server instructions in the section "Getting Started"

2 - Install

    npm install askless-js-client --save

3 - Import by using ES5 or ES6

ES5:
 
    // If you will run on the browser
    const AsklessClient = require("askless-js-client/web") 
    
    // If you will run on Node.js environment
    const AsklessClient = require("askless-js-client/node") 

ES6:

    import {AsklessClient} from "askless-js-client/web";
    
    //or
    
    import {AsklessClient} from "askless-js-client/node";

4 - Create an instance of the Askless client, and export it 
for your entire project

    export const asklessClient = new AsklessClient();

5 - Initialize
informing the server url with port (default: 3000). 
On the server side you can access the `myAsklessServer.localUrl` attribute
to discover.

6 - Perform the connection with `asklessClient.connect()`
    
Example:

    asklessClient.init({
         serverUrl: 'ws://192.168.2.1:3000',
    });
    asklessClient.connect();  


7 - Get realtime data updates
 
    this.listening = asklessClient.listen({
        route: 'product/tracking',
        
        listen: data => {
            console.log("NEW DATA RECEIVED: ");
            console.log(data);
            //todo: update the text on the screen
        },
    });

8 - Send data to the server when the user click on the button
 
    asklessClient.create({
        route: 'product/customerSaid',
        body: 'I\'m waiting'
    });

9 - We need to stop listening from `product/customerSaid` route on
server, in this example let's stop after 120 seconds, but you should 
stop listening to this route when the user changes the screen

    setTimeout(() => {
        this.listening.close();
        console.log("Stopped listening");
    }, 120 * 1000);

Project ready! You can run :)

Following these links, you can also check this
"Getting Started" complete project of the
 [JavaScript client](example/tracking-ts/index.ts) and of the
 [server in Node.js](https://github.com/WiseTap/askless/blob/master/example/tracking-ts/index.ts).


## Issues

Feel free to open a issue about:

- :grey_question: questions

- :bulb: suggestions

- :page_facing_up: documentation improvements

- :ant: potential bugs


## License

[MIT](LICENSE)
