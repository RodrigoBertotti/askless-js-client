import {TimedTask} from "./TimedTask";
import {ConnectionConfiguration} from "../middleware/data/response/ConnectionConfiguration";
import {Connection, Internal, OnConnectionChangeListener} from "../index";


export class SendMessageToServerAgainTask extends TimedTask {
    onConnectionChange:OnConnectionChangeListener;

    constructor() {
        super('SendMessageToServerAgainTask', new ConnectionConfiguration().intervalInSecondsClientSendSameMessage);
    }

    run(): void {
        if (Internal.instance.connection!="DISCONNECTED")
            Internal.instance.middleware?.sendClientData?.sendMessagesToServerAgain();
    }


}
