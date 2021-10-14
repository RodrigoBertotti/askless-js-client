import 'mocha';
import {AsklessClient, NewDataForListener} from "../src";
import {Connection} from "../src/connection";
import {expect} from "chai";
import {configureFakeAsklessClient, FakeArrayParam} from "./configuration";
import sinon = require('sinon');
import {DEFAULT_REQUEST_TIMEOUT_IN_SECONDS} from "../src/data/response/ConnectionConfiguration";
import {stub} from "sinon";
const sinonSandbox = sinon.createSandbox();

describe('Checking asklessClient.connection', () => {
    afterEach(() => {
        sinonSandbox.restore();
    });

    it('Should be DISCONNECTED, because connect wasn\'t called', async () => {
        const asklessClient = new AsklessClient();
        expect(asklessClient.connection).to.equal("DISCONNECTED" as Connection)
    });

    // it('Should be DISCONNECTED, because client hasn\'t received configuration before timeout', async () => {
    //     const asklessClient = new AsklessClient();
    //     DEFAULT_REQUEST_TIMEOUT_IN_SECONDS = 0;
    //     expect(asklessClient.connection).to.equal("DISCONNECTED" as Connection)
    // });

    it('Should be CONNECTION_IN_PROGRESS', async () => {
        // const stubWsMiddleware = sinon.stubConstructor(WebSocket, 'wss://example.com' );
        const asklessClient = new AsklessClient();
        configureFakeAsklessClient({
            sinonSandbox: sinonSandbox,
            asklessClient: asklessClient,
            onClientSend: FakeArrayParam.successAll,
        });
        asklessClient.init({
            serverUrl: 'wss://example.com',
            logger: {
                useDefaultLogger: true,
            }
        });
        const connection = await (
            new Promise((resolve, reject) => {
                asklessClient.addOnConnectionChange({
                    listener: connection => {
                        resolve(connection);
                    },
                    runListenerNow: false,
                })
                asklessClient.connect();
            })
        );
        expect(connection).to.equal("CONNECTION_IN_PROGRESS" as Connection);
    });

    it('Should be CONNECTED_WITH_SUCCESS', async () => {
        const asklessClient = new AsklessClient();
        configureFakeAsklessClient({
            sinonSandbox: sinonSandbox,
            asklessClient: asklessClient,
            onClientSend: FakeArrayParam.successAll,
        });
        asklessClient.init({
            serverUrl: 'wss://example.com',
            logger: {
                useDefaultLogger: true,
            }
        });
        await asklessClient.connect();
        expect(asklessClient.connection).to.equal("CONNECTED_WITH_SUCCESS" as Connection)
    });
});






