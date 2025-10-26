import { IncomingMessage } from 'node:http';

// this preserves the original prototype chain of IncomingMessage, so
// when we do Object.setPrototypeOf(reqComingFromNode, req), we
// preserve the prototype chain of reqComingFromNode which is
// IncomingMessage -> Readable -> Stream, etc
const Request = Object.create(IncomingMessage.prototype);

export interface TRequest {
  // Just for typescript to be happy in files that we access
  // `req.body`
  body: any;
  params: any
  query: any
  test: () => any
}

// prototype: Request -> IncomingMessage -> Readable -> Stream, so we
// don't touch IncommingMessage
const req = Object.create(Request)

export type RequestWithPrototype = IncomingMessage & TRequest;
export default req;
