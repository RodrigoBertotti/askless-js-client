import {Internal, AsklessClient, NewDataForListener} from "../index";
import {
    AbstractRequestCli,
    ListenCli
} from "../data/request/RequestCli";
import {
    LISTEN_PREFIX, REQUEST_PREFIX
} from "../constants";
import {AbstractWsChannel} from "./ws_channel";
import {ConfigureConnectionResponseCli, ResponseCli, ResponseError} from "../data/response/ResponseCli";
import {ConnectionConfiguration} from "../data/response/ConnectionConfiguration";

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
        const lastReceiveFromServer = this.getLastReceiveFromServer();
        if (lastReceiveFromServer != null) {
            this.listener(lastReceiveFromServer);
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
        private readonly getLastReceiveFromServer: () => NewDataForListener
    ) {}
}

/** @internal */
export class SuperListeningTo {
    lastReceiveFromServer: NewDataForListener;
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
        }, () => this.lastReceiveFromServer);
        if (this.lastReceiveFromServer != null)
            child._props.listener(this.lastReceiveFromServer);

        this.listeningImplementationArray.push(child);

        return child;
    }
}

/** @internal */
export class Middleware {
    private _lastPongFromServer: number;
    connectionConfiguration: ConnectionConfiguration = new ConnectionConfiguration();
    readonly superListeningToArray: Array<SuperListeningTo> = [];
    private _disconnectAndClearOnDone: VoidFunction = () => {};
    private _clientId: string | number;
    readonly internal:Internal;
    // private onFailToReceiveConnectionConfigurationFromServer: (reason:DisconnectionReason) => void;
    connectionAttempt: {
        resolve: (connectionConfiguration:ConfigureConnectionResponseCli) => void,
        reject: (error) => void
    };
    readonly lastMessagesFromServer: Array<LastServerMessage> = [];
    readonly wsChannel = new AbstractWsChannel(this);

    constructor(public readonly asklessClient:AsklessClient) {
        this.internal = asklessClient.internal;
    }

    async runOperationInServer(requestCli: AbstractRequestCli, neverTimeout: boolean): Promise<ResponseCli> {
        return this.wsChannel.sendClientData.send(requestCli, neverTimeout);
    }

    get lastPongFromServer() {
        return this._lastPongFromServer;
    }

    get logger () { return this.internal.logger; }

    get clientId() {
        return this._clientId;
    }

    connect(ownClientId, headers): Promise<ConfigureConnectionResponseCli> {
        return new Promise(async (resolve, reject) => {
            this.connectionAttempt = { resolve: resolve, reject: reject, };
            await this.wsChannel.configureNewConnection(ownClientId,headers);
        });
    }

    disconnectAndClear(onDone?: VoidFunction): void {
        if (onDone != null)
            this._disconnectAndClearOnDone = onDone;
        this.logger('disconnectAndClear');

        this.wsChannel.close(true);
        this.wsChannel.sendClientData?.clear();
        this.superListeningToArray.forEach((s) => s.deleteMe());
        this.superListeningToArray.splice(0, this.superListeningToArray.length);
        this.connectionConfiguration = new ConnectionConfiguration();
    }


    listen(listenCli: ListenCli): Listening {
        this.logger('listen');

        let hash = JSON.parse(JSON.stringify(listenCli));
        delete hash['clientRequestId']; //TODO: tipar
        delete hash['listenId']; //necessário?
        hash = JSON.stringify(hash);

        const alreadyListening = this.superListeningToArray.find((listen) => listen.hash == hash,);
        if (alreadyListening != null) {
            this.logger('alreadyListening');
            return alreadyListening.newChild();
        }

        // New
        this.logger('NEW Listening (alreadyListening==null)', "debug", hash);
        const listenId = LISTEN_PREFIX + (listenCli.clientRequestId.toString().substring(REQUEST_PREFIX.length));
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
                this.logger('could not listen', "error", response.error);
            } else {
                this.logger('now is listening!', "debug", response);
            }
        });
        return ref[0].newChild();
    }
}


export class LastServerMessage {
    public messageReceivedAtSinceEpoch:number = Date.now();

    constructor(public readonly serverId:string) {}
}
