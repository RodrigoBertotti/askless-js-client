


export class ConnectionConfiguration {

    intervalInSecondsServerSendSameMessage:number = 5;
    intervalInSecondsClientSendSameMessage:number = 5;
    intervalInSecondsClientPing:number = 5;
    reconnectClientAfterSecondsWithoutServerPong:number = 10;
    disconnectClientAfterSecondsWithoutClientPing:number = 38;
    serverVersion:string;
    clientVersionCodeSupported: {
        lessThanOrEqual:number,
        moreThanOrEqual:number,
    };
    isFromServer:boolean = false;
    projectName:string;
    requestTimeoutInSeconds:number = 15;

}
