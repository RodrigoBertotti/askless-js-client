import {TimedTask} from "./TimedTask";
import {PingPong} from "../middleware/data/connection/PingPong";
import {Internal, } from "../index";
import {ConnectionConfiguration} from "../middleware/data/response/ConnectionConfiguration";


export class SendPingTask extends TimedTask{
    constructor(public readonly internal:Internal) {
        super('SendPingTask', new ConnectionConfiguration().intervalInSecondsClientPing);
    }

    run(): void {
        try{
            if(this.internal.connection != "DISCONNECTED") {
                this.internal.logger(JSON.stringify(new PingPong(this.internal.middleware.superListeningToArray)));
            }
        }catch (e) {
            this.internal.logger('Ping failed', "error");
        }
    }

}
