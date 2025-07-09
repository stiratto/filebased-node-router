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
import type { mimeTypes } from './lib/consts';
import { Logger } from './lib/logger';
import { cors } from './lib/options';
import { RouteLoader } from './lib/route-loader';

interface CorsOptions {
  enabled: boolean;
  origin?: string;
  credentials?: boolean;
  age?: number;
  methods?: string[];
  headers?: string[];
  expose?: string[];
}

interface ExtraOptions {
  cors?: CorsOptions;
  parsers?: (keyof typeof mimeTypes)[];
}
type Options = http.ServerOptions & ExtraOptions;

export class Server {
  private httpServer: http.Server<
    typeof http.IncomingMessage & Request,
    typeof http.ServerResponse & Response
  >;
  private router: Router;
  private options: Options;
  private logger: Logger;

  constructor(port: number, options?: Options) {
    this.logger = new Logger();
    this.options = options!;
    this.init(port, options);
  }

  async init(port: number, options: Options = {}) {
    const routeLoader = await new RouteLoader().init()
    const routes = routeLoader.getRoutes()
    this.router = new Router(routes);

    this.createServer(options)

    this.httpServer.listen(port);
  }

  createServer(options: Options) {
    this.httpServer = http.createServer(
      options,
      async (req: RequestWithPrototype, res: ResponseWithPrototype) => {
        this.logger.info(`[${req.method}] ${req.url}`);

        // inject extra methods and properties
        this.injectMethodsAndProperties(req, res);

        // parse the body if it's post method
        if (req.method === 'POST') {
          req.body = null;
          const parser = new Parser(req, res, this.options.parsers as string[]);
          await parser.init(req, res);
        }

        req.params = null
        req.query = null

        if (options) {
          this.decideOptions(res as ResponseWithPrototype, req);
        }

        this.router.handleRequest(req, res as ResponseWithPrototype);
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
