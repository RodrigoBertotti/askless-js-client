import {TimedTask} from "./TimedTask";
import {PingPong} from "../data/connection/PingPong";
import {Internal, } from "../index";
import {ConnectionConfiguration} from "../data/response/ConnectionConfiguration";


export class SendPingTask extends TimedTask{
    constructor(public readonly internal:Internal) {
        super('SendPingTask', new ConnectionConfiguration().intervalInSecondsClientPing);
    }

    run(): void {
        try{
            if(this.internal.connection != "DISCONNECTED") {
                this.internal.middleware.wsChannel.ws.send(JSON.stringify(new PingPong(this.internal.middleware.superListeningToArray)));
            }
        }catch (e) {
            this.internal.logger('Ping failed', "error");
        }
    }

}
