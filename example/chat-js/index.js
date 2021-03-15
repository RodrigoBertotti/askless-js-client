// Debug only:
// const askless = require("../../dist/askless-js-client/node-debug");

// Recommended:
const askless = require("../../dist/askless-js-client/node");

const AsklessClient = askless.AsklessClient;

const ownClientId = 'blue';

AsklessClient.instance.init({
    serverUrl: 'ws://192.168.2.1:3000',
    projectName: 'chat-js',
});
AsklessClient.instance.connect({
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

AsklessClient.instance.addOnConnectionChange({
    listener: (connection => {
        console.log("CONNECTION CHANGED: "+connection);
    })
});

AsklessClient.instance.listen({
    route: 'message',
    listener: data => {
        console.log("you received a new message: ");
        console.log(JSON.stringify(data.output));
    }
});

const max = 100;
for(let i=1;i<=max;i++){
    setTimeout(() => {
        AsklessClient.instance.create({
            'route': 'message',
            'body' : {
                'text': `User sent message number ${i}/${max}`,
            }
        })
    }, i * 3000);
}
