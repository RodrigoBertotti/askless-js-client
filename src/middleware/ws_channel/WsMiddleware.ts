import {assert, wait} from "../../utils";

const WebSocket = require('isomorphic-ws');
import {Middleware} from "../index";
import {URL} from "url";

export type WsMiddlewareParams = {
    address: string | URL,
    options?,
    readonly middleware:Middleware,
};

export function newInstanceWsMiddleware(params:WsMiddlewareParams) : AbstractWsMiddleware {
    return new WsMiddleware(params);
}

export abstract class AbstractWsMiddleware {
    private _onopen; //TODO: typed
    private _onmessage;
    private _onclose;
    private _onerror;

    protected constructor(readonly params: WsMiddlewareParams){}

    set onopen (value){this._onopen = value;}  //TODO: typed
    set onmessage (onmessage){this._onmessage = onmessage;}
    set onclose (onclose: (this: WebSocket, ev: CloseEvent) => any){this._onclose = onclose;}
    set onerror (onerror){this._onerror = onerror;}

    get onopen () {return this._onopen;}  //TODO: typed
    get onmessage () {return this._onmessage;}
    get onclose () {return this._onclose;}
    get onerror () {return this._onerror;}

    get readyState (){ return -100; };

    close(code?: number, reason?: string) {};

    get logger () {return this.params.middleware.logger;}

    send(data:string): void {};

    performConnectionOnce(): void {};

}

export class WsMiddleware extends AbstractWsMiddleware{
    private ___ws:WebSocket;

    get ws () : WebSocket {
        if(this.___ws == null){
            this.performConnectionOnce();
        }
        assert(this.___ws);
        return this.___ws;
    }

    //override
    set onopen (onopen){ this.ws.onopen = onopen; }

    //override
    set onmessage (onmessage){ this.ws.onmessage = onmessage; }

    //override
    set onclose (onclose: (this: WebSocket, ev: CloseEvent) => any){ this.ws.onclose = onclose; }

    //override
    set onerror (onerror){ this.ws.onerror = onerror; }

    //override
    get readyState () { return this.ws.readyState; };

    //override
    close(code?: number, reason?: string) { this.ws.close(code, reason) };

    constructor(
        params:{
            address: string | URL,
            options?,
            readonly middleware:Middleware,
        }
    ){
        super(params);
    }

    //override
    performConnectionOnce () {
        if(!this.___ws) {
            this.___ws = new WebSocket(this.params.address, this.params.options);
        }
    }

    //override
    get logger () {return this.params.middleware.logger;}

    //override
    send(data:string): void {
        (
            async () => {
                for(let i=0; this.readyState == 0 && i<15; i++){  //<-- TODO: analisar se é necessário fazer no cliente em flutter (clicar em reconectar com a mesma conexão várias vezes)
                    this.logger('waiting websocket connection to be with readyState != 0');
                    await wait(200); //TODO: improve this solution
                }
                if(this.readyState!=1){
                    this.logger('ignoring sending message, because websocket readyState is '+this.readyState, "error");
                    return;
                }
                this.ws.send(data);
            }
        )()
    }
}


