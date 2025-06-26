import { IncomingMessage } from "http";

let req = Object.create(IncomingMessage.prototype)

export interface Request {
  body: any;
}

export type RequestWithPrototype = IncomingMessage & Request


req.body = null


export default req
