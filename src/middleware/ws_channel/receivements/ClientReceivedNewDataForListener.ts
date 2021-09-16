import {ClientReceived} from "./ClientReceived";
import {
    ConfigureConnectionResponseCli,
    NewDataForListener,
    ServerConfirmReceiptCli
} from "../../../data/response/ResponseCli";
import {ConnectionConfiguration} from "../../../data/response/ConnectionConfiguration";
import {CLIENT_LIBRARY_VERSION_CODE, CLIENT_LIBRARY_VERSION_NAME} from "../../../constants";
import {assert} from "../../../utils";
import {Middleware} from "../../index";

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
            sub.lastReceivementFromServer = message;
        } else
            this.logger('NewDataForListener is null: NewDataForListener.listenId:'+message.listenId, "error", this.getMiddleware().superListeningToArray || 'superListeningToArray é null');
    }
}
