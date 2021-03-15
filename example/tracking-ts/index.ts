// Debug only:
// import {AsklessClient, Listening, NewDataForListener} from "../../dist/askless-js-client/node-debug";

// Recommended:
import {AsklessClient, Listening, NewDataForListener} from "../../dist/askless-js-client/node";


AsklessClient.instance.init({
    serverUrl: 'ws://192.168.2.1:3000',
    projectName: 'tracking-ts',
});

AsklessClient.instance.connect();

const listening = AsklessClient.instance.listen({
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
