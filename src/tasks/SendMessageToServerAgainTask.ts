import {TimedTask} from "./TimedTask";
import {Connection, OnConnectionChangeListener} from "../connection";
import {ConnectionConfiguration} from "../data/response/ConnectionConfiguration";
import {assert} from "../utils";
import {Internal} from "../index";


export class SendMessageToServerAgainTask extends TimedTask {
    onConnectionChange:OnConnectionChangeListener;

    constructor(readonly internal:Internal) {
        super('SendMessageToServerAgainTask', new ConnectionConfiguration().intervalInSecondsClientSendSameMessage);
    }

    run(): void {
        if (this.internal.connection!="DISCONNECTED") {
            this.internal.middleware?.wsChannel.sendClientData.sendMessagesToServerAgain();
        }
    }




}
