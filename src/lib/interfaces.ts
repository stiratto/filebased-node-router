import { RequestWithPrototype } from "./request";
import { ResponseWithPrototype } from "./response";

export interface Route {
  path: string;
  middlewares?: (() => any)[];
  controllers?: Controller[];
}

export interface Controller {
  handler: (req?: RequestWithPrototype, res?: ResponseWithPrototype) => any;
}
