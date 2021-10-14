import {AsklessClient, NewDataForListener} from "../src";
import {
    AbstractRequestCli,
    ClientConfirmReceiptCli,
    ConfigureConnectionRequestCli,
    ListenCli,
    ModifyCli,
    ReadCli
} from "../src/data/request/RequestCli";
import {REQUEST_PREFIX} from "../src/constants";
import {
    ConfigureConnectionResponseCli,
    ResponseCli,
    ResponseError,
    ServerConfirmReceiptCli
} from "../src/data/response/ResponseCli";
import {ConnectionConfiguration} from "../src/data/response/ConnectionConfiguration";
import {makeId} from "../src/utils";
import {AbstractWsMiddleware, WsMiddlewareParams} from "../src/middleware/ws_channel/WsMiddleware";
import {PingPong} from "../src/data/connection/PingPong";
import * as Sinon from "sinon";
import {SinonSandbox} from "sinon";
const WsMiddlewareFile = require('../src/middleware/ws_channel/WsMiddleware.ts');


export function configureFakeAsklessClient(fakeParams:FakeParams) {
    console.log('configureFakeAsklessClient:');
    console.log(fakeParams.onClientSend);
    fakeParams.sinonSandbox.stub(WsMiddlewareFile, WsMiddlewareFile.newInstanceWsMiddleware.name).callsFake(
        ((params) => {
            return new FakeWsMiddleware(params, fakeParams,);
        })
    );
}

export class FakeArrayParam {
    type: string;
    respond?: 'success' | 'error' | ((request:AbstractRequestCli) => any);
    numberOfTimes?: number;

    static get successAll () : FakeArrayParam[] {
        return [
            {
                type: ClientConfirmReceiptCli.type,
            },
            {
                type: ConfigureConnectionRequestCli.type,
                respond: "success",
                numberOfTimes: 1,
            },
            {
                type: ListenCli.type,
                respond: "success",
                numberOfTimes: 1,
            },
            {
                type: ReadCli.type,
                respond: "success",
                numberOfTimes: 1,
            },
            {
                type: ModifyCli.type,
                respond: "success",
                numberOfTimes: 1,
            },
            {
                type: PingPong.type,
                respond: ()=>{}
            }
        ];
    }


    static successAllReplaceWith(replaceWith:FakeArrayParam[]) : FakeArrayParam[] {
        console.log('successAllReplaceWith');

        const successAll = this.successAll;
        let response:FakeArrayParam[] = [];
        for(let i=0;i<successAll.length;i++){
            console.log('#################################### '+successAll[i].type);
            const replaceThis = replaceWith.find((r) => r.type == successAll[i].type);
            if(replaceThis){
                console.log('1');
                response.push(replaceThis);
            }else{
                console.log('2');
                response.push(successAll[i]);
            }
        }
        return response;
    }
}
export type FakeParams = {
    sinonSandbox: SinonSandbox,
    asklessClient:AsklessClient,
    onClientSend: Array<FakeArrayParam>,
    serverConfirmReceipt?:boolean,
    withTasks?:boolean
};

class FakeWsMiddleware extends AbstractWsMiddleware {
    private readonly _send:(data:any) => void;

    constructor(
        params:WsMiddlewareParams,
        readonly fakeParams: FakeParams,
    ){
        super(params);
        this._send = newMockOnClientSentFunction(this.fakeParams);
    }

    //override
    performConnectionOnce() {
        this.onopen();
    }

    //override
    send(data: string) {
        if(!data?.toString()?.length){
            throw "send: data "+(data == null ? 'null' : 'empty');
        }
        this._send(data);
    }
}


function newMockOnClientSentFunction (fakeParams: FakeParams) : ((data) => void) {
    if(!fakeParams.withTasks){
        fakeParams.asklessClient.internal.tasksStarted = true; //tasks disabled
    }
    console.log('newMockOnClientSentFunction: ');
    console.log(JSON.stringify(fakeParams.onClientSend));

    return (data:string) => {
        const requestJSON = JSON.parse(data);

        const settings = (fakeParams.onClientSend as Array<FakeArrayParam>).find((configuration) => (requestJSON[configuration.type]?.toString() as string)?.length);
        if(!settings){
            console.log("No mock response because of that type == "+requestJSON.type + '\n'+JSON.stringify(data));
            return;
        }

        if(fakeParams.serverConfirmReceipt != false && requestJSON[ConfigureConnectionRequestCli.type] == null){
            fakeParams.asklessClient.internal.middleware.wsChannel.onmessage(JSON.stringify(getServerConfirmReceiptMockServerResponse(requestJSON)));
        }

        for(let i=0;i<(settings.numberOfTimes || 1); i++){
            let response;
            if(typeof settings.respond == "function"){
                response = settings.respond(requestJSON);
            } else if(requestJSON[ClientConfirmReceiptCli.type] != null){
                console.log('mock server response: ignoring ClientConfirmReceiptCli');
                return;
            } else if(requestJSON[ConfigureConnectionRequestCli.type] != null){
                response = getConfigureConnectionMockServerResponse(requestJSON as ConfigureConnectionRequestCli, settings.respond || "success");
            } else if(requestJSON[ListenCli.type]){
                response = getNewDataForListenerMockServerResponse(requestJSON as ListenCli);
            } else if((requestJSON as AbstractRequestCli).clientRequestId?.startsWith(REQUEST_PREFIX)){
                response = getAbstractRequestMockServerResponse(requestJSON, settings.respond || "success");
            } else {
                throw Error("TODO: "+requestJSON);
            }
            response = typeof response == "string" ? response : JSON.stringify(response);
            console.log('mocking server response:');
            console.log(response)
            fakeParams.asklessClient.internal.middleware.wsChannel.onmessage(response);
        }
    };
}


export const getServerConfirmReceiptMockServerResponse = (request:AbstractRequestCli,) : ServerConfirmReceiptCli  => {
    return new ServerConfirmReceiptCli(request.clientRequestId, makeId(5));
}

export const getConfigureConnectionMockServerResponse = (request:ConfigureConnectionRequestCli, respond:'success'|'error', connectionConfiguration?:ConnectionConfiguration) : ConfigureConnectionResponseCli  => {
    return new ConfigureConnectionResponseCli(
        request.clientRequestId,
        connectionConfiguration ?? new ConnectionConfiguration(),
        respond == "success" ? null : new ResponseError({
            code: "INTERNAL_ERROR",
            description: "Mocking ConfigureConnection error",
            stack: null
        }),
        makeId(5),
    );
}
export const getNewDataForListenerMockServerResponse = (request:ListenCli) : NewDataForListener  => {
    return new NewDataForListener({randomListenData :  makeId(10)}, request.listenId, makeId(5));
}
export const getAbstractRequestMockServerResponse = (request:ReadCli, respond:'success'|'error',) : ResponseCli  => {
    return new ResponseCli(
        request.clientRequestId,
        {
            randomResponse: makeId(10)
        },
        respond == "success" ? null : new ResponseError({
            code: "INTERNAL_ERROR",
            description: "Mocking AbstractRequest error",
            stack: null
        }),
        'MockDataType',
        makeId(5),
    );
}
