export interface Route {
  path: string;
  middlewares?: (() => any)[];
  controllers?: Controller[];
}

export interface Controller {
  handler: () => any;
}
