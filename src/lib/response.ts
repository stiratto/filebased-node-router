import { ServerResponse } from 'node:http';

const res = Object.create(ServerResponse.prototype);

export interface Response {
  send: (message: any, code: number) => any;
}
export type ResponseWithPrototype = ServerResponse & Response;

res.send = function (message: any, code = 200) {
  this.setHeader('Content-Type', 'application/json');
  this.statusCode = code;
  this.end(JSON.stringify(message));
};

export default res;
