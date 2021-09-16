import {Internal,} from "../../index";
import {Utils} from "../../utils";
const WebSocket = require('isomorphic-ws');
import {Middleware} from "../index";
import {URL} from "url";
import {ClientRequestArgs} from "http";

export abstract class AbstractWsMiddleware {

    set onopen (onopen){}
    set onmessage (onmessage){}
    set onclose (onclose: (this: WebSocket, ev: CloseEvent) => any){ }
    set onerror (onerror){ }

    get readyState (){ return -100; };

    close(code?: number, reason?: string) {};

    protected constructor(readonly middleware:Middleware){}

    get logger () {return this.middleware.logger;}

    send(data:string): void {};

    static newInstance(params:{
        address: string | URL,
        options?,
        readonly middleware:Middleware,
    }) : AbstractWsMiddleware {
        return new WsMiddleware(params);
    }
}

/** @internal */
class WsMiddleware extends AbstractWsMiddleware{
    private readonly ws:WebSocket;

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
        super(params.middleware);
        this.ws = new WebSocket(params.address, params.options);
    }

    get logger () {return this.middleware.logger;}

    send(data:string): void {
        (
            async () => {
                for(let i=0; this.readyState == 0 && i<15; i++){  //<-- TODO: analisar se é necessário fazer no cliente em flutter (clicar em reconectar com a mesma conexão várias vezes)
                    this.logger('waiting websocket connection to be with readyState != 0');
                    await Utils.wait(200); //TODO: improve this solution
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

