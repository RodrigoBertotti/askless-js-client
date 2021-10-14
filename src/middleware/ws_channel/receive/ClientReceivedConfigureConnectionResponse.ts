import {ClientReceived} from "./ClientReceived";
import {CLIENT_LIBRARY_VERSION_CODE, CLIENT_LIBRARY_VERSION_NAME} from "../../../constants";
import {assert} from "../../../utils";
import {Middleware} from "../../index";
import {DisconnectionReason} from "../../../index";
import {ConfigureConnectionResponseCli} from "../../../data/response/ResponseCli";
import {ConnectionConfiguration} from "../../../data/response/ConnectionConfiguration";

/** @internal */
export class ClientReceivedConfigureConnectionResponse extends ClientReceived {

    constructor(messageMap:Map<string,any>, middleware:Middleware) {
        super(messageMap, true, middleware);
    }

    //override
    implementation() : void {
        const serverConnectionReadyCli = Object.assign(new ConfigureConnectionResponseCli(null,null,null), super.getMessageMap());
        const notifyServerResponseResult = super.getMiddleware().wsChannel.sendClientData.notifyThatHasBeenReceivedServerResponse(serverConnectionReadyCli);
        if(!notifyServerResponseResult){
            this.logger("notifyServerResponseResult is false, ignoring ConfigureConnectionResponseCli");
            return;
        }
        try{
            this.checkIfIsNeededToStopConnectionFromBeingEstablished(serverConnectionReadyCli.output as ConnectionConfiguration);
        }catch (e){
            this.getMiddleware().connectionAttempt.reject(e);
            return;
        }
        this.getMiddleware().connectionAttempt.resolve(serverConnectionReadyCli); //Terminou de conectar
        this.connectionReady(serverConnectionReadyCli.output);
    }

    connectionReady(connectionConfiguration:ConnectionConfiguration) : void {
        this.logger('connectionReady');

        if (connectionConfiguration != null) {
            this.getMiddleware().connectionConfiguration = connectionConfiguration;
        } else {
            throw ("connectionConfiguration is null");
        }

        try{
            this.checkIfIsNeededToStopConnectionFromBeingEstablished(connectionConfiguration);
        }catch (e){
            this.getMiddleware().connectionAttempt.reject(e);
            return;
        }

        this.getMiddleware().internal.sendPingTask.changeInterval(connectionConfiguration.intervalInSecondsClientPing);

        // Delay to avoid sending to LISTEN request's at the same time
        setTimeout(() => {
            this.getMiddleware().internal.sendMessageToServerAgainTask.changeInterval(connectionConfiguration.intervalInSecondsClientSendSameMessage);
        }, connectionConfiguration.intervalInSecondsClientSendSameMessage * 1000);

        this.getMiddleware().internal.notifyConnectionChanged("CONNECTED_WITH_SUCCESS");
        assert(this.ws.readyState == 1);
    }

    checkIfIsNeededToStopConnectionFromBeingEstablished(connectionConfiguration:ConnectionConfiguration){
        if (
            (connectionConfiguration.clientVersionCodeSupported.moreThanOrEqual != null && CLIENT_LIBRARY_VERSION_CODE < connectionConfiguration.clientVersionCodeSupported.moreThanOrEqual)
            ||
            (connectionConfiguration.clientVersionCodeSupported.lessThanOrEqual != null && CLIENT_LIBRARY_VERSION_CODE > connectionConfiguration.clientVersionCodeSupported.lessThanOrEqual)
        ) {
            this.getMiddleware().disconnectAndClear();
            this.getMiddleware().internal.disconnectionReason = new DisconnectionReason("VERSION_CODE_NOT_SUPPORTED");
            throw Error("Check if you server and client are updated! Your Client version on server is " + connectionConfiguration.serverVersion + ". Your Client client version is " + CLIENT_LIBRARY_VERSION_NAME)
        }

        if (this.getMiddleware().internal.asklessClient.projectName != null && connectionConfiguration.projectName != null && this.getMiddleware().internal.asklessClient.projectName != connectionConfiguration.projectName) {
            this.getMiddleware().disconnectAndClear();
            this.getMiddleware().internal.disconnectionReason = new DisconnectionReason("WRONG_PROJECT_NAME");
            throw Error("Looks like you are not running the right server (" + connectionConfiguration.projectName + ") to your Flutter JavaScript project (" + this.getMiddleware().internal.asklessClient.projectName + ")");
        }
    }

}
