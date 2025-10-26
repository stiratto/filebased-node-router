import { mimeTypes } from "./consts";
import { RequestWithPrototype } from "./request";
import { ResponseWithPrototype } from "./response";
import { MiddlewareOptions } from "./types";

export interface Route {
  path: string;
  middlewares?: (() => any)[];
  controllers?: Controller[];
}

export interface Controller {
  handler: (req?: RequestWithPrototype, res?: ResponseWithPrototype) => { status: number, data: any };
}

export interface MiddlewareProps {
  name: string;
  appliesTo: string;
  bubble: boolean;
  handler: ((req, res, next) => void) | null;
}

export interface MiddlewareModule {
  props: MiddlewareOptions,
  main: MiddlewareProps['handler']
}

export interface CorsOptions {
  enabled: boolean;
  origin?: string;
  credentials?: boolean;
  age?: number;
  methods?: string[];
  headers?: string[];
  expose?: string[];
}

export interface ExtraOptions {
  cors?: CorsOptions;
  parsers?: (keyof typeof mimeTypes)[];
}

export interface WebSocket {
  // This method (defined by the user) runs when a client connects to
  // the socket.
  handleConnection: () => void;
}
