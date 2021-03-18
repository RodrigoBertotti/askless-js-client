import {Internal, logger} from "../index";
import {Utils} from "../utils";
import WebSocket = require("ws");

let _ws:WebSocket;

export const setWS = (ws:WebSocket) => {
    _ws = ws;
}

export const getWS = () : WebSocket => {
    return _ws;
}

export const wsSend = async (json:string) => {
    if(!_ws){
        logger('ignoring sending message, because websocket is null', "error");
        return;
    }
    for(let i=0;getWS()?.readyState == 0 && i<300; i++){  //<-- TODO: analisar se é necessário fazer no cliente em flutter (clicar em reconectar com a mesma conexão várias vezes)
        logger('waiting websocket connection to be established');
        await Utils.wait(10); //TODO: improve this solution
    }
    if(_ws?.readyState!=1){
        logger('ignoring sending message, because websocket readyState is '+_ws?.readyState, "error");
        return;
    }
    _ws?.send(json);
}
