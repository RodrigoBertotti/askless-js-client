
export const DEFAULT_REQUEST_TIMEOUT_IN_SECONDS = 15;

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
    } = {moreThanOrEqual: null, lessThanOrEqual: null};
    isFromServer:boolean = false;
    projectName:string;
    requestTimeoutInSeconds:number = DEFAULT_REQUEST_TIMEOUT_IN_SECONDS;

}
