import { IncomingMessage } from 'node:http';

// This will only have methods that do not rely on shared-state. This
// won't have state either, things like body for example, it's a
// no-no. This is so we avoid wrong state in requests.

const req = Object.create(IncomingMessage.prototype);

export interface Request {
  // Just for typescript to be happy in files that we access
  // `req.body`
  body: any;
  params: any
  query: any
}

export type RequestWithPrototype = IncomingMessage & Request;
export default req;
