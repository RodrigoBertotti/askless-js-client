import {Middleware} from "../../index";
import {ClientReceivedIgnore} from "./ClientReceivedIgnore";
import {ClientReceivedConfigureConnectionResponse} from "./ClientReceivedConfigureConnectionResponse";
import {ClientReceivedServerConfirmReceipt} from "./ClientReceivedServerConfirmReceipt";
import {ClientReceivedNewDataForListener} from "./ClientReceivedNewDataForListener";
import {ClientReceivedResponse} from "./ClientReceivedResponse";
import {ClientReceived} from "./ClientReceived";
import {assert} from "../../../utils";
import {environment} from "../../../index";

export function newClientReceivedFrom(data, middleware:Middleware) : ClientReceived {
    assert(data != null, 'data should not be null');

    if(data == 'pong' || data == 'welcome')
        return new ClientReceivedIgnore(middleware);

    // middleware.logger('message received from server (not a pong)', "debug", environment == "development" ? data : 'hidden');
    middleware.logger('message received from server (not a pong)', "debug",);

    data = typeof data == "string" ? JSON.parse(data) : data;

    assert(data != null, '#2 messageMap should not be null');

    if(data['serverId']==null)
        throw 'Unknown: '+data.toString();

    if(data['_class_type_configureconnection'])
        return new ClientReceivedConfigureConnectionResponse(data, middleware);
    if(data['_class_type_serverconfirmreceipt'])
        return new ClientReceivedServerConfirmReceipt(data, middleware);
    if(data['_class_type_newDataForListener'])
        return new ClientReceivedNewDataForListener(data, middleware);
    if(data['_class_type_response'])
        return new ClientReceivedResponse(data, middleware);

    throw "TODO: "+data.toString();
}
