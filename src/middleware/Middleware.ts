import {Stream} from "stream";
import {HandleReceive} from "./HandleReceive";
import {SendClientData} from "./SendData";
import {DisconnectionReason, Internal, logger, AsklessClient} from "../index";
import {ConnectionConfiguration} from "./data/response/ConnectionConfiguration";
import {
    ConfigureConnectionResponseCli,
    NewDataForListener,
    ResponseError,
    ResponseCli
} from "./data/response/ResponseCli";
import {
    AbstractRequestCli,
    ClientConfirmReceiptCli,
    ConfigureConnectionRequestCli,
    ListenCli
} from "./data/request/RequestCli";
import {
    CLIENT_GENERATED_ID_PREFIX,
    CLIENT_LIBRARY_VERSION_CODE,
    CLIENT_LIBRARY_VERSION_NAME,
    LISTEN_PREFIX, REQUEST_PREFIX
} from "../constants";
import {assert, Utils} from "../utils";
import {RequestType} from "./data/Types";
import {getWS, setWS, wsSend} from "./ws";
const WebSocket = global.WebSocket || require('isomorphic-ws');

/**
 * Listening for new data from the server after call the method {@link setListener}.
 *
 * Is necessary to call the method {@link close}
 * so that the server can stop sending data.
 *
 * @param setOnNewData The listener that will be triggered each time the data is updated.
 *
 * @param close Stop receiving realtime data from server.
 **/
 // TODO exemplo
export class Listening { //ChildListeningTo

    private listener: (data: NewDataForListener) => void;
    private onError: (error) => void;

    /**
     * @param listener Set a listener that will be triggered each time the data is updated.
     * */
    setListener(listener: (data: NewDataForListener) => void) {
        this.listener = listener;
        const lastReceivementFromServer = this.getLastReceivementFromServer();
        if (lastReceivementFromServer != null) {
            this.listener(lastReceivementFromServer);
        }
    }

    /** @internal */
    get _props() {
        return {
            listener: this.listener,
            onError: this.onError
        }
    }

    constructor(
        // public readonly clientRequestId:string,
        public readonly listenId: string,
        /** Stop receiving realtime data from server */
        public readonly close: VoidFunction,
        private readonly getLastReceivementFromServer: () => NewDataForListener
    ) {}
}

/** @internal */
export class SuperListeningTo {
    lastReceivementFromServer: NewDataForListener;
    public readonly listeningImplementationArray: Array<Listening> = [];

    constructor(
        public readonly route: string,
        public readonly query,
        public readonly hash: string,
        public readonly listenId: string,
        public readonly clientRequestId: string | number,
        public readonly deleteMe: VoidFunction
    ) {}

    onError(err: ResponseError): void {
        this.listeningImplementationArray.forEach((e) => {
            if (e._props.onError) {
                e._props.onError(err);
            }
        });
    }

    onMessage(data: NewDataForListener): void {
        this.listeningImplementationArray.forEach((e) => {
            if (e._props.listener) {
                e._props.listener(data);
            }
        });
    }

    newChild(): Listening {
        const child = new Listening(this.listenId, () => {
            this.listeningImplementationArray.splice(this.listeningImplementationArray.indexOf(child), 1);
            if (this.listeningImplementationArray.length === 0) {
                this.deleteMe();
            }
        }, () => this.lastReceivementFromServer);
        if (this.lastReceivementFromServer != null)
            child._props.listener(this.lastReceivementFromServer);

        this.listeningImplementationArray.push(child);

        return child;
    }
}

/** @internal */
export class Middleware {
    private _lastPongFromServer: number;
    sendClientData: SendClientData;
    handleReceive: HandleReceive;
    connectionConfiguration: ConnectionConfiguration = new ConnectionConfiguration();
    static CLIENT_GENERATED_ID: string; // 1 por pessoa, dessa maneira a pessoa ainda pode obter a resposta caso desconectar e conectar novamente
    readonly superListeningToArray: Array<SuperListeningTo> = [];
    private _disconnectAndClearOnDone: VoidFunction = () => {};
    private _clientId: string | number;
    private onReceiveConnectionConfigurationFromServer:(connectionConfiguration:ConfigureConnectionResponseCli) => void;
    // private onFailToReceiveConnectionConfigurationFromServer: (reason:DisconnectionReason) => void;

    constructor(public readonly serverUrl: string) {
        this.handleReceive = new HandleReceive(this, (connectionConfiguration:ConfigureConnectionResponseCli) => {
            this.onReceiveConnectionConfigurationFromServer(connectionConfiguration);
        });
        this.sendClientData = new SendClientData(this);
    }

    async runOperationInServer(requestCli: AbstractRequestCli, neverTimeout: boolean): Promise<ResponseCli> {
        return this.sendClientData.send(requestCli, neverTimeout);
    }

    get lastPongFromServer() {
        return this._lastPongFromServer;
    }

    get clientId() {
        return this._clientId;
    }

    connect(ownClientId, headers): Promise<ConfigureConnectionResponseCli> {
        return new Promise(async (resolve, reject) => {
            this.onReceiveConnectionConfigurationFromServer = resolve as any;
            // this.onFailToReceiveConnectionConfigurationFromServer = reject as any;
            await this.resolveConnect(ownClientId,headers);
        });
    }

    connectionReady(connectionConfiguration: ConnectionConfiguration, error: ResponseError) {
        logger('connectionReady');

        if (connectionConfiguration != null) {
            this.connectionConfiguration = connectionConfiguration;
        } else {
            throw ("connectionConfiguration is null");
        }


        // console.log( (connectionConfiguration.clientVersionCodeSupported.moreThanOrEqual != null && CLIENT_LIBRARY_VERSION_CODE < connectionConfiguration.clientVersionCodeSupported.moreThanOrEqual)+" <- " + connectionConfiguration.clientVersionCodeSupported.moreThanOrEqual + '  ' + CLIENT_LIBRARY_VERSION_CODE);
        if (
            (connectionConfiguration.clientVersionCodeSupported.moreThanOrEqual != null && CLIENT_LIBRARY_VERSION_CODE < connectionConfiguration.clientVersionCodeSupported.moreThanOrEqual)
            ||
            (connectionConfiguration.clientVersionCodeSupported.lessThanOrEqual != null && CLIENT_LIBRARY_VERSION_CODE > connectionConfiguration.clientVersionCodeSupported.lessThanOrEqual)
        ) {
            this.disconnectAndClear();
            Internal.instance.disconnectionReason = "VERSION_CODE_NOT_SUPPORTED";
            throw Error("Check if you server and client are updated! Your Client version on server is " + connectionConfiguration.serverVersion + ". Your Client client version is " + CLIENT_LIBRARY_VERSION_NAME)
        }

        if (AsklessClient.instance.projectName != null && connectionConfiguration.projectName != null && AsklessClient.instance.projectName != connectionConfiguration.projectName) {
            this.disconnectAndClear();
            Internal.instance.disconnectionReason = "WRONG_PROJECT_NAME";
            throw Error("Looks like you are not running the right server (" + connectionConfiguration.projectName + ") to your Flutter JavaScript project (" + AsklessClient.instance.projectName + ")");
        }

        Internal.instance.sendPingTask.changeInterval(connectionConfiguration.intervalInSecondsClientPing);

        // Delay to avoid sending to LISTEN request's at the same time
        setTimeout(() => {
            Internal.instance.sendMessageToServerAgainTask.changeInterval(connectionConfiguration.intervalInSecondsClientSendSameMessage);
        }, connectionConfiguration.intervalInSecondsClientSendSameMessage * 1000);

        Internal.instance.notifyConnectionChanged("CONNECTED_WITH_SUCCESS");
        assert(getWS().readyState == 1);
    }


    disconnectAndClear(onDone?: VoidFunction): void {
        if (onDone != null)
            this._disconnectAndClearOnDone = onDone;
        logger('disconnectAndClear');

        this.close(true);
        this.sendClientData?.clear();
        this.superListeningToArray.forEach((s) => s.deleteMe());
        this.superListeningToArray.splice(0, this.superListeningToArray.length);
        this.connectionConfiguration = new ConnectionConfiguration();
    }

    close(doNotReconnect?:boolean): void {
        // Internal.instance.notifyConnectionChanged("DISCONNECTED", disconnectionReason || Internal.instance.disconnectionReason);

        const ws = getWS();
        if(!ws || ws.readyState==2 || ws.readyState==3){
            logger('close(): Ignoring close() because readyState = '+ws?.readyState);
            return;
        }
        logger('close started');

        if(doNotReconnect){
            ws['__do_not_reconnect__'] = true;
        }

        if(ws){
            ws.close();
            setWS(null);
        }

        this.sendClientData?.removePendingRequest(RequestType.CONFIGURE_CONNECTION);

        this._lastPongFromServer = null;
    }


    confirmReceiptToServer(serverId: string): void {
        logger("confirmReceiptToServer " + serverId);

        if (getWS() == null)
            logger("getWS()==null", "error");

        wsSend(JSON.stringify(new ClientConfirmReceiptCli(serverId)));
    }


    onNewData(message: NewDataForListener): void {
        const sub = this.superListeningToArray.find((s) => s.listenId == message.listenId);
        if (sub != null) {
            if (sub.onMessage)
                sub.onMessage(message);
            else
                logger('onNewData is null on ClientListeningToRoute', "error",);
            sub.lastReceivementFromServer = message;
        } else
            logger('NewDataForListener is null: NewDataForListener.listenId:'+message.listenId, "error", this.superListeningToArray || 'superListeningToArray é null');
    }


    listen(listenCli: ListenCli): Listening {
        logger('listen');

        let hash = JSON.parse(JSON.stringify(listenCli));
        delete hash['clientRequestId']; //TODO: tipar
        delete hash['listenId']; //necessário?
        hash = JSON.stringify(hash);

        const alreadyListening = this.superListeningToArray.find((listen) => listen.hash == hash,);
        if (alreadyListening != null) {
            logger('alreadyListening');
            return alreadyListening.newChild();
        } else { //New
            logger('NEW Listening (alreadyListening==null)', "debug", hash);
            // console.log('');
            // console.log('clientRequestId: '+listenCli.clientRequestId);
            const listenId = LISTEN_PREFIX + (listenCli.clientRequestId.toString().substring(REQUEST_PREFIX.length));
            // console.log('listenId: '+listenId);
            // console.log('');
            if (!listenCli.clientRequestId)
                throw Error("listenCli.clientRequestId is null");
            const ref = [
                new SuperListeningTo(listenCli.route, listenCli.query, hash, listenId, listenCli.clientRequestId, () => {
                    this.superListeningToArray.splice(this.superListeningToArray.indexOf(ref[0]), 1);
                })
            ];
            this.superListeningToArray.push(ref[0]);
            listenCli.listenId = listenId;

            this.runOperationInServer(listenCli, null).then((response) => {
                if (response.error != null) {
                    ref[0].onError(response.error);
                    logger('could not listen', "error", response.error);
                } else {
                    logger('now is listening!', "debug", response);
                }
            });


            return ref[0].newChild();
        }
    }

    private async resolveConnect(ownClientId, headers) {
        this.close(true);
        if(getWS()?.readyState == 2 || getWS()?.readyState == 3){ // isWebsocketConnectionBeingClose
            logger('resolveConnect: waiting disconnect to finish');
            const LIMIT = 300;
            for(let i=0; getWS() != null && i<LIMIT; i++){
                await Utils.wait(10);
            }
            if(getWS()) {
                logger('resolveConnect: disconnect finished because of limit has been limitReached, continuing the resolveConnect method...', "error");
                try{
                    getWS().close();
                }catch (e){
                    logger('resolveConnect error: '+e.toString(), "error", e.stack);
                }
                setWS(null);
            }else
                logger('resolveConnect: disconnect finished (because of getWS() is null), continuing the resolveConnect method...');
        }
        Internal.instance.notifyConnectionChanged("CONNECTION_IN_PROGRESS");


        this._clientId = ownClientId;
        Internal.instance.disconnectionReason = null;

        if (ownClientId == null) {
            if (Middleware.CLIENT_GENERATED_ID == null) {
                this._clientId = ownClientId = Middleware.CLIENT_GENERATED_ID = CLIENT_GENERATED_ID_PREFIX + Utils.makeId(15);
                logger("New client generated id: " + Middleware.CLIENT_GENERATED_ID);
            } else
                logger("Using the same client generated id: " + Middleware.CLIENT_GENERATED_ID);
        }

        if (Internal.instance.tasksStarted == false) {
            Internal.instance.tasksStarted = true;
            setTimeout(() => {
                Internal.instance.sendMessageToServerAgainTask.start();
                Internal.instance.sendPingTask.start();
            }, 200);
        }

        this.connectionConfiguration = new ConnectionConfiguration(); //restaurando isFromServer para false, pois quando se perde  é mantido o connectionConfiguration da conexão atual

        let response: ResponseCli; //ConfigureConnectionResponseCli

        //do {
        logger("middleware: connect");
        response = null;

        let myOwnWsReference;

        try{
            myOwnWsReference = new WebSocket(this.serverUrl);
            myOwnWsReference['__id__'] = Utils.makeId(11);
            setWS(myOwnWsReference);
        }catch (e) {
            if((e.toString() as string).includes('WebSocket is not a constructor')){
                throw Error("Probably wrong import, try importing as \"askless-js-client/node\" instead");
            }
            throw e;
        }


        function updateDisconnectionReason(error: ResponseError) {
            if(error?.code == "TOKEN_INVALID")
                Internal.instance.disconnectionReason = "TOKEN_INVALID";
            else
                Internal.instance.disconnectionReason = "UNDEFINED";
        }

        getWS().onopen = async () => {
            try {
                logger("ws.on OPEN");

                if (myOwnWsReference['__invalid__']) {
                    myOwnWsReference.close();
                    return;
                }

                assert(response == null);
                response = await this.sendClientData.send(new ConfigureConnectionRequestCli(ownClientId, headers ?? new Map()), null);

                logger('ConfigureConnectionRequestCli', "debug", new ConfigureConnectionRequestCli(this.clientId, headers ?? new Map()));

                if (response.error != null) {
                    logger("Data could not be sent, got an error", "error", response);

                    updateDisconnectionReason(response.error);

                    //close and reconnect:
                    setTimeout(() => this.close(), 10);
                }
            } catch (e) {
                logger('on open error: ' + (typeof e == 'string' ? e : JSON.stringify(e)), "error", e.stack);
            }
        };

        getWS().onmessage = async (receivedData) => {
            try {
                if (myOwnWsReference['__invalid__']) {
                    myOwnWsReference.close();
                    console.log("-----------------------------------------------------------------------");
                    console.log("--------------------- ENTROU NO on message INVALID --------------------");
                    console.log("-----------------------------------------------------------------------");
                    return;
                }

                this._lastPongFromServer = Date.now();

                // logger('message received from server', "debug", receivedData.data);

                if (receivedData.data == 'pong' || receivedData.data == 'welcome') {
                    return;
                }

                logger('message received from server (not a pong)', "debug", receivedData.data);

                this.handleReceive.handle(typeof receivedData.data == "object" ? receivedData.data : JSON.parse(receivedData.data));
            }catch (e){
                logger('onmessage error', "error", e.stack);
            }
        };

        getWS().onerror = async (err) => {
            logger("middleware: channel.stream.listen onError: " + (err || 'null'), 'error', err);
        };

        getWS().onclose = async () => {
            try {
                logger("channel.stream.listen close");

                if(!getWS() || getWS()['__id__']==null || myOwnWsReference['__id__'] == getWS()['__id__']){
                    Internal.instance.notifyConnectionChanged("DISCONNECTED");
                }

                updateDisconnectionReason(response?.error);

                if (!myOwnWsReference['__invalid__']) {
                    myOwnWsReference['__invalid__'] = true;
                    setTimeout(() => {
                        if (Internal.instance.connection === "DISCONNECTED") {
                            this._disconnectAndClearOnDone();
                            this._disconnectAndClearOnDone = () => {};

                            if (Internal.instance.disconnectionReason != "TOKEN_INVALID" &&
                                Internal.instance.disconnectionReason != "DISCONNECTED_BY_CLIENT" &&
                                Internal.instance.disconnectionReason != "VERSION_CODE_NOT_SUPPORTED" &&
                                Internal.instance.disconnectionReason != "WRONG_PROJECT_NAME"
                            ) {
                                if (Internal.instance.disconnectionReason == null)
                                    Internal.instance.disconnectionReason = "UNDEFINED";

                                if(Internal.instance.connection == "DISCONNECTED"){
                                    if(!myOwnWsReference['__do_not_reconnect__']){
                                        this.resolveConnect(ownClientId, headers);
                                    }
                                }
                            }
                            else{
                                this.onReceiveConnectionConfigurationFromServer(Object.assign(new ConfigureConnectionResponseCli(null,null), {
                                    error: new ResponseError({
                                        code: Internal.instance.disconnectionReason,
                                        description: 'function grantConnection (server side) didn\'t allow the connection',
                                    })
                                }))
                            }
                        }
                    }, 2000);
                }

            } catch (e) {
                logger('on close error: ' + (typeof e == 'string' ? e : JSON.stringify(e)), "error", e.stack);
            }
        };

        //await Utils.delay(10 * 1000);
        //} while (!response || response?.error?.code == "TIMEOUT");
    }
}
