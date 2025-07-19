import http from 'node:http';
import { Parser } from '@/lib/parser';
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
import { RouteTrieNode } from './lib/trie';
import { MiddlewareProps } from './lib/interfaces';


export class Server {
  private httpServer: http.Server<
    typeof http.IncomingMessage & Request,
    typeof http.ServerResponse & Response
  >;

  private router: Router;
  private logger: Logger;
  private middlewares;

  constructor(private port: number, private options: Options = {}) {
    this.logger = new Logger();
  }

  async start() {
    this.middlewares = []

    const routes = await this.loadRoutes()

    this.middlewares = await this.loadMiddlewares(routes)

    this.router = new Router(routes, this.middlewares);

    this.httpServer = this.createServer()

    this.httpServer.listen(this.port, () => {
      console.log(`Listening on port ${this.port}`)
    });
  }

  async loadRoutes() {
    const loader = await new RouteLoader().init()
    return loader.getRoutes()
  }

  async loadMiddlewares(routes: RouteTrieNode) {
    const loader = new MiddlewareLoader(routes)
    const middlewares = await loader.readGlobalMiddlewares()

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

        console.log(req.url)
        // execs middlewares before doing handleRequest()
        await this.runMiddlewares(this.middlewares, req, res)
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

  async runMiddlewares(middlewares: MiddlewareProps[], req: RequestWithPrototype, res: ResponseWithPrototype) {
    const finalHandler = () => this.router.handleRequest(req, res)
    // so when we do index++ in next(), we start with first one
    let index = -1;

    // function that will be run by middlewares to continue with
    // request
    const next = async () => {
      index++

      if (index < middlewares.length) {
        // exec middleware handler, middlewares will execute the next
        // func passed to them
        middlewares[index].handler?.(req, res, next)
      } else {
        // if every middleware was ran succesfully, execute the
        // finalHAndler which should be router.handleRequest() for the
        // request to get to the corresponding controllers
        await finalHandler()
      }
    }

    // on first execute, execute the first middleware
    next()

  }


  decideOptions(res: ResponseWithPrototype, req: RequestWithPrototype) {
    const opts = this.options;

    if (opts?.cors?.enabled) cors(this.options, res, req);
  }
}
