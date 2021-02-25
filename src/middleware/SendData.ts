import {Middleware} from "./Middleware";
import {ResponseError, ResponseCli} from "./data/response/ResponseCli";
import {AbstractRequestCli, ListenCli} from "./data/request/RequestCli";
import {Internal, logger} from "../index";

export type OnResponseCallback = (response:ResponseCli) => void;
export type SendDataListener = (data:AbstractRequestCli) => void;

export class _Request {
    serverReceived:boolean = false;

    constructor(public readonly data:AbstractRequestCli, public readonly onResponse:OnResponseCallback) {}
}


export class SendClientData {
    _pendingRequestsList: Array<_Request> = [];
    middleware: Middleware;

    constructor(middleware: Middleware) {
        this.middleware = middleware;
    }

    clear(): void {
        this._pendingRequestsList = [];
    }

    notifyServerResponse(response: ResponseCli): void {
        const req = this._pendingRequestsList.find((p) => p.data.clientRequestId == response.clientRequestId,);
        if (req != null) {
            req.onResponse(response);
            logger("Response "+response.clientRequestId+" received and removed from the _pendingRequestsList");
            this._pendingRequestsList.splice(this._pendingRequestsList.indexOf(req), 1);
        } else {
            // console.log(JSON.parse(JSON.stringify(this._pendingRequestsList)));
            // console.log('(response.clientRequestId -> '+response.clientRequestId);
            logger("Response received: "+response.clientRequestId+", but did nothing, probably because the request timed out before");
        }
    }

    setAsReceivedPendingMessageThatServerShouldReceive(clientRequestId: string): void {
        const pending = this._pendingRequestsList.find((p) => p.data.clientRequestId == clientRequestId,);
        if(pending)
            pending.serverReceived = true;
    }


    async sendMessagesToServerAgain(): Promise<void> {
        if(Internal.instance.connection == "DISCONNECTED"){
            logger('ignoring sendMessagesToServerAgain, Internal.instance.connection == "DISCONNECTED"', "debug");
            return;
        }

        const copy = Array.from(this._pendingRequestsList);

        for (let i = 0; i < copy.length; i++) {
            if (!copy[i].serverReceived) {
                const send = copy[i].data;
                logger('Sending to Server again the message...', "debug");
                try{
                    this.middleware.ws?.send(JSON.stringify(send));
                }catch (e) {
                    if(e.toString().includes('WebSocket is not open') || e.toString().includes('Still in CONNECTING state')){
                         logger('Could not send the message because websocket connection is not performed yet', "error", e);
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

        return new Promise((resolve, reject) => {
            const json = JSON.stringify(data);
            logger('Sending to Server...', "debug", data);

            if(Internal.instance.connection != "DISCONNECTED"){
                try {
                    this.middleware.ws?.send(json);
                }catch (e) {
                    if(e.toString().includes('WebSocket is not open') || e.toString().includes('Still in CONNECTING state')){
                        logger('Could not send the message because the websocket connection is not performed yet', "error", e);
                    }else{
                        throw e;
                    }
                }
            }

            const request = new _Request(data, (response) => {
                resolve(response);
            });

            if (neverTimeout == false && Internal.instance.middleware.connectionConfiguration.requestTimeoutInSeconds > 0) {
                setTimeout(() => {
                    const remove = this._pendingRequestsList.find((p) => p.data.clientRequestId == request.data.clientRequestId);
                    if (remove != null) {
                        logger("TIMEOUT: "+remove.data.clientRequestId, "debug",);
                        this._pendingRequestsList.splice(this._pendingRequestsList.indexOf(remove), 1);
                        request.onResponse(new ResponseCli(data.clientRequestId, null, new ResponseError({
                            code: "TIMEOUT",
                            description: 'Request timed out'
                        })));
                        logger('Your request timed out, check if: \n\t1)Your server configuration is listening to '+Internal.instance.serverUrl+'\n2) Your device has connection with internet\n\t3)Your API route implementation calls context.respondWithSuccess or context.respondWithError methods', "error");
                    }
                }, Internal.instance.middleware.connectionConfiguration.requestTimeoutInSeconds * 1000);
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

            if (Internal.instance.connection != "DISCONNECTED") {
                addAsPending();
            } else {
                if (data.waitUntilGetServerConnection) {
                    addAsPending();
                    logger('Waiting connection to send message');
                } else {
                    logger('You can\'t send this message while not connected');
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
        });
    }
}
