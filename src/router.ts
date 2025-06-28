import fs, { constants } from 'fs'
import path from 'path'
import { ResponseWithPrototype } from './lib/response'
import { Logger } from './lib/logger'
import { RequestWithPrototype } from './lib/request'
import { Method } from './lib/consts'
import { TMethod } from './lib/types'
import { Controller, Route } from './lib/interfaces'

export class Router {
  private routes: Map<string, Map<string, Controller>> = new Map()
  private logger: Logger

  constructor() {
    this.logger = new Logger()
    this.init()
  }

  async init() {
    try {
      await this.readRoutes()
    } catch (err: any) {
      throw new Error(err)
    }
  }

  // executes when a request gets to the http.createServer in Server
  // class
  async handleRequest(req: RequestWithPrototype, res: ResponseWithPrototype) {
    console.log(this.routes)

    // finds the correct route
    const correspondingRoute = this.routes.get(req.url)

    if (correspondingRoute) {
      // finds the controller inside that route that has the same
      // method that the request has
      const controller = correspondingRoute.get(req.method)

      if (!controller) throw new Error('Method not allowed')

      const { status, data } = controller.handler(req, res)

      if (status >= 200 && status < 300) {
        res.send(data, status)
      }

    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('Not Found')
    }
  }

  /** 
   * Reads all routes in routes/ folder.
   *
   * @returns empty
   */
  private async readRoutes() {
    try {

      // all routes must be here, in folders
      const folderRootPath = path.join(__dirname, 'routes')

      fs.access(folderRootPath, constants.F_OK | constants.R_OK, (err) => {
        if (err) throw new Error("Folder doesn't exists or is not readable")
      })

      // read folders 
      const routes = fs.readdirSync(folderRootPath)

      for (const route of routes) {
        // get the absolute path of the current folder               
        const absoluteRoutePath = path.join(folderRootPath, route)

        // get the stats of the current folder                       
        const stat = fs.statSync(absoluteRoutePath)

        // if folder is a directory, register the route and read the 
        // controllers of that route                                 
        if (stat.isDirectory()) {
          this.registerRoute(absoluteRoutePath, `/${route}`)
        }

      }

    } catch (err: any) {
      throw new Error(err)
    }
  }

  /**
   * Adds a route into this.routes (Map)
  *
  * @param {string} absoluteRoutePath: The absolute path in filesystem of the current route, e.g: '/home/user/path-to-server/src/routes/user/'
  * @param {string} routePath: The route to be registered, e.g: '/user'
  *
  * @returns empty
  *
  */

  private async registerRoute(absoluteRoutePath: string, routePath: string) {
    try {

      this.logger.log(`Registering route: ${routePath}`)

      // if route doesn't exists yet
      if (!this.routes.has(routePath)) {
        this.routes.set(routePath, new Map<string, Controller>())
      }

      const methodMap = this.routes.get(routePath)

      const controllers = await this.readControllers(absoluteRoutePath)

      for (const [method, handler] of controllers.entries()) {

        if (methodMap.has(method)) {
          this.logger.error(`Route ${routePath} already has method ${method} registered`)
        }

        methodMap.set(method, handler)
      }

    } catch (err: any) {
      throw new Error(err)
    }
  }


  private async readControllers(absoluteRoutePath: string) {
    try {
      // read the directory of the current folder

      const folder = path.basename(absoluteRoutePath)

      const files = fs.readdirSync(absoluteRoutePath)

      let controllers = new Map<string, Controller>()

      for (const file of files) {

        // get only the file name, without the extension                                                          
        const indexOfLastDot = file.lastIndexOf('.')
        const method = file
          .slice(0, indexOfLastDot)
          .toUpperCase() as (typeof Method)[number]

        // file name must be a method name                                                                        
        if (!Method.includes(method)) {
          this.logger.log(`File ${file} is not a valid controller, check the filename maybe?`)
          throw new Error()
        }

        const route: Route = {
          path: `/${folder}`,
        }

        const { controller } = await this.registerController(method as unknown as TMethod, route)
        controllers.set(method, controller)
      }

      return controllers

    } catch (err: any) {
      throw new Error(err)
    }
  }

  private async registerController(method: TMethod, route: Route) {
    try {
      this.logger.log(
        `Registering controller: ${method} in route ${route.path}`
      )

      // get the controller path
      const file = path.join(
        __dirname,
        `routes/${route.path}`,
        method.toString().toLowerCase() + '.ts'
      )

      // get the controller functions
      const fileModules = await import(file)

      const functions: {
        [funcName: string]: Function
      } = fileModules.default

      for (const [functionName, func] of Object.entries(functions)) {
        if (func.length > 2) {
          throw new Error(
            'Controller function handler must wait only 2 params: Request and Response.'
          )
        }

        const newController = {
          handler: func,
        }

        return { method, controller: newController }
      }
    } catch (err: any) {
      throw new Error(err)
    }
  }

  async readMiddlewares(req: RequestWithPrototype, res: ResponseWithPrototype) {
    try {
      const middlewaresFolder = path.join(__dirname, 'middlewares')

      fs.access(middlewaresFolder, constants.F_OK, (err) => {
        if (err) throw new Error("Folder doesn't exists")
      })

      fs.access(middlewaresFolder, constants.R_OK, (err) => {
        if (err) throw new Error("Folder isn't readable")
      })

      const dir = fs.readdirSync(middlewaresFolder)

      dir.map((file) => {
        this.logger.info(file)
        this.registerMiddleware(file, req, res)
      })
    } catch (err) {
      throw new Error(err)
    }
  }

  private async registerMiddleware(filename, req, res): Promise<any> {
    const filePath = path.join(__dirname, `middlewares/${filename}`)
    console.log(filePath)

    const middleware = await import(filePath)
    return new Promise((resolve) => {
      const { modReq, modRes } = middleware.main(req, res)
      resolve({ modReq, modRes })
    })

  }
}

