import {TimedTask} from "./TimedTask";
import {PingPong} from "../middleware/data/connection/PingPong";
import {Internal, logger} from "../index";
import {ConnectionConfiguration} from "../middleware/data/response/ConnectionConfiguration";
import {wsSend} from "../middleware/ws";


export class SendPingTask extends TimedTask{
    constructor() {
        super('SendPingTask', new ConnectionConfiguration().intervalInSecondsClientPing);
    }

    run(): void {
        try{
            if(Internal.instance.connection != "DISCONNECTED") {
                wsSend(JSON.stringify(new PingPong(Internal.instance.middleware.superListeningToArray)));
            }
        }catch (e) {
            logger('Ping failed', "error");
        }
    }

}
