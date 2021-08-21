import {Middleware} from "./Middleware";
import {ResponseError, ResponseCli} from "./data/response/ResponseCli";
import {AbstractRequestCli, ListenCli} from "./data/request/RequestCli";
import {Internal,} from "../index";
import {RequestType} from "./data/Types";
import {assert, Utils} from "../utils";
import {WsMiddleware} from "./WsMiddleware";

export type OnResponseCallback = (response:ResponseCli) => void;
export type SendDataListener = (data:AbstractRequestCli) => void;

export class _Request {
    serverReceived:boolean = false;

    constructor(public readonly data:AbstractRequestCli, public readonly onResponse:OnResponseCallback) {}
}


export class SendClientData {
    _pendingRequestsList: Array<_Request> = [];
    middleware: Middleware;
    readonly ws: WsMiddleware;

    constructor(middleware: Middleware) {
        this.middleware = middleware;
    }

    get logger () { return this.middleware.logger; }

    clear(): void {
        this.removePendingRequest();
    }

    notifyServerResponse(response: ResponseCli): boolean {
        const req = this._pendingRequestsList.find((p) => p.data.clientRequestId == response.clientRequestId,);
        if (req != null) {
            req.onResponse(response);
            this.logger("Response "+response.clientRequestId+" received and removed from the _pendingRequestsList");
            this._pendingRequestsList.splice(this._pendingRequestsList.indexOf(req), 1);
            return true;
        } else {
            // console.log(JSON.parse(JSON.stringify(this._pendingRequestsList)));
            // console.log('(response.clientRequestId -> '+response.clientRequestId);
            this.logger("Response received: "+response.clientRequestId+", but did nothing, probably because the request timed out before");
            return false;
        }
    }

    setAsReceivedPendingMessageThatServerShouldReceive(clientRequestId: string): void {
        const pending = this._pendingRequestsList.find((p) => p.data.clientRequestId == clientRequestId,);
        if(pending)
            pending.serverReceived = true;
    }


    async sendMessagesToServerAgain(): Promise<void> {
        if(this.middleware.asklessClient.connection == "DISCONNECTED"){
            this.logger('ignoring sendMessagesToServerAgain, this.internal.connection == "DISCONNECTED"', "debug");
            return;
        }

        const copy = Array.from(this._pendingRequestsList);

        for (let i = 0; i < copy.length; i++) {
            if (!copy[i].serverReceived) {
                const send = copy[i].data;
                this.logger('Sending to Server again the message...', "debug");
                try{
                    this.ws.send(JSON.stringify(send));
                }catch (e) {
                    if(e.toString().includes('WebSocket is not open') || e.toString().includes('Still in CONNECTING state')){
                         this.logger('Could not send the message because websocket connection is not performed yet', "error", e);
                    }else{
                        throw e;
                    }
                }
            }
        }
    }

    send(data: AbstractRequestCli, neverTimeout?: boolean): Promise<ResponseCli> {
        if (neverTimeout == null)
            neverTimeout = false;

        return new Promise(async (resolve, reject) => {
            const json = JSON.stringify(data);
            this.logger('Sending to Server...', "debug", data);

            const request = new _Request(data, (response) => {
                resolve(response);
            });

            if (neverTimeout == false && this.middleware.connectionConfiguration.requestTimeoutInSeconds > 0) {
                setTimeout(() => {
                    const remove = this._pendingRequestsList.find((p) => p.data.clientRequestId == request.data.clientRequestId);
                    if (remove != null) {
                        this.logger("TIMEOUT: "+remove.data.clientRequestId, "debug",);
                        this._pendingRequestsList.splice(this._pendingRequestsList.indexOf(remove), 1);
                        request.onResponse(new ResponseCli(data.clientRequestId, null, new ResponseError({
                            code: "TIMEOUT",
                            description: 'Request timed out'
                        })));
                        this.logger('Your request timed out, check if: \n\t1)Your server configuration is listening to '+this.middleware.internal.serverUrl+'\n2) Your device has connection with internet\n\t3)Your API route implementation calls context.respondWithSuccess or context.respondWithError methods', "error");
                    }
                }, this.middleware.connectionConfiguration.requestTimeoutInSeconds * 1000);
            }

            const addAsPending = () => {
                //Se for um listening, deve ficar no final, do contrário
                //corre o risco de receber 2 dados iguais por conta do método onClientListen na Server
                this._pendingRequestsList.push(request);
                const firsts = this._pendingRequestsList.filter((r) => !(r.data instanceof ListenCli));
                const lasts = this._pendingRequestsList.filter((r) => r.data instanceof ListenCli);
                this._pendingRequestsList = [];
                this._pendingRequestsList = this._pendingRequestsList
                    .concat(firsts)
                    .concat(lasts);
            };

            if (this.middleware.asklessClient.connection != "DISCONNECTED") {
                addAsPending();
            } else {
                if (data.waitUntilGetServerConnection) {
                    addAsPending();
                    this.logger('Waiting connection to send message');
                } else {
                    this.logger('You can\'t send this message while not connected');
                    request.onResponse(new ResponseCli(
                        data.clientRequestId,
                        null,
                        new ResponseError(
                            {
                                code: "NO_CONNECTION",
                                description: 'Maybe de device has no internet or the server is offline'
                            }
                        )
                    ));
                }
            }

            if(this.middleware.asklessClient.connection != "DISCONNECTED"){
                try {
                    this.ws.send(json);
                }catch (e) {
                    if(e.toString().includes('WebSocket is not open') || e.toString().includes('Still in CONNECTING state')){
                        this.logger('Could not send the message because the websocket connection is not performed yet', "error", e);
                    }else{
                        throw e;
                    }
                }
            }
        });
    }

    removePendingRequest(removeWhereRequestType?:RequestType) {
        let shouldBeLessThan;
        if(removeWhereRequestType && this._pendingRequestsList.length>0){
            shouldBeLessThan = this._pendingRequestsList.length;
        }
        if(removeWhereRequestType)
            this._pendingRequestsList = this._pendingRequestsList.filter((req) => req.data.requestType != removeWhereRequestType);
        else
            this._pendingRequestsList = [];

        if(shouldBeLessThan!=null && this._pendingRequestsList.length >= shouldBeLessThan){
            this.logger( 'shouldBeLessThan: '+shouldBeLessThan+ ' _pendingRequestsList.length='+this._pendingRequestsList.length, "error")
        }
    }
}
