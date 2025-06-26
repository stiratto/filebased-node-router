import http from 'http'
import { Router } from '@/router'
import { Parser } from '@/lib/parser'
import resProto, { Response, ResponseWithPrototype } from '@/lib/response'
import reqProto, { Request, RequestWithPrototype } from '@/lib/request'
import { cors } from './lib/options'
import { Logger } from './lib/logger'
import { mimeTypes } from './lib/consts'

interface CorsOptions {
  enabled: boolean
  origin?: string
  credentials?: boolean
  age?: number
  methods?: string[]
  headers?: string[]
  expose?: string[]
}


interface ExtraOptions {
  cors?: CorsOptions
  parsers?: (keyof typeof mimeTypes)[]
}
type Options = http.ServerOptions & ExtraOptions

export class Server {
  private httpServer: http.Server<
    typeof http.IncomingMessage & Request,
    typeof http.ServerResponse & Response
  >
  private router: Router
  private options: Options
  private logger: Logger

  constructor(port: number, options?: Options) {
    this.logger = new Logger()
    this.options = options
    this.init(port, options)
  }

  async init(port: number, options: Options = {}) {
    this.router = new Router()
    this.httpServer = http.createServer(
      options,
      async (req: RequestWithPrototype, res: ResponseWithPrototype) => {
        this.logger.info(`[${req.method}] ${req.url}`)

        // inject extra methods and properties
        this.injectMethodsAndProperties(req, res)

        // parse the body if it's post method
        if (req.method === 'POST') {
          req.body = null
          const parser = new Parser(req, res, this.options.parsers)
          await parser.init(req, res)
        }

        if (options) {
          this.decideOptions(res as ResponseWithPrototype, req)
        }

        this.router.handleRequest(req, res as ResponseWithPrototype)
      }
    )

    this.httpServer.listen(port)
  }

  injectMethodsAndProperties(
    req: RequestWithPrototype,
    res: ResponseWithPrototype
  ) {
    Object.setPrototypeOf(req, reqProto)
    Object.setPrototypeOf(res, resProto)
  }

  decideOptions(res: ResponseWithPrototype, req: RequestWithPrototype) {
    const opts = this.options

    if (opts?.cors?.enabled) cors(this.options, res, req)
  }
}
