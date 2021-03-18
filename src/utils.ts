import {CLIENT_GENERATED_ID_PREFIX} from "./constants";
import {environment} from "./index";

export function assert(expression){
    if(environment == "development") {
        require('assert')(expression);
    }
}

export class Utils {

    static myIPv4() {
        const nets = require('os').networkInterfaces();

        for (const name of Object.keys(nets)) {
            for (const net of nets[name]) {
                // skip over non-ipv4 and internal (i.e. 127.0.0.1) addresses
                if (net.family === 'IPv4' && !net.internal) {
                    return net.address;
                }
            }
        }

        return null;
    }

    public static async wait(ms: number) {
        //https://stackoverflow.com/a/33292942/4508758
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    //https://stackoverflow.com/a/1349426/4508758
    public static makeId(length?: number): string {
        if (!length) length = 10;
        let result = "";
        let characters =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let charactersLength = characters.length;
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    static getOwnClientId(clientId) {
        if (clientId == null) return null;
        return clientId.toString().startsWith(CLIENT_GENERATED_ID_PREFIX)
            ? null
            : clientId;
    }

    static isJson(obj): boolean {
        const t = typeof obj;
        return (
            ["boolean", "number", "string", "symbol", "function"].indexOf(t) == -1
        );
    }
}
