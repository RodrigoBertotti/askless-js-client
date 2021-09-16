// Import Askless:
//-> Node App:
//   import { AsklessClient } from "askless-js-client/node";
//      OR
//   const AsklessClient = require("askless-js-client/node")
//-> Web App:
//   import { AsklessClient } from "askless-js-client/web";
//      OR
//   const AsklessClient = require("askless-js-client/web")

import { AsklessClient } from "../../../dist/askless-js-client/web-debug";


export const asklessClient = new AsklessClient();
