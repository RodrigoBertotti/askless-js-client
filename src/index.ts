import {SendMessageToServerAgainTask} from "./tasks/SendMessageToServerAgainTask";
import {SendPingTask} from "./tasks/SendPingTask";
import {Listening, Middleware} from "./middleware";
import {
    ConfigureConnectionResponseCli,
    NewDataForListener,
    ResponseCli,
    ResponseError
} from "./data/response/ResponseCli";
import {ListenCli, ReadCli} from "./data/request/RequestCli";
import {CreateCli, DeleteCli, UpdateCli} from "./data/request/OperationRequestCli";
import {CLIENT_GENERATED_ID_PREFIX} from "./constants";
import {assert, environment} from "./utils";
import {Connection, DisconnectionReasonCode, OnConnectionChangeListener} from "./connection";
import {Level, LoggerFunction} from "./logger";








export class DisconnectionReason {

    constructor(public readonly code:DisconnectionReasonCode) {}

    get canReconnect () : boolean {
        return this.code != "TOKEN_INVALID" &&
            this.code != "DISCONNECTED_BY_CLIENT" &&
            this.code != "VERSION_CODE_NOT_SUPPORTED" &&
            this.code != "WRONG_PROJECT_NAME"
    }
}

function _getDefaultLogger (message:string, level?:Level, additionalData?:any)  {
   if(!level || !level.toString().length)
       level = "debug";

   const PREFIX = "> askless [" +level.toString().toUpperCase() +"]: ";
   if(level != "error"){
       console.log(PREFIX+message);
       if(additionalData!=null)
           console.log(typeof additionalData == "string" ? additionalData : JSON.stringify(additionalData));
   }else{
       console.error(PREFIX+message);
       if(additionalData!=null)
           console.error(typeof additionalData == "string" ? additionalData : JSON.stringify(additionalData));
   }
}

/**
 * Allow to customize the behavior of internal logs and enable/disable the default logger (optional).
 *
 * @param useDefaultLogger If `true`: the default logger will be used (optional). Set to `false` on a production environment. Default: `false`
 *
 * @param customLogger  Allows the implementation of a custom logger (optional). Let it `null` on a production environment
 *
 * @example
 *
 *       asklessClient.init({
 *               projectName: 'MyApp',
 *               serverUrl: "ws://192.168.2.1:3000",
 *               logger: {
 *                   useDefaultLogger: false,
 *                   customLogger: (message, level, additionalData) => {
 *                       console.log('['+ level + '] '+message);
 *                       if(additionalData!=null){
 *                           console.log(JSON.stringify(additionalData));
 *                       }
 *                   }
 *               },
 *       });
*/
export class LoggerParam {

    constructor(
       public customLogger?:LoggerFunction,
       public useDefaultLogger?:boolean
    ) {}
}

/** @internal */
export class Internal {
    tasksStarted:boolean = false;
    readonly sendMessageToServerAgainTask:SendMessageToServerAgainTask = new SendMessageToServerAgainTask(this);
    readonly sendPingTask:SendPingTask = new SendPingTask(() => this.middleware);
    //reconnectWhenOffline:ReconnectWhen
    serverUrl:string;
    middleware:Middleware;
    _onConnectionWithServerChangeListeners:Array<OnConnectionChangeListener> = [];
    connection:Connection = "DISCONNECTED";
    disconnectionReason:DisconnectionReason;
    logger: LoggerFunction;
    private _clientGeneratedId: string | number;

    set clientGeneratedId(value) {
        if(this._clientGeneratedId != null)
            throw "clientGeneratedId has a value already set";
        this._clientGeneratedId = value;
    }
    get clientGeneratedId () { return this._clientGeneratedId; }

    get clientId () {
        return this.middleware.clientId;
    }

    constructor(public readonly asklessClient:AsklessClient){}


    notifyConnectionChanged(conn:Connection, disconnectionReason?:DisconnectionReason) : void{
        if(this.connection == conn){
            this.logger('Ignoring notifyConnectionChanged, because '+conn+' has been already set');
            return;
        }
        this.logger('notifyConnectionChanged: '+conn + (' '+disconnectionReason||''), "debug")
        this.connection = conn;
        this._onConnectionWithServerChangeListeners.forEach((listener) => listener(conn));
        if(conn=="DISCONNECTED")
            this.disconnectionReason = disconnectionReason || new DisconnectionReason("UNDEFINED");
    }

}


export class AsklessClient {
    private _projectName:string;

    /** @internal */
    readonly internal:Internal = new Internal(this);

    get logger () { return this.internal.logger; }

    private static canUseSingleton:boolean = true;

    constructor() {
        AsklessClient.canUseSingleton = false;
    }

    private static _instance:AsklessClient;

    /**
     * @deprecated
     * Askless Singleton pattern is now depreciated, please use the constructor: 'new AsklessClient()' instead of 'AsklessClient.instance'
     *  */
    static get instance () : AsklessClient {
        if(!AsklessClient.canUseSingleton){
            throw "You should NOT create a new instance \"new AsklessClient()\" while using \"AsklessClient.instance\". Singleton pattern is now depreciated, please use the constructor: \"new AsklessClient()\""
        }
        if(!AsklessClient._instance){
            AsklessClient._instance = new AsklessClient();
            AsklessClient.canUseSingleton = true;
        }
        return AsklessClient._instance;
    }

    /**
     *  Name for this project (optional).
     *  If `!= null`: the field `projectName` on server side must have the same name (optional).
    */
    get projectName():string { return this._projectName; };
    get serverUrl():string { return this.internal?.serverUrl; };

    private _ownClientId:string;
    private _headers:object;

    /**
     *  Get the status of the connection with the server.
    */
    get connection():Connection {
        return this.internal.connection;
    }

    /**
     * May indicate the reason of no connection.
     * */
    get disconnectReason():DisconnectionReason {
        return this.internal.disconnectionReason;
    };


    /**
     *  Try to perform a connection with the server.
     *
     *  @param params Object that hold the params of this function
     *
     *  @param params.ownClientId: The ID of the user defined in your application.
     *  This field must NOT be `null` when the user is logging in,
     *  otherwise must be `null` (optional).
     *
     *  @param params.headers: Allows informing the token of the respective `ownClientId` (and/or additional data)
     *  so that the server can be able to accept or deny the connection attempt (optional).
     *
     *  In the server side, you can implement [grantConnection](https://github.com/WiseTap/askless/blob/master/documentation/english_documentation.md#grantconnection)
     *  to accept or deny connections attempts from the client.
     *
     *  @returns Returns the result of the connection attempt.
     *
     *  @example
     *
     *          const connectionResponse = await asklessClient.connect({
     *              ownClientId: ownClientId,
     *              headers: {
     *                  'Authorization': 'Bearer abcd'
     *              }
     *          });
     *          if(connectionResponse.isSuccess())
     *              console.log('Connected with success');
     *          else
     *              console.log('Failed to connect: '+connectionResponse.error.code + ' ' + connectionResponse.error.description);
     *
     * */
    async connect(params?:{ownClientId?, headers?:object}) : Promise<ConfigureConnectionResponseCli> {
        if(!params)
            params = {ownClientId:null, headers:null};

        if(this.serverUrl == null)
            throw Error("You must call the method 'init' before 'connect'");

        if (params && params.ownClientId && params.ownClientId.toString().startsWith(CLIENT_GENERATED_ID_PREFIX)) //Vai que o usuário insira um id manualmente desse tipo
            throw Error("ownClientId invalid: "+params.ownClientId);

        if(this.internal.middleware?.wsChannel.ws?.readyState==0 || this.internal.connection == "CONNECTION_IN_PROGRESS"){
            return new ConfigureConnectionResponseCli(
                null,
                null,
                new ResponseError(
                    {
                        code: "LAST_CONNECTION_ATTEMPT_IS_STILL_IN_PROGRESS",
                        description: "The connection attempt failed because the last connection attempt is still in progress",
                        stack: null
                    }
                )
            );
        }

        this.logger("connecting...", );

        if(this.internal.serverUrl != this.serverUrl)
            this.logger( "server: "+this.serverUrl, "debug", );

        if(this.internal.middleware==null || this.internal.serverUrl!=this.serverUrl || params.ownClientId != params.ownClientId){
            this._disconnectAndClearByClient();
            this.internal.middleware = new Middleware(this);;
        }else{
            this.internal.middleware.wsChannel.close(true);
        }
        this._ownClientId = params.ownClientId;
        this._headers = params.headers || {};

        return  (await this.internal.middleware.connect(this._ownClientId, this._headers));
    }

    /**
     * Stop the connection with the server and clear the credentials `headers` and `ownClientId`.
     * */
    disconnect():void {
        this.logger("disconnect", "debug");

        this._headers = null;
        this._ownClientId = null;
        this._disconnectAndClearByClient();
    }

    /**
     * Adds a {@link params.listener listener} that will be triggered
     * every time the status of connection with
     * the server changes.
     *
     * @param params Object that hold the params of this function
     *
     * @param params.listener The listener itself.
     *
     * @param params.runListenerNow Default: true. If `true`: the `listener` is called
     * right after being added (optional).
     * */
    addOnConnectionChange(params:{listener:OnConnectionChangeListener, runListenerNow:boolean}):void {
        this.internal._onConnectionWithServerChangeListeners.push(params.listener);
        if(params.runListenerNow==null || params.runListenerNow==true)
            params.listener(this.connection);
    }

    /**
     * Removes the added {@link listener}.
    */
    removeOnConnectionChange(listener:OnConnectionChangeListener):void {
        this.internal._onConnectionWithServerChangeListeners.splice(this.internal._onConnectionWithServerChangeListeners.indexOf(listener, 1));
    }

    /**
     *  Reconnects to the server using the same credentials
     *  as the previous informed in `connect`.
     *
     *  @returns Returns the result of the connection attempt.
     * */
    async reconnect():Promise<ConfigureConnectionResponseCli> {
        if(this._headers == null)
            throw "'reconnect' only can be called after a 'connect'";

        this.logger( "reconnect", "debug",);

        return this.connect({
            ownClientId: this._ownClientId,
            headers: this._headers,
        });
    }




    /**
     * Creates data in the server.
     *
     *  @param params Object that hold the params of this function.
     *
     *  @param params.body The data that will be created.
     *
     *  @param params.route The path of the route.
     *
     *  @param params.query Additional data (optional).
     *
     *  @param params.neverTimeout Default: `false` (optional). If `true`: the
     *  request will be performed as soon as possible,
     *  without timeout.
     *  If `false`: the field `requestTimeoutInSeconds` defined in the server side
     *  will be the timeout.
    */
    async create(params:{route:string, body, query?:object, neverTimeout?:boolean}) : Promise<ResponseCli> {
        await this._assertHasMadeConnection();

        return this.internal.middleware.runOperationInServer(new CreateCli(params.route, params.body, params.query  || new Map()), params.neverTimeout);
    }



    /**
     *  Updates data in the server.
     *
     *  @param params Object that hold the params of this function
     *
     *  @param params.body The entire data or field(s) that will be updated.
     *
     *  @param params.route The path of the route.
     *
     *  @param params.query Additional data (optional).
     *
     *  @param params.neverTimeout Default: `false` (optional). If `true`: the
     *  request will be performed as soon as possible,
     *  without timeout.
     *  If `false`: the field `requestTimeoutInSeconds` defined in the server side
     *  will be the timeout.
     *
    */
    async update(params:{route:string, body, query:object, neverTimeout?:boolean}) : Promise<ResponseCli> {
        await this._assertHasMadeConnection();

        return this.internal.middleware.runOperationInServer(new UpdateCli(params.route, params.body, params.query || new Map()), params.neverTimeout);
    }


    /**
     *  Removes data from server.
     *
     *  @param params Object that hold the params of this function.
     *
     *  @param params.route The path route.
     *
     *  @param params.query Additional data, indicate here which data will be removed.
     *
     *  @param params.neverTimeout Default: `false` (optional). If `true`: the
     *  request will be performed as soon as possible,
     *  without timeout.
     *  If `false`: the field `requestTimeoutInSeconds` defined in the server side
     *  will be the timeout.
     *
    */
    async delete(params:{route:string, query:object, neverTimeout?:boolean}) : Promise<ResponseCli> {
        await this._assertHasMadeConnection();

        return this.internal.middleware.runOperationInServer(new DeleteCli(params.route, params.query || new Map()), params.neverTimeout);
    }


    /**
    * Read data once.
    *
    *  @param params Object that hold the params of this function.
    *
    *  @param.route The path of the route.
    *
    *  @param.query Additional data (optional),
    *  here can be added a filter to indicate to the server
    *  which data this client will receive.
    *
    *  @param.neverTimeout Default: `false` (optional). If `true`: the
    *  request will be performed as soon as possible,
    *  without timeout.
    *  If `false`: the field `requestTimeoutInSeconds` defined in the server side
    *  will be the timeout.
    *
    */
    async read(params:{route:string, query:object, neverTimeout?:boolean}) : Promise<ResponseCli> {
        await this._assertHasMadeConnection();

        return this.internal.middleware.runOperationInServer(new ReadCli( params.route, params.query || new Map()), params.neverTimeout);
    }



     /**
      * Get realtime data using {@link params.listen}.
      *
      * Is __necessary__ to call the method {@link Listening.close()}
      * to stop receiving data from server.
      *
      * @param params Object that hold the params of this function
      *
      * @param params.route The path of the route.
      *
      * @param params.query Additional data (optional),
      * here can be added a filter to indicate to the server
      * which data this client will receive.
      *
      * @param params.listen The listener that will be triggered each time the data is updated.
      *
      * @example
      *
      *        const listening = asklessClient.listen({
      *            route: 'product/all',
      *            query: {
      *               search: search
      *            },
      *            listen: (data) => {
      *                console.log("Product "+data.output['name']+" received")
      *            },
      *        });
      *
      *        listening.close(); //Close the stream to stop receiving data
      *
      * @returns Returns a {@link Listening}.
      *
     */
     listen(params:{route:string,  query?:object, listener?: (data: NewDataForListener) => void}):Listening {
        this._assertHasMadeConnection();

        const res = this.internal.middleware.listen(new ListenCli(params.route, params.query || new Map(),));
        if(params?.listener){
            res.setListener(params.listener);
        }
        return res;
    }


    private async _assertHasMadeConnection():Promise<void> {
        if(this.internal.connection === "DISCONNECTED"){
            await this.connect({headers: null, ownClientId: null});
            this.logger('You didn\'t call the method `connect` yet, so the connection will be made with null values for `ownClientId` and `headers` params', "warning");
        }
    }

    /**
     * The client can be initialized with the method {@link init}.
     *
     * It's recommended to call {@link init} in the {@link main} method of the application.
     *
     * @param params Object that hold the params of this function
     *
     * @param params.serverUrl The URL of the server, must start with `ws://` or `wss://`. Example: `ws://192.168.2.1:3000`.
     *
     * @param params.logger  {@link LoggerParam Allow to customize the behavior of internal logs and enable/disable the default logger (optional).}
     *
     * @param params.projectName Name for this project (optional).
     * If `!= null`: the field {@link projectName} on server side must have the same name (optional).
     *
     * @example
     *
     *
     *       asklessClient.init({
     *               projectName: 'MyApp',
     *               serverUrl: "ws://192.168.2.1:3000",
     *               logger: {
     *                   useDefaultLogger: false,
     *                   customLogger: (message, level, additionalData) => {
     *                       console.log('['+ level + '] '+message);
     *                       if(additionalData!=null){
     *                           console.log(JSON.stringify(additionalData));
     *                       }
     *                   }
     *               },
     *       });
     *
    */
    init(params:{serverUrl:string, logger?:LoggerParam, projectName?:string}):void {
        const defaultLogger = params.logger?.useDefaultLogger ? _getDefaultLogger : null;
        this.internal.logger = (message:string, level:Level, additionalData) =>  {
            if(!level)
                level = "debug";

            if(defaultLogger)
                defaultLogger(message, level, additionalData);
            if(params?.logger?.customLogger)
                params?.logger?.customLogger(message, level, additionalData);
        };

        this._checkEnvironmentToShowWarningsIfNecessary(defaultLogger, params);

        this.logger(`askless-js-client initialized. environment: ${environment}`, "debug");

        if(params.serverUrl==null)
            throw Error("params.serverUrl must not be null");
        if(!params.serverUrl.startsWith('ws:') && !params.serverUrl.startsWith('wss:')){
            throw Error("params.serverUrl must starts with ws:// or wss://");
        }
        if(params.serverUrl.includes('192.168.') && !params.serverUrl.includes(':'))
            throw Error('Please, inform the port on the serverUrl, default is 3000, example: ws://192.168.2.1:3000');

        this.internal.serverUrl = params.serverUrl;
        this._projectName = params.projectName;
    }

    private _checkEnvironmentToShowWarningsIfNecessary(defaultLogger, params) {
        if(environment == "development"){
            const warningMessage =
                '***************************************************************************************************************\n' +
                '  WARNING: You are using a DEBUG version of Askless,                                                         \n' +
                '  data content can appear on the logs (logs with \'debug\' level shows it a lot).                            \n' +
                '  Do not use in a production environment,                                                                    \n' +
                '  in this case switch from importing the debug version to the production version                             \n'+
                '  for example: use askless-js-client/web    instead of   askless-js-client/web-debug         \n' +
                '            or use askless-js-client/node   instead of   askless-js-client/node-debug        \n' +
                '***************************************************************************************************************';
            if(defaultLogger || params?.logger?.customLogger)
                this.internal.logger('\n'+ warningMessage, "debug");
            else
                console.log(warningMessage);
        }else{
            if(defaultLogger){
                this.internal.logger('\n'+
                    '****************************************************************************************\n' +
                    '  WARNING: useDefaultLogger is \'true\', SET it to \'false\' on a production environment \n' +
                    '****************************************************************************************',
                    "warning"
                );
            }
            if(params?.logger?.customLogger){
                this.internal.logger( '\n' +
                    '*************************************************************************************************************************\n' +
                    '  WARNING: You are using a customLogger, data content can appear on the logs (logs with \'debug\' level shows it a lot) \n' +
                    '*************************************************************************************************************************',
                    "warning"
                );
            }
        }
    }

    private _disconnectAndClearByClient():void {
        this.internal.middleware?.disconnectAndClear(() => {
            this.internal.disconnectionReason = new DisconnectionReason("DISCONNECTED_BY_CLIENT");
        });
    }
}
module.exports = AsklessClient;

/** @deprecated Please use require("askless-js-client/node") / require("askless-js-client/web") instead */
module.exports.AsklessClient = AsklessClient;

export {Listening, } from "./middleware";
export {NewDataForListener} from "./data/response/ResponseCli";


