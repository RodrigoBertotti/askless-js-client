import {TimedTask} from "./TimedTask";
import {PingPong} from "../data/connection/PingPong";
import {Middleware} from "../middleware";
import {ConnectionConfiguration} from "../data/response/ConnectionConfiguration";




export class SendPingTask extends TimedTask{
    constructor(
        public readonly getMiddleware:(() => Middleware),
    ) {
        super('SendPingTask', new ConnectionConfiguration().intervalInSecondsClientPing);
    }

    run(): void {
        try{
            if(this.getMiddleware().internal.connection != "DISCONNECTED" && this.getMiddleware()) {
                this.getMiddleware().wsChannel.ws.send(JSON.stringify(new PingPong(this.getMiddleware().superListeningToArray)));
            }
        }catch (e) {
            this.getMiddleware().logger('Ping failed: '+e.toString(), "error");
        }
    }

}
