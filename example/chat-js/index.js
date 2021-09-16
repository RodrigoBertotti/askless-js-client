// Import Askless:
//-> Node App:
//   import { AsklessClient } from "askless-js-client/node";
//      OR
//   const AsklessClient = require("askless-js-client/node")
//-> Web App:
//   import { AsklessClient } from "askless-js-client/web";
//      OR
//   const AsklessClient = require("askless-js-client/web")
const AsklessClient = require("../../dist/askless-js-client/node-debug").AsklessClient

const ownClientId = 'blue';

const asklessClient = new AsklessClient();

asklessClient.init({
    serverUrl: 'ws://192.168.2.1:3000',
    projectName: 'chat-js',
});
asklessClient.connect({
    ownClientId: ownClientId,
    headers: {
        'Authorization': 'Bearer abcd'
    }
}).then((response) => {
    if(response.isSuccess())
        console.log('Connected');
    else
        console.error(JSON.stringify(response.error));
});

asklessClient.addOnConnectionChange({
    listener: (connection => {
        console.log("CONNECTION CHANGED: "+connection);
    })
});

asklessClient.listen({
    route: 'message',
    listener: data => {
        console.log("you received a new message: ");
        console.log(JSON.stringify(data.output));
    }
});

const max = 100;
for(let i=1;i<=max;i++){
    setTimeout(() => {
        asklessClient.create({
            'route': 'message',
            'body' : {
                'text': `User sent message number ${i}/${max}`,
            }
        })
    }, i * 3000);
}
