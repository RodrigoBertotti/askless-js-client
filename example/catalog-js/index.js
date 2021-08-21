// Import Askless:
//-> Node App:
//   import { AsklessClient } from "askless-js-client/node";
//      OR
//   const AsklessClient = require("askless-js-client/node").AsklessClient;
//-> Web App:
//   import { AsklessClient } from "askless-js-client/web";
//      OR
//   const AsklessClient = require("askless-js-client/web").AsklessClient;
const AsklessClient = require("../../dist/askless-js-client/node-debug").AsklessClient;

const asklessClient = new AsklessClient();

asklessClient.init({
    serverUrl: 'ws://192.168.2.1:3000',
    projectName: 'catalog',
});
console.log('Started');


/// TODO: Run example by uncommenting theses lines of code:
// test1AsViewOnlyPermission();
// test2AsInvalidToken();
test3AsAdminPermission();

function connectAdmin() {
    return asklessClient.connect({
        ownClientId: 1,
        headers: {
            'Authorization': 'Bearer abcd'
        },
    });
}
function connectInvalidToken() {
    return asklessClient.connect({
        ownClientId: 1,
        headers: {
            'Authorization': 'Bearer wrong'
        }
    });
}
function connectViewOnly() {
    return asklessClient.connect();
}

function addProduct(name, price) {
    return asklessClient.create({
        route: 'product',
        body: {
            name: name,
            price: price
        }
    });
}
function listenToProducts(search) {
    return asklessClient.listen({
        route: 'product/all',
        query: {
            search: search
        },
        listener: data => {
            console.log("NEW DATA RECEIVED: ");
            console.log(data);
        },
    });
}
function deleteProduct(id) {
    return asklessClient.delete({
        route: 'product',
        query: {
            id: id
        }
    });
}

/// Listen for new products with view only permissions
/// No error should be returned
function test1AsViewOnlyPermission() {
    connectViewOnly()
        .then((res) => {
            console.log('connectViewOnly result');
            console.log(res);
            listenToProducts();

            // if uncomment: presents error 'Only logged users can create'
            // because the user has view only permissions
            addProduct("Shampoo", 10)
                .then((res) => {
                    console.log("Shampoo created? "+res.isSuccess());
                });
        });
}

/// Connection will not be attempt
function test2AsInvalidToken() {
    connectInvalidToken()
        .then((res) => {
            console.log('connectInvalidToken result');
            console.log(res);

            //because the connection failed
            //this request will not be attempt
            listenToProducts();
        });
}


function test3AsAdminPermission() {
    connectAdmin()
        .then((res) => {
            console.log('connectViewOnly result');
            console.log(res);
            listenToProducts();

            addProduct("Chair", 20)
                .then((res) => {
                    console.log(+res.isSuccess() ? "\"Chair\" created" : "Failed to Create \"Chair\"");

                   addProduct("Table", 30)
                        .then((res) => {
                            console.log(+res.isSuccess() ? "\"Table\" created" : "Failed to Create \"Table\"");

                            addProduct("Computer", 300)
                                .then((res) => {
                                    console.log(+res.isSuccess() ? "\"Computer\" created" : "Failed to Create \"Computer\"");
                                });
                        });
                });
        });
}


