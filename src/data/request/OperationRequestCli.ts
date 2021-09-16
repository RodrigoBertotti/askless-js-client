import {AbstractRequestCli} from "./RequestCli";
import {RequestType} from "../Types";

abstract class _ModifyCli extends AbstractRequestCli{
  readonly _class_type_modify = '_';

  protected constructor(
      public readonly route:string,
      requestType:RequestType,
      public readonly body,
      public readonly query
  ) {
    super(requestType, false);
  }
}

export class CreateCli extends _ModifyCli{
  constructor(route:string, body, query) {
    super(route, RequestType.CREATE, body, query);
  }
}

export class ReadCli extends AbstractRequestCli{
  readonly _class_type_read = '_';

  constructor(
      public readonly route:string,
      public readonly requestType:RequestType,
      public readonly body,
      public readonly query
  ) {
    super(RequestType.READ, false);
  }
}

export class UpdateCli extends _ModifyCli{
  constructor(route:string, body, query) {
    super(route, RequestType.UPDATE, body, query);
  }
}

export class DeleteCli extends _ModifyCli{
  constructor(route:string, query) {
    super(route, RequestType.DELETE, null, query);
  }
}


class ListenCli extends AbstractRequestCli{
  static readonly type = '_class_type_listen';
  readonly _class_type_listen = '_';
  static readonly jsonListenId = 'listenId';

  readonly route:string;
  readonly query;
  readonly listenId:string;

  constructor() {
    super(RequestType.LISTEN, true);
  }
}
