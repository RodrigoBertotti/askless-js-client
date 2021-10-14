import {ClientReceived} from "./ClientReceived";
import {Middleware} from "../../index";
import {ServerConfirmReceiptCli} from "../../../data/response/ResponseCli";

/** @internal */
export class ClientReceivedServerConfirmReceipt extends ClientReceived {


    constructor(messageMap:Map<string,any>, middleware:Middleware) {
        super(messageMap, false, middleware);
    }

    //override
    implementation() : void {
        const serverConfirmReceiptCli:ServerConfirmReceiptCli = Object.assign(new ServerConfirmReceiptCli(null), super.getMessageMap());
        this.getMiddleware().wsChannel.sendClientData.setAsReceivedPendingMessageThatServerShouldReceive(serverConfirmReceiptCli.clientRequestId);
    }


}
