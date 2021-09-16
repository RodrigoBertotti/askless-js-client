import {Middleware} from "../../index";
import {NewDataForListener, ResponseCli} from "../../../data/response/ResponseCli";
import {ClientReceived} from "./ClientReceived";

/** @internal */
export class ClientReceivedResponse extends ClientReceived{


    constructor(messageMap:Map<string,any>, middleware:Middleware) {
        super(messageMap, true, middleware);
    }

    //override
    implementation() : void {
        const responseCli = Object.assign(new ResponseCli(null,null), this.getMessageMap()) as ResponseCli;
        this.getMiddleware().wsChannel.sendClientData.notifyThatHasBeenReceivedServerResponse(responseCli);
    }


}
