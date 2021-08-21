import {Middleware} from "./Middleware";
import {
    ConfigureConnectionResponseCli,
    NewDataForListener,
    ResponseCli,
    ServerConfirmReceiptCli
} from "./data/response/ResponseCli";
import {AsklessClient} from "../index";
import {ConnectionConfiguration} from "./data/response/ConnectionConfiguration";

export class LastServerMessage {
    public messageReceivedAtSinceEpoch:number = Date.now();

    constructor(public readonly serverId:string) {}
}

export class HandleReceive {
    readonly lastMessagesFromServer: Array<LastServerMessage> = [];

    constructor(public readonly middleware:Middleware, public readonly onReceiveConnectionConfigurationFromServer:(connectionConfiguration:ConfigureConnectionResponseCli) => void) {}

    get logger () { return this.middleware.logger; }

    handle(messageMap) : void {
        if(messageMap.serverId == null){
            throw new Error('Unknown: '+messageMap);
        }

        if(messageMap[ServerConfirmReceiptCli.type] != null){
            const serverConfirmReceiptCli:ServerConfirmReceiptCli = Object.assign(new ServerConfirmReceiptCli(null), messageMap);
            this.middleware.sendClientData.setAsReceivedPendingMessageThatServerShouldReceive(serverConfirmReceiptCli.clientRequestId);
            return;
        }

        const serverId = messageMap.serverId;
        this.middleware.confirmReceiptToServer(serverId);

        const dataAlreadySentByServerBefore = this.lastMessagesFromServer.find((m) => m.serverId == serverId);
        if(dataAlreadySentByServerBefore != null){
            this.logger("handle, data already received: " + serverId);
            dataAlreadySentByServerBefore.messageReceivedAtSinceEpoch = Date.now();
            return;
        }

        this.lastMessagesFromServer.push(new LastServerMessage(serverId));

        //Removing unnecessary info's
        const NOW = Date.now();
        if(this.lastMessagesFromServer.length > 100){
            this.logger("Start of removing unnecessary info's... ("+(this.lastMessagesFromServer.length.toString())+")");
            const remove = Array<LastServerMessage>();
            for(let i=this.lastMessagesFromServer.length-1; i>=0 || remove.length>=10; i--){
                const messageReceivedFromServer = this.lastMessagesFromServer[i];
                if(messageReceivedFromServer == null || messageReceivedFromServer.messageReceivedAtSinceEpoch + 10 * 60 * 1000 < NOW) //keep received message for 10 minutes
                    remove.push(messageReceivedFromServer);
            }
            remove.forEach((element) => this.lastMessagesFromServer.splice(this.lastMessagesFromServer.indexOf(element), 1));
            this.logger("End of removing unnecessary info's... ("+(this.lastMessagesFromServer.length.toString())+")");
        }


        if(messageMap[NewDataForListener.type] != null) {
            const listen:NewDataForListener = Object.assign(new NewDataForListener(null,null), messageMap);
            this.middleware.onNewData(listen);
        }
        else if(messageMap[ConfigureConnectionResponseCli.type] != null) {
            const serverConnectionReadyCli:ConfigureConnectionResponseCli = Object.assign(new ConfigureConnectionResponseCli(null,null), messageMap);
            const connectionConfiguration = serverConnectionReadyCli.output as ConnectionConfiguration;
            const notifyServerResponseResult = this.middleware.sendClientData.notifyServerResponse(serverConnectionReadyCli);
            if(!notifyServerResponseResult){
                this.logger("notifyServerResponseResult is false, ignoring ConfigureConnectionResponseCli");
                return;
            }
            this.onReceiveConnectionConfigurationFromServer(serverConnectionReadyCli);
            this.middleware.connectionReady(serverConnectionReadyCli.output as ConnectionConfiguration, serverConnectionReadyCli.error, );

            if (this.middleware.asklessClient.projectName != null && connectionConfiguration.projectName != null && this.middleware.asklessClient.projectName != connectionConfiguration.projectName) {
                this.middleware.disconnectAndClear();
                throw Error("Looks like you are not running the right server (" + connectionConfiguration.projectName + ") to your JavaScript Client project (" + this.middleware.asklessClient.projectName + ")");
            }

        } else if(messageMap[ResponseCli.type] != null){
            const responseCli = Object.assign(new ResponseCli(null,null), messageMap) as ResponseCli;
            this.middleware.sendClientData.notifyServerResponse(responseCli);
        } else{
            throw 'Nothing to: '+(typeof messageMap)+' -> '+JSON.stringify(messageMap);
        }
    }
}
