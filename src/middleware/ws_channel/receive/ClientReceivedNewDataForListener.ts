import {ClientReceived} from "./ClientReceived";
import {assert} from "../../../utils";
import {Middleware} from "../../index";
import {NewDataForListener} from "../../../data/response/ResponseCli";

/** @internal */
export class ClientReceivedNewDataForListener extends ClientReceived {


    constructor(messageMap:Map<string,any>, middleware:Middleware) {
        super(messageMap, true, middleware);
    }

    //override
    implementation() : void {
        const listen:NewDataForListener = Object.assign(new NewDataForListener(null,null), super.getMessageMap());
        this.onNewData(listen);
    }

    onNewData(message: NewDataForListener): void {
        const sub = this.getMiddleware().superListeningToArray.find((s) => s.listenId == message.listenId);
        if (sub != null) {
            if (sub.onMessage)
                sub.onMessage(message);
            else
                this.logger('onNewData is null on ClientListeningToRoute', "error",);
            sub.lastReceiveFromServer = message;
        } else
            this.logger('NewDataForListener is null: NewDataForListener.listenId:'+message.listenId, "error", this.getMiddleware().superListeningToArray || 'superListeningToArray é null');
    }
}
