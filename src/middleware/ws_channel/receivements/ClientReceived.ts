import {ClientReceivedIgnore} from "./ClientReceivedIgnore";
import {ClientConfirmReceiptCli} from "../../../data/request/RequestCli";
import {Internal} from "../../../index";
import {LastServerMessage, Middleware} from "../../index";
import {ClientReceivedConfigureConnectionResponse} from "./ClientReceivedConfigureConnectionResponse";
import {ClientReceivedNewDataForListener} from "./ClientReceivedNewDataForListener";
import {ClientReceivedResponse} from "./ClientReceivedResponse";
import {ClientReceivedServerConfirmReceipt} from "./ClientReceivedServerConfirmReceipt";
import {AbstractWsMiddleware} from "../WsMiddleware";
import {assert} from "../../../utils";


/** @internal */
export abstract class ClientReceived {

    protected constructor(
        private readonly messageMap:Map<string,any>,
        private readonly confirmToServerThatDataHasBeenReceived:boolean,
        private middleware:Middleware
    ) {
        assert(typeof this.messageMap == "object", 'this.messageMap should be a map');
    }

    protected getMiddleware () {
        return this.middleware;
    }
    protected getMessageMap () {
        return this.messageMap;
    }

    get logger () { return this.middleware.logger; }
    get ws () : AbstractWsMiddleware {return this.middleware.wsChannel.ws; };

    protected implementation() : void {};

    async handle() : Promise<void> {
        assert(this.messageMap != null, '#1 messageMap should not be null');

        if(this.messageMap['_ignore_'] === true){
            return;
        }
        const serverId = this.messageMap['serverId'];
        if(serverId == null){
            throw (typeof this.messageMap).toString() + this.messageMap['serverId']+' serverId on this.messageMap'+(this.messageMap);
        }
        if(!this.confirmToServerThatDataHasBeenReceived){
            this.implementation();
            return;
        }
        this.confirmReceiptToServer(serverId);

        const dataAlreadySentByServerBefore:LastServerMessage|undefined = this.middleware.lastMessagesFromServer.find((m) => {
            assert(m != null, "lastMessagesFromServer has null fields");
            return m.serverId == serverId;
        });
        if(dataAlreadySentByServerBefore){
            this.logger("handle, data already received: " + serverId);
            dataAlreadySentByServerBefore.messageReceivedAtSinceEpoch = Date.now();
            return;
        }
        this.middleware.lastMessagesFromServer.push(new LastServerMessage(serverId));
        this.checkCleanOldMessagesFromServer();
        this.implementation();
    }

    static get startCheckingLastMessagesFromServerAfterSize () : number { return 100; };

    private checkCleanOldMessagesFromServer(removeCount?:number) : void {
        if(removeCount == null)
            removeCount = 10;

        const NOW = Date.now();
        if(this.getMiddleware().lastMessagesFromServer.length > ClientReceived.startCheckingLastMessagesFromServerAfterSize){
            this.logger("Start of removing unnecessary info's... ("+(this.getMiddleware().lastMessagesFromServer.length.toString())+")");

            // JavaScript heap out of memory

            const remove = Array<LastServerMessage>();
            // for(let i=this.getMiddleware().lastMessagesFromServer.length-1; i>=0 || remove.length>=removeCount; i--){
            for(let i=this.getMiddleware().lastMessagesFromServer.length-1; i>=0 && remove.length < removeCount; i--){
                const messageReceivedFromServer = this.getMiddleware().lastMessagesFromServer[i];
                if(messageReceivedFromServer == null || messageReceivedFromServer.messageReceivedAtSinceEpoch + 10 * 60 * 1000 < NOW) //keep received message for 10 minutes
                    remove.push(messageReceivedFromServer);
            }
            remove.forEach((element) => this.getMiddleware().lastMessagesFromServer.splice(this.getMiddleware().lastMessagesFromServer.indexOf(element), 1));
            this.logger("End of removing unnecessary info's... ("+(this.getMiddleware().lastMessagesFromServer.length.toString())+")");
        }
    }

    private confirmReceiptToServer(serverId: string): void {
        assert(serverId != null, 'confirmReceiptToServer: serverId is null');

        this.logger("confirmReceiptToServer " + serverId);

        if (this.ws == null)
            this.logger("this.ws==null", "error");

        this.ws.send(JSON.stringify(new ClientConfirmReceiptCli(serverId)));
    }
}
