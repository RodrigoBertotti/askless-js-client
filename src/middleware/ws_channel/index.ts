import {CLIENT_GENERATED_ID_PREFIX} from "../../constants";
import {assert, Utils} from "../../utils";
import {ConnectionConfiguration} from "../../data/response/ConnectionConfiguration";
import {ConfigureConnectionResponseCli, ResponseCli, ResponseError} from "../../data/response/ResponseCli";
import {ConfigureConnectionRequestCli} from "../../data/request/RequestCli";
import {RequestType} from "../../data/Types";
import {Middleware} from "../index";
import {DisconnectionReason} from "../../index";
import {newClientReceivedFrom} from "./receivements";
import {AbstractWsMiddleware} from "./WsMiddleware";
import {SendClientData} from "../SendData";


export class AbstractWsChannel {
    private _ws:AbstractWsMiddleware;
    private _clientId: string | number;
    private headers: Map<string,any>;
    private connectionConfiguration: ConnectionConfiguration;
    private _lastPongFromServer: number;
    private onReceiveConnectionConfigurationFromServer:(connectionConfiguration:ConfigureConnectionResponseCli) => void;
    private _disconnectAndClearOnDone: VoidFunction = () => {};
    private response:ResponseCli;
    public readonly sendClientData:SendClientData = new SendClientData(this.middleware);

    get ws () {return this._ws; }
    get logger () { return this.middleware.logger; }

    constructor(
        public readonly middleware:Middleware,
    ) {}

    get clientId () {return this._clientId; }

    private readonly configureWaitIfWebsocketConnectionIsBeingClosed = async () => {
        if(this._ws?.readyState == 2){ // isWebsocketConnectionBeingClose
            this.logger('resolveConnect: waiting disconnect to finish');
            const LIMIT = 300;
            for(let i=0; this._ws != null && (this._ws.readyState == 2) && i<LIMIT; i++){
                await Utils.wait(10);
            }
            if(this._ws) {
                this.logger('resolveConnect: disconnect finished because of limit has been limitReached, continuing the resolveConnect method...', "error");
                try{
                    this._ws.close();
                }catch (e){
                    this.logger('resolveConnect error: '+e.toString(), "error", e.stack);
                }
                this._ws = null;
            }else
                this.logger('resolveConnect: disconnect finished (because of this._ws is null), continuing the resolveConnect method...');
        }
    }
    private readonly configureTasks = () => {
        if (this.middleware.internal.tasksStarted == false) {
            this.middleware.internal.tasksStarted = true;
            setTimeout(() => {
                this.middleware.internal.sendMessageToServerAgainTask.start();
                this.middleware.internal.sendPingTask.start();
            }, 200);
        }
    }

    async configureNewConnection (ownClientId: string | number, headers) : Promise<void> {
        const configureClientId = () => {
            if (ownClientId == null) {
                if (this.middleware.internal.clientGeneratedId == null) {
                    this._clientId = ownClientId = this.middleware.internal.clientGeneratedId = CLIENT_GENERATED_ID_PREFIX + Utils.makeId(15);
                    this.logger("New client client generated id: " + this.middleware.internal.clientGeneratedId);
                } else {
                    this.logger("Using the same client generated id: " + this.middleware.internal.clientGeneratedId);
                    this._clientId = this.middleware.internal.clientGeneratedId;
                }
            }else{
                this._clientId = ownClientId;
            }
            assert(this._clientId != null, 'this._clientId is null');
        };

        this.headers = headers;
        this.close(true);
        await this.configureWaitIfWebsocketConnectionIsBeingClosed();

        this.middleware.internal.notifyConnectionChanged("CONNECTION_IN_PROGRESS");
        this.middleware.internal.disconnectionReason = null;
        configureClientId();
        this.configureTasks();

        this.connectionConfiguration = new ConnectionConfiguration(); //restaurando isFromServer para false, pois quando se perde  é mantido o connectionConfiguration da conexão atual
        this.logger("middleware: connect");

        try{
            this._ws = AbstractWsMiddleware.newInstance({
                middleware: this.middleware,
                address: this.middleware.internal.serverUrl,
            });
            this._ws['__id__'] = Utils.makeId(11);
            this._ws.onopen = this.onopen;
            this._ws.onmessage = (event) => this.onmessage(event.data);
            this._ws.onclose = this.onclose;
            this._ws.onerror = this.onerror;
        }catch (e) {
            if((e.toString() as string).includes('WebSocket is not a constructor')){
                throw Error("Probably wrong import, try importing as \"askless-js-client/node\" instead");
            }
            throw e;
        }
    }


    readonly onopen = async () => {
        try {
            this.logger("_ws.on OPEN - clientId: "+this.clientId);
            assert(this.clientId != null, 'this.clientId is null');

            if (this._ws['__invalid__']) {
                this._ws.close();
                return;
            }

            this.response = await this.sendClientData.send(new ConfigureConnectionRequestCli(this.clientId, this.headers ?? new Map()), null);

            this.logger('ConfigureConnectionRequestCli', "debug", new ConfigureConnectionRequestCli(this.clientId, this.headers ?? new Map()));

            if (this.response.error != null) {
                this.logger("Data could not be sent, got an error", "error", this.response);

                this.updateDisconnectionReason(this.response.error);

                //close and reconnect:
                setTimeout(() => this.close(), 10);
            }
        } catch (e) {
            this.logger('on open error: ' + (typeof e == 'string' ? e : JSON.stringify(e)), "error", e.stack);
        }
    }

    private updateDisconnectionReason (error: ResponseError) {
        if(error?.code == "TOKEN_INVALID")
            this.middleware.internal.disconnectionReason = new DisconnectionReason( "TOKEN_INVALID");
        else
            this.middleware.internal.disconnectionReason = new DisconnectionReason("UNDEFINED");
    }

    readonly onmessage = async (data) => {
        assert(typeof data == "string", "data não é string, é "+(typeof data).toString())

        try {
            if (this._ws['__invalid__']) {
                this.logger('closing ws connection because __invalid__ flag', "debug", data);
                this._ws.close();
                return;
            }
            if(data == 'pong' || data == 'welcome'){
                return;
            }

            this._lastPongFromServer = Date.now();

            await newClientReceivedFrom(data, this.middleware).handle();

        }catch (e){
            this.logger('onmessage error: '+e.toString(), "error", e.stack);
        }
    }


    readonly onclose = (ev) => {
        try {
            this.logger("channel.stream.listen close: "+JSON.stringify(ev));

            if(!this._ws || this._ws['__id__']==null || this._ws['__id__'] == this._ws['__id__']){
                this.middleware.internal.notifyConnectionChanged("DISCONNECTED");
            }

            this.updateDisconnectionReason(this.response?.error);

            if (!this._ws['__invalid__']) {
                this._ws['__invalid__'] = true;
                setTimeout(() => {
                    if (this.middleware.internal.connection === "DISCONNECTED") {
                        this._disconnectAndClearOnDone();
                        this._disconnectAndClearOnDone = () => {};

                        if (this.middleware.internal.disconnectionReason?.canReconnect == false) {
                            this.onReceiveConnectionConfigurationFromServer(Object.assign(new ConfigureConnectionResponseCli(null,null), {
                                error: new ResponseError({
                                    code: this.middleware.internal.disconnectionReason.code,
                                    description: 'function grantConnection (server side) didn\'t allow the connection',
                                })
                            }))
                            return;
                        }

                        if (this.middleware.internal.disconnectionReason == null) {
                            this.middleware.internal.disconnectionReason = new DisconnectionReason("UNDEFINED");
                        }
                        if(this.middleware.internal.connection == "DISCONNECTED"){
                            if(!this._ws['__do_not_reconnect__']){
                                this.configureNewConnection(this.clientId, this.headers);
                            }
                        }
                    }
                }, 2000);
            }

        } catch (e) {
            this.logger('on close error: ' + (typeof e == 'string' ? e : JSON.stringify(e)), "error", e.stack);
        }
    }


    readonly onerror = (err) => {
        this.logger("middleware: channel.stream.listen onError: " + (err?.toString() || 'null'), 'error', JSON.stringify(err));
    }


    close(doNotReconnect?:boolean): void {
        // this.asklessClient.internal.notifyConnectionChanged("DISCONNECTED", disconnectionReason || this.asklessClient.internal.disconnectionReason);;
        if(!this._ws || this._ws.readyState==2 || this._ws.readyState==3){
            this.logger('Ignoring close() because readyState = '+this._ws?.readyState);
            return;
        }
        this.logger('close started');

        if(doNotReconnect){
            this._ws['__do_not_reconnect__'] = true;
        }

        if(this._ws){
            this._ws.close();
            this._ws = null;
        }

        this.sendClientData?.removePendingRequest(RequestType.CONFIGURE_CONNECTION);

        this._lastPongFromServer = null;
    }
}
