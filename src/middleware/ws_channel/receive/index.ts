import {Middleware} from "../../index";
import {ClientReceivedIgnore} from "./ClientReceivedIgnore";
import {ClientReceivedConfigureConnectionResponse} from "./ClientReceivedConfigureConnectionResponse";
import {ClientReceivedServerConfirmReceipt} from "./ClientReceivedServerConfirmReceipt";
import {ClientReceivedNewDataForListener} from "./ClientReceivedNewDataForListener";
import {ClientReceivedResponse} from "./ClientReceivedResponse";
import {ClientReceived} from "./ClientReceived";
import {assert} from "../../../utils";
import {NewDataForListener} from "../../../index";
import {ConfigureConnectionResponseCli, ResponseCli, ServerConfirmReceiptCli} from "../../../data/response/ResponseCli";

export function newClientReceivedFrom(data, middleware:Middleware) : ClientReceived {
    assert(data != null, 'data should not be null');

    if(data == 'pong' || data == 'welcome')
        return new ClientReceivedIgnore(middleware);

    // middleware.logger('message received from server (not a pong)', "debug", environment == "development" ? data : 'hidden');
    middleware.logger('message received from server (not a pong)', "debug",);

    data = typeof data == "string" ? JSON.parse(data) : data;

    assert(data != null, '#2 messageMap should not be null');

    if(data['serverId']==null)
        throw 'Unknown: '+JSON.stringify(data);

    if(data[ConfigureConnectionResponseCli.type])
        return new ClientReceivedConfigureConnectionResponse(data, middleware);
    if(data[ServerConfirmReceiptCli.type])
        return new ClientReceivedServerConfirmReceipt(data, middleware);
    if(data[NewDataForListener.type])
        return new ClientReceivedNewDataForListener(data, middleware);
    if(data[ResponseCli.type])
        return new ClientReceivedResponse(data, middleware);

    throw "TODO: "+data.toString();
}
