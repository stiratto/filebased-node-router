import { ServerResponse } from 'node:http';

const Response = Object.create(ServerResponse.prototype);


export interface Response {
  send: (message: any, code: number) => any;
}

Response.send = function(message: any, code = 200) {
  this.setHeader('Content-Type', 'application/json');
  this.statusCode = code;
  this.end(JSON.stringify(message));
};

const res = Object.create(Response)

export type ResponseWithPrototype = ServerResponse & Response;
export default res;
