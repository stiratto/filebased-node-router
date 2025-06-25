import http from 'http'
import { Router } from './router'
import { cors } from './lib/utils';
import resProto, { Response } from './lib/response';

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
  cors?: CorsOptions
}

type Options = http.ServerOptions & ExtraOptions
type ServerResponseAndPrototype = http.ServerResponse & Response

export class Server {
  private httpServer: http.Server<typeof http.IncomingMessage, typeof http.ServerResponse & Response>
  private router: Router;
  private options: Options;

  constructor(port: number, options?: Options) {
    this.options = options;
    this.init(port, options)
  }

  async init(port: number, options: Options = {}) {
    this.router = new Router()


    this.httpServer = http.createServer(options, (req, res) => {
      Object.setPrototypeOf(res, resProto)

      if (options) {
        this.decideOptions(res as ServerResponseAndPrototype, req)
      }

      console.log(`[${req.method}] ${req.url}`)

      cors(req, res)


      this.router.handleRequest(req, res as ServerResponseAndPrototype)
    })

    this.httpServer.listen(port)
  }

  decideOptions(res: ServerResponseAndPrototype, req: http.IncomingMessage) {
    const opts = this.options

    if (opts?.cors?.enabled)
      this.cors(res, req)

  }


  private cors(res: ServerResponseAndPrototype, req: http.IncomingMessage) {
    const opts = this.options
    // Access-Control-Allow-Origin
    if (opts.cors.origin) {
      res.setHeader("Access-Control-Allow-Origin", opts.cors.origin);
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }

    // Access-Control-Allow-Credentials
    if (opts.cors.credentials) {
      res.setHeader("Access-Control-Allow-Credentials", "true");
    }

    // Access-Control-Max-Age
    if (opts.cors.age) {
      res.setHeader("Access-Control-Max-Age", opts.cors.age.toString());
    }

    // Access-Control-Allow-Methods
    if (opts.cors.methods?.length) {
      const methods = opts.cors.methods.map(m => m.toUpperCase()).join(",");
      res.setHeader("Access-Control-Allow-Methods", methods);
    } else {
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,PUT,OPTIONS");
    }

    // Access-Control-Allow-Headers
    const requestedHeaders = req.headers["access-control-request-headers"];
    if (opts.cors.headers?.length) {
      res.setHeader("Access-Control-Allow-Headers", opts.cors.headers.join(","));
    } else if (requestedHeaders) {
      res.setHeader("Access-Control-Allow-Headers", requestedHeaders);
    }

    // Access-Control-Expose-Headers
    if (opts.cors.expose?.length) {
      res.setHeader("Access-Control-Expose-Headers", opts.cors.expose.join(","));
    }

  }

}
