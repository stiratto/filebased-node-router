import http from 'node:http';
import reqProto, {
  type Request,
  type RequestWithPrototype,
} from '#/request/index';
import resProto, {
  type Response,
  type ResponseWithPrototype,
} from '#/response/index';
import { Router } from '@/router';
import Logger from '#/logger/index';
import { cors } from './lib/options';
import RouteLoader from '#/routes/index';
import MiddlewareLoader from '#/middlewares/loader';
import { Options } from './lib/types';
import { Duplex } from 'node:stream';


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
      }
    ).on('upgrade', this.onUpgrade.bind(this));
  }

  // Once a client sends an Upgrade HTTP Request that is a valid
  // WebSocket upgrade, we tell the client socket that the upgrade was
  // succesfull. Then, we have to run the handleConnection() method
  // from the websocket file handler that corresponds to the URL.
  // First, resolve the URL and THEN run the handleConnection()
  // method.
  async onUpgrade(req: RequestWithPrototype, socket: Duplex, head: Buffer) {
    if (req.headers.upgrade !== "websocket") {
      socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
      return;
    }


    let url = req.url?.split("/")!
    const resolvedSocketRoute = this.router.routeExists(url)
    if (!resolvedSocketRoute || (resolvedSocketRoute && !resolvedSocketRoute.route.webSocket)) {
      // handle
      console.log("No route for that socket.")
    }

    console.log('client sent an upgrade', resolvedSocketRoute?.route.segment)
    socket.write(
      "HTTP/1.1 101 Switching Protocols\r\n" +
      "Upgrade: websocket\r\n" +
      "Connection: Upgrade\r\n"
    );

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


  injectMethodsAndProperties(
    req: RequestWithPrototype,
    res: ResponseWithPrototype
  ) {
    Object.setPrototypeOf(req, reqProto);
    Object.setPrototypeOf(res, resProto);
  }

  stop() {
    return new Promise<void>((res, rej) => {
      this.httpServer.close((err) => {
        if (err) return rej(err)
        res()
      })
    })
  }

  decideOptions(res: ResponseWithPrototype, req: RequestWithPrototype) {
    const opts = this.options;

    if (opts?.cors?.enabled) cors(this.options, res, req);
  }

  public getHttpServer() {
    return this.httpServer
  }
}
