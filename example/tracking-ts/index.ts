// Import Askless:
//-> Node App:
//   import { AsklessClient } from "askless-js-client/node";
//      OR
//   const AsklessClient = require("askless-js-client/node")
//-> Web App:
//   import { AsklessClient } from "askless-js-client/web";
//      OR
//   const AsklessClient = require("askless-js-client/web")

import { AsklessClient } from "../../dist/askless-js-client/node-debug"

const asklessClient = new AsklessClient();

asklessClient.init({
    serverUrl: 'ws://192.168.2.1:3000',
    projectName: 'tracking-ts',
});


asklessClient.connect();

const listening = asklessClient.listen({
    route: 'product/tracking-ts',
    listener: data => {
        console.log("NEW DATA RECEIVED: ");
        console.log(data);
    },
});


console.log("Tracking Client");

setTimeout(() => {
    listening.close();
    console.log("Stopped listening");
}, 60 * 1000);
