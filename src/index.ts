import {SendMessageToServerAgainTask} from "./tasks/SendMessageToServerAgainTask";
import {SendPingTask} from "./tasks/SendPingTask";
import {Listening, Middleware} from "./middleware/Middleware";
import {
    ConfigureConnectionResponseCli,
    NewDataForListener,
    ResponseCli,
    ResponseError
} from "./middleware/data/response/ResponseCli";
import {ListenCli, ReadCli} from "./middleware/data/request/RequestCli";
import {CreateCli, DeleteCli, UpdateCli} from "./middleware/data/request/OperationRequestCli";
import {ConnectionConfiguration} from "./middleware/data/response/ConnectionConfiguration";
import {CLIENT_GENERATED_ID_PREFIX} from "./constants";
import {Utils} from "./utils";
import {getWS} from "./middleware/ws";


export type DisconnectionReason =  'TOKEN_INVALID' | 'UNDEFINED' | 'DISCONNECTED_BY_CLIENT' | 'VERSION_CODE_NOT_SUPPORTED' | 'WRONG_PROJECT_NAME';
export type Connection = 'CONNECTED_WITH_SUCCESS' | 'CONNECTION_IN_PROGRESS' | 'DISCONNECTED';

export type OnConnectionChangeListener = (connection:Connection) => void;
export type Level = 'info' | 'warning' | 'debug' | 'error';
export type LoggerFunction = (message:string, level?:Level, additionalData?:any) => void;

function _getDefaultLogger (message:string, level?:Level, additionalData?:any)  {
   if(!level || !level.toString().length)
       level = "debug";

   const PREFIX = "> askless [" +level.toString().toUpperCase() +"]: ";
   console.log(PREFIX+message);
   if(additionalData!=null)
       console.log(typeof additionalData == "string" ? additionalData : JSON.stringify(additionalData));
}

export const environment : 'production' | 'development' = process.env.ENV as any;

/**
 * Allow customize the behavior of internal logs and enable/disable the default logger (optional).
 *
 * @param useDefaultLogger If `true`: the default logger will be used (optional). Set to `false` on a production environment. Default: `false`
 *
 * @param customLogger  Allows the implementation of a custom logger (optional). Let it `null` on a production environment
 *
 * @example
 *
 *       AsklessClient.instance.init({
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
    private static _instance:Internal;
    tasksStarted:boolean = false;
    sendMessageToServerAgainTask:SendMessageToServerAgainTask = new SendMessageToServerAgainTask();
    sendPingTask:SendPingTask = new SendPingTask();
    //reconnectWhenOffline:ReconnectWhen
    serverUrl:string;
    middleware:Middleware;
    _onConnectionWithServerChangeListeners:Array<OnConnectionChangeListener> = [];
    connection:Connection = "DISCONNECTED";
    disconnectionReason:DisconnectionReason;
    logger: (message: string, level?: Level, additionalData?:any) => void;

    get clientId () {
        return Internal.instance.middleware.clientId;
    }


    /** @internal */
    static get instance (){
        if(!Internal._instance)
            Internal._instance = new Internal();

        return Internal._instance;
    }

    notifyConnectionChanged(conn:Connection, disconnectionReason?:DisconnectionReason) : void{
        if(this.connection == conn){
            logger('Ignoring notifyConnectionChanged, because '+conn+' has been already set');
            return;
        }
        logger('notifyConnectionChanged: '+conn + (' '+disconnectionReason||''), "debug")
        this.connection = conn;
        this._onConnectionWithServerChangeListeners.forEach((listener) => listener(conn));
        if(conn=="DISCONNECTED")
            this.disconnectionReason = disconnectionReason || "UNDEFINED";
    }

}

export class AsklessClient {
    private _projectName:string;


    /**
     *  Name for this project (optional).
     *  If `!= null`: the field `projectName` on server side must have the same name (optional).
    */
    get projectName():string { return this._projectName; };
    get serverUrl():string { return Internal.instance?.serverUrl; };

    private _ownClientId:string;
    private _headers:object;

    private static _instance:AsklessClient;

    /**
     * Askless client
     * */
    static get instance () {
        if(!this._instance)
            this._instance = new AsklessClient();
        return this._instance;
    };

    /**
     *  Get the status of the connection with the server.
    */
    get connection():Connection {
        return Internal.instance.connection;
    }

    /**
     * May indicate the reason of no connection.
     * */
    get disconnectReason():DisconnectionReason {
        return Internal.instance.disconnectionReason;
    };


    /**
     *  Try perform a connection with the server.
     *
     *  @param params Object that hold the params of this function
     *
     *  @param params.ownClientId: The ID of the user defined in your application.
     *  This field must NOT be `null` when the user is logging in,
     *  otherwise must be `null` (optional).
     *
     *  @param params.headers: Allows informing the token of the respective `ownClientId` (and/or additional data)
     *  so that the server can be able to accept or recuse the connection attempt (optional).
     *
     *  In the server side, you can implement [grantConnection](https://github.com/WiseTap/askless/blob/master/documentation/english_documentation.md#grantconnection)
     *  to accept or deny connections attempts from the client.
     *
     *  @returns Returns the result of the connection attempt.
     *
     *  @example
     *
     *          const connectionResponse = await AsklessClient.instance.connect({
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

        if(getWS()?.readyState==0 || Internal.instance.connection == "CONNECTION_IN_PROGRESS"){
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

        logger("connecting...", );

        if(Internal.instance.serverUrl != this.serverUrl)
            logger( "server: "+this.serverUrl, "debug", );

        if(Internal.instance.middleware==null || Internal.instance.serverUrl!=this.serverUrl || params.ownClientId != params.ownClientId){
            this._disconnectAndClearByClient();
            Internal.instance.middleware = new Middleware(this.serverUrl);
        }else{
            Internal.instance.middleware.close(true);
        }
        this._ownClientId = params.ownClientId;
        this._headers = params.headers || {};

        return  (await Internal.instance.middleware.connect(this._ownClientId, this._headers));
    }

    /**
     * Stop the connection with the server and clear the credentials `headers` and `ownClientId`.
     * */
    disconnect():void {
        logger("disconnect", "debug");

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
        Internal.instance._onConnectionWithServerChangeListeners.push(params.listener);
        if(params.runListenerNow==null || params.runListenerNow==true)
            params.listener(this.connection);
    }

    /**
     * Removes the added {@link listener}.
    */
    removeOnConnectionChange(listener:OnConnectionChangeListener):void {
        Internal.instance._onConnectionWithServerChangeListeners.splice(Internal.instance._onConnectionWithServerChangeListeners.indexOf(listener, 1));
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

        logger( "reconnect", "debug",);

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

        return Internal.instance.middleware.runOperationInServer(new CreateCli(params.route, params.body, params.query  || new Map()), params.neverTimeout);
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

        return Internal.instance.middleware.runOperationInServer(new UpdateCli(params.route, params.body, params.query || new Map()), params.neverTimeout);
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

        return Internal.instance.middleware.runOperationInServer(new DeleteCli(params.route, params.query || new Map()), params.neverTimeout);
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

        return Internal.instance.middleware.runOperationInServer(new ReadCli( params.route, params.query || new Map()), params.neverTimeout);
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
      *        const listening = AsklessClient.instance.listen({
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

        const res = Internal.instance.middleware.listen(new ListenCli(params.route, params.query || new Map(),));
        if(params?.listener){
            res.setListener(params.listener);
        }
        return res;
    }


    private async _assertHasMadeConnection():Promise<void> {
        if(Internal.instance.connection === "DISCONNECTED"){
            await this.connect({headers: null, ownClientId: null});
            logger('You didn\'t call the method `connect` yet, so the connection will be made with null values for `ownClientId` and `headers` params', "warning");
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
     * @param params.logger  {@link LoggerParam Allow customize the behavior of internal logs and enable/disable the default logger (optional).}
     *
     * @param params.projectName Name for this project (optional).
     * If `!= null`: the field {@link projectName} on server side must have the same name (optional).
     *
     * @example
     *
     *
     *       AsklessClient.instance.init({
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
        const defaultLogger = params.logger?.useDefaultLogger || (params.logger?.useDefaultLogger != false && environment=="development") ? _getDefaultLogger : null;
        Internal.instance.logger = (message:string, level:Level, additionalData) =>  {
            if(!level)
                level = "debug";

            if(defaultLogger)
                defaultLogger(message, level, additionalData);
            if(params?.logger?.customLogger)
                params?.logger?.customLogger(message, level, additionalData);
        };

        this._checkEnvironmentToShowWarningsIfNecessary(defaultLogger, params);

        logger(`askless-js-client initialized`, "debug");

        if(params.serverUrl==null)
            throw Error("params.serverUrl must not be null");
        if(!params.serverUrl.startsWith('ws:') && !params.serverUrl.startsWith('wss:')){
            throw Error("params.serverUrl must starts with ws:// or wss://");
        }
        if(params.serverUrl.includes('192.168.') && !params.serverUrl.includes(':'))
            throw Error('Please, inform the port on the serverUrl, default is 3000, example: ws://192.168.2.1:3000');

        Internal.instance.serverUrl = params.serverUrl;
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
                Internal.instance.logger('\n'+ warningMessage, "debug");
            else
                console.log(warningMessage);
        }else{
            if(defaultLogger){
                Internal.instance.logger('\n'+
                    '****************************************************************************************\n' +
                    '  WARNING: useDefaultLogger is \'true\', SET it to \'false\' on a production environment \n' +
                    '****************************************************************************************',
                    "warning"
                );
            }
            if(params?.logger?.customLogger){
                Internal.instance.logger( '\n' +
                    '*************************************************************************************************************************\n' +
                    '  WARNING: You are using a customLogger, data content can appear on the logs (logs with \'debug\' level shows it a lot) \n' +
                    '*************************************************************************************************************************',
                    "warning"
                );
            }
        }
    }

    private _disconnectAndClearByClient():void {
        Internal.instance.middleware?.disconnectAndClear(() => {
            Internal.instance.disconnectionReason = "DISCONNECTED_BY_CLIENT";
        });
    }
}

export {Listening, } from "./middleware/Middleware";
export {NewDataForListener} from "./middleware/data/response/ResponseCli";

/** @internal */
export const logger = (message: string, level?: Level, additionalData?) => Internal.instance?.logger(message,level,additionalData);


