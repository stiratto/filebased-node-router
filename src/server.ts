import http from 'node:http';
import reqProto, {
  type Request,
  type RequestWithPrototype,
} from '@/lib/request';
import resProto, {
  type Response,
  type ResponseWithPrototype,
} from '@/lib/response';
import { Router } from '@/router';
import { Logger } from './lib/logger';
import { cors } from './lib/options';
import { RouteLoader } from './lib/route-loader';
import { MiddlewareLoader } from './lib/middleware-loader';
import { Options } from './lib/types';


export class Server {
  private httpServer: http.Server<
    typeof http.IncomingMessage & Request,
    typeof http.ServerResponse & Response
  >;

  private router: Router;
  private logger: Logger;
  constructor(private port: number, private options: Options = {}) {
    this.logger = new Logger();
  }

  async start() {

    const routes = await this.loadRoutes()
    this.router = new Router(routes);

    await this.loadMiddlewares()

    this.httpServer = this.createServer()

    this.httpServer.listen(this.port, () => {
      console.log(`Listening on port ${this.port}`)
    });
  }

  async loadRoutes() {
    const loader = await new RouteLoader().init()
    return loader.getRoutes()
  }

  async loadMiddlewares() {
    const loader = new MiddlewareLoader(this.router)
    const middlewares = await loader.readMiddlewares()

    return middlewares
  }

  createServer() {
    return http.createServer(
      this.options,
      async (req: RequestWithPrototype, res: ResponseWithPrototype) => {
        this.logger.info(`[${req.method}] ${req.url}`);
        // inject extra methods and properties
        this.injectMethodsAndProperties(req, res);

        req.params = null
        req.query = null

        if (this.options) {
          this.decideOptions(res as ResponseWithPrototype, req);
        }

        // execs middlewares before doing handleRequest()

        await this.router.handleRequest(req, res)
        // await this.runMiddlewares(this.middlewares, req, res)
      }
    );

  }

  injectMethodsAndProperties(
    req: RequestWithPrototype,
    res: ResponseWithPrototype
  ) {
    Object.setPrototypeOf(req, reqProto);
    Object.setPrototypeOf(res, resProto);
  }


  decideOptions(res: ResponseWithPrototype, req: RequestWithPrototype) {
    const opts = this.options;

    if (opts?.cors?.enabled) cors(this.options, res, req);
  }
}
