import {REQUEST_PREFIX} from "../../constants";
import {makeId} from "../../utils";

export type SendDataListener = (data:AbstractRequestCli) => void;

//Atenção os campos de ModificationType precisam estar inclusos em RequestType
export enum RequestType {
    CREATE = "CREATE",
    UPDATE = "UPDATE",
    DELETE = "DELETE",
    LISTEN = "LISTEN",
    CONFIRM_RECEIPT = "CONFIRM_RECEIPT",
    CONFIGURE_CONNECTION = "CONFIGURE_CONNECTION",
    READ = "READ",
}

export abstract class AbstractRequestCli {

    public readonly clientRequestId:string = REQUEST_PREFIX +  makeId(10); //Tanto para o cliente, quanto para o servidor (mesma implementação nos 2 lados --->) será usado para 2 motivos: 1) confirmar recebimento de informação (3 vezes) ... 2) Caso o 1 falhar, evitar que seja recebido 2 vezes a mesma informação.

    protected constructor(public readonly requestType: RequestType, public waitUntilGetServerConnection?:boolean) {
        if(waitUntilGetServerConnection==null)
            this.waitUntilGetServerConnection = true;
    }
}

export class ClientConfirmReceiptCli extends AbstractRequestCli { // <-- fazer
    //enviar 1 vez após o recebimento da informação e deve ficar enviando isso TODA vez que o servidor tentar enviar a informação novamente
    public static readonly type = "_class_type_clientconfirmreceipt";
    private readonly _class_type_clientconfirmreceipt = "_";

    constructor(public serverId: string) {
        super(RequestType.CONFIRM_RECEIPT);
    }
}

export class ConfigureConnectionRequestCli extends AbstractRequestCli {
    //enviar 1 vez após o recebimento da informação e deve ficar enviando isso TODA vez que o servidor tentar enviar a informação novamente
    public static readonly type = "_class_type_configureconnectionrequest";
    private readonly _class_type_configureconnectionrequest = "_";

    public readonly clientType = 'javascript';

    constructor(public clientId, public headers) {
        super(RequestType.CONFIGURE_CONNECTION);
    }
}

export enum ModificationType {
    CREATE = "CREATE",
    UPDATE = "UPDATE",
    DELETE = "DELETE",
}

export class ModifyCli extends AbstractRequestCli {
    static readonly type = "_class_type_modify";
    private readonly _class_type_modify = "_";

    constructor(
        public route: string,
        modificationType: ModificationType,
        public body?,
        public query?: object
    ) {
        super((modificationType as unknown) as RequestType);
    }
}

export class ReadCli extends AbstractRequestCli {
    public static readonly type = "_class_type_read";
    private readonly _class_type_read = "_";

    constructor(public route: string, public query?: object) {
        super(RequestType.READ);
    }
}

export class ListenCli extends AbstractRequestCli {
    public static readonly type = "_class_type_listen";
    private readonly _class_type_listen = "_";
    listenId: string;


    constructor(
        public route: string,
        public query?: object
    ) {
        super(RequestType.LISTEN);
    }
}
