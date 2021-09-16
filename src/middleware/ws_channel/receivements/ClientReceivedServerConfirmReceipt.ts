import {ClientReceived} from "./ClientReceived";
import {ConfigureConnectionResponseCli, ServerConfirmReceiptCli} from "../../../data/response/ResponseCli";
import {ConnectionConfiguration} from "../../../data/response/ConnectionConfiguration";
import {CLIENT_LIBRARY_VERSION_CODE, CLIENT_LIBRARY_VERSION_NAME} from "../../../constants";
import {assert} from "../../../utils";
import {Middleware} from "../../index";

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
