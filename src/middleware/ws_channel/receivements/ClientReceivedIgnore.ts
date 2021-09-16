import {Middleware} from "../../index";
import {ClientReceived} from "./ClientReceived";

/** @internal */
export class ClientReceivedIgnore extends ClientReceived{

    constructor(middleware:Middleware) {
        super(Object.assign(new Map(), {_ignore_ : true}), false, middleware);
    }

}
