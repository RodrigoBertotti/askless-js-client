import {Internal,} from "../index";
import {Utils} from "../utils";
import WebSocket = require("ws");
import {Middleware} from "./Middleware";
import {URL} from "url";
import {ClientRequestArgs} from "http";


export class WsMiddleware extends WebSocket {

    constructor(public readonly params:{
        address: string | URL,
        options?: WebSocket.ClientOptions | ClientRequestArgs,
        readonly middleware:Middleware,
    }) {
        super(params.address, params.options);
    }

    get logger () { return this.params.middleware.logger; }

    // override
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
                super.send(data);
            }
        )()
    }

}
