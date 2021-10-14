import 'mocha';
import {AsklessClient, NewDataForListener} from "../src";
import {expect} from "chai";
import {configureFakeAsklessClient, FakeArrayParam} from "./configuration";
import sinon = require('sinon');
import {ConfigureConnectionRequestCli} from "../src/data/request/RequestCli";
import {ConfigureConnectionResponseCli} from "../src/data/response/ResponseCli";
import {ConnectionConfiguration} from "../src/data/response/ConnectionConfiguration";
import {CLIENT_LIBRARY_VERSION_CODE, CLIENT_LIBRARY_VERSION_NAME} from "../src/constants";
import {makeId} from "../src/utils";
const sinonSandbox = sinon.createSandbox();


function getAsklessClient (moreThanOrEqual:number, lessThanOrEqual:number) : AsklessClient  {
    const asklessClient = new AsklessClient();
    configureFakeAsklessClient({
        sinonSandbox: sinonSandbox,
        asklessClient: asklessClient,
        onClientSend: FakeArrayParam.successAllReplaceWith([
            {
                type: ConfigureConnectionRequestCli.type,
                respond: request => {
                    return new ConfigureConnectionResponseCli(
                        request.clientRequestId,
                        (() => {
                            const connectionConfiguration: ConnectionConfiguration = new ConnectionConfiguration();
                            connectionConfiguration.clientVersionCodeSupported = {
                                moreThanOrEqual: moreThanOrEqual,
                                lessThanOrEqual: lessThanOrEqual
                            }
                            return connectionConfiguration;
                        })(),
                        null,
                        makeId(5)
                    )
                },
                numberOfTimes: 1,
            },
        ])
    });
    asklessClient.init({
        serverUrl: 'wss://example.com',
        logger: {
            useDefaultLogger: true
        }
    });
    return asklessClient;
}

describe('Throwing errors because of incompatibility with server version', () => {
    afterEach(() => {
        sinonSandbox.restore();
    });


    it('Should be OK', async () => {
        try{
            const response = await  getAsklessClient(CLIENT_LIBRARY_VERSION_CODE, CLIENT_LIBRARY_VERSION_CODE).connect();
            expect(response).to.not.be.null;
        }catch (e){
            throw e;
        }
    });

    it('Should throw error because moreThanOrEqual', async () => {
        let err = null;
        try{
            await getAsklessClient(CLIENT_LIBRARY_VERSION_CODE+1, CLIENT_LIBRARY_VERSION_CODE).connect()
        }catch (e){
            err = e;
        }
        expect(err).to.be.not.null;
    });
    it('Should throw error because lessThanOrEqual', async () => {
        let err = null;
        try{
            await getAsklessClient(CLIENT_LIBRARY_VERSION_CODE, CLIENT_LIBRARY_VERSION_CODE-1).connect()
        }catch (e){
            err = e;
        }
        expect(err).to.be.not.null;
    });
});

//
// describe('Throwing errors because of serverName', () => {
//     afterEach(() => {
//         sinonSandbox.restore();
//     });
//
//     const getAsklessClient = (clientProjectName:string, serverProjectName:string) : AsklessClient => {
//         const asklessClient = new AsklessClient();
//         configureFakeAsklessClient({
//             sinonSandbox: sinonSandbox,
//             asklessClient: asklessClient,
//             onClientSend: FakeArrayParam.successAllReplaceWith([
//                 {
//                     type: ConfigureConnectionRequestCli.type,
//                     respond: request => {
//                         return new ConfigureConnectionResponseCli(
//                             request.clientRequestId,
//                             (() => {
//                                 const connectionConfiguration: ConnectionConfiguration = new ConnectionConfiguration();
//                                 connectionConfiguration.clientVersionCodeSupported = {
//                                     moreThanOrEqual: null,
//                                     lessThanOrEqual: null
//                                 };
//                                 connectionConfiguration.projectName = serverProjectName;
//                                 return connectionConfiguration;
//                             })(),
//                             null,
//                             makeId(5)
//                         )
//                     },
//                     numberOfTimes: 1,
//                 },
//             ])
//         });
//         asklessClient.init({
//             serverUrl: 'wss://example.com',
//             projectName: clientProjectName,
//         });
//         return asklessClient;
//     };
//
//     it('Should be OK because projectName is null', async () => {
//         const response = await getAsklessClient(null,null).connect();
//         expect(response).to.not.be.null;
//     });
//     it('Should be OK because same projectName', async () => {
//         try{
//             const response = await  getAsklessClient('testProject','testProject').connect();
//             expect(response).to.not.be.null;
//         }catch (e){
//             throw e;
//         }
//     });
//     it('Should be OK because same projectName', async () => {
//         try{
//             const response = await  getAsklessClient(null,'testProject').connect();
//             expect(response).to.not.be.null;
//         }catch (e){
//             throw e;
//         }
//     });
//
//     it('Should be OK because client projectName is null', async () => {
//         try{
//             const response = await  getAsklessClient(null,'testProject').connect();
//             expect(response).to.not.be.null;
//         }catch (e){
//             throw e;
//         }
//     });
//
//     it('Should be OK because server projectName is null', async () => {
//         try{
//             const response = await  getAsklessClient('testProject',null).connect();
//             expect(response).to.not.be.null;
//         }catch (e){
//             throw e;
//         }
//     });
//
//     it('Should throw error because client projectName is different of server projectName', async () => {
//         await expectError(async () => {
//             await getAsklessClient('projectA','otherProjectB').connect();
//         });
//     });
// });



