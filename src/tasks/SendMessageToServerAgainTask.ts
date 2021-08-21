import {TimedTask} from "./TimedTask";
import {ConnectionConfiguration} from "../middleware/data/response/ConnectionConfiguration";
import {Connection, Internal, OnConnectionChangeListener} from "../index";


export class SendMessageToServerAgainTask extends TimedTask {
    onConnectionChange:OnConnectionChangeListener;

    constructor(public readonly internal:Internal) {
        super('SendMessageToServerAgainTask', new ConnectionConfiguration().intervalInSecondsClientSendSameMessage);
    }

    run(): void {
        if (this.internal.connection!="DISCONNECTED")
            this.internal.middleware?.sendClientData?.sendMessagesToServerAgain();
    }


}
