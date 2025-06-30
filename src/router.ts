import fs, { constants } from 'fs'
import path from 'path'
import { ResponseWithPrototype } from './lib/response'
import { Logger } from './lib/logger'
import { RequestWithPrototype } from './lib/request'
import { Method } from './lib/consts'
import { TMethod } from './lib/types'
import { Controller, Route } from './lib/interfaces'


class RouteTrieNode {

  children: Map<string, RouteTrieNode>
  endOfPath: boolean;
  isDynamic: boolean;
  segment: string;


  constructor() {
    this.children = new Map()
    this.endOfPath = false
    this.isDynamic = false
    this.segment = ""
  }
}

export class Router {
  private routes: RouteTrieNode
  private logger: Logger

  constructor() {
    this.logger = new Logger()
    this.routes = new RouteTrieNode()
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

    const segments = req.url.split("/")

    // finds the correct route
    //
    const correspondingRoute = this.routeExists(segments)

    if (correspondingRoute) {
      // finds the controller inside that route that has the same
      // method that the request has
      const controller = 'asd'

      if (!controller) throw new Error('Method not allowed')
      //
      // const { status, data } = controller.handler(req, res)
      //
      // if (status >= 200 && status < 300) {
      //   res.send(data, status)
      // }

    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('Not Found')
    }
  }

  // TODO
  routeExists(segments: string[]) {

  }


  private logRoutes(node: any, currentPath: string[] = []) {
    const currPath = currentPath.join("/")

    for (const [segment, childNode] of node.children.entries()) {
      this.logger.info(`${node.segment} ${node.isDynamic} ${node.endOfPath}`)
      const newPath = [...currentPath, segment];
      this.logRoutes(childNode, newPath)
    }
  }

  /** 
   * Reads all routes in src/routes/ using recursivity.
   *
   * @returns empty
   */

  private async readRoutes(startingPath: string = "routes") {
    try {

      let routesRootFolder = path.join(__dirname, "routes")
      // if path is absolute it means we are in a nested directory
      // (nested route)
      let rootFolder = startingPath

      if (!path.isAbsolute(startingPath)) {
        rootFolder = path.join(__dirname, startingPath)
      }

      const currentFolderFiles = fs.readdirSync(rootFolder)

      // base case
      if (currentFolderFiles.length <= 0) {
        return
      }

      for (const file of currentFolderFiles) {

        const isCurrentFileDirectory = fs.statSync(path.join(rootFolder, file)).isDirectory()

        if (isCurrentFileDirectory) {

          const pathOfThisFolder = path.resolve(rootFolder, file)

          const relative = path.relative(routesRootFolder, pathOfThisFolder)

          const segments = relative.split("/").map((segment) => {
            if (segment.includes("[") && segment.includes("]")) {
              return segment.replace("[", ":").replace("]", "")
            }
            return segment
          })

          this.registerRoute(segments)
          this.readRoutes(pathOfThisFolder)
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

  private async registerRoute(segments: string[]) {
    // this is for the loop
    let curr = this.routes

    try {
      segments.forEach((segment, index) => {


        if (!curr.children.has(segment)) {
          // segment does not exists, create that segment        
          curr.children.set(segment, new RouteTrieNode())

        }

        if (segment.includes(":")) {
          curr.isDynamic = true
        }
        curr.segment = segment
        // segment exists, nested route                        
        curr = curr.children.get(segment)

      })
      curr.endOfPath = true

    } catch (err: any) {
      this.logger.error(err)
      throw err
    }
  }


  private async readControllers(absoluteRoutePath: string) {
    // read the directory of the current folder

    // current folder name
    const folder = path.basename(absoluteRoutePath)
    this.logger.info(`Reading controllers of route /${folder}`)
    // current folder files
    const files = fs.readdirSync(absoluteRoutePath)
    let controllers = new Map<string, Controller>()

    // we can have folders inside folders, so check if file is not a
    // folder
    for (const file of files) {

      const filePath = path.join(absoluteRoutePath + "/" + file)
      const fileStat = fs.statSync(filePath)

      if (fileStat.isDirectory()) {
        continue
      }


      // get only the file name, without the extension
      const indexOfLastDot = file.lastIndexOf('.')
      const method = file
        .slice(0, indexOfLastDot)
        .toUpperCase() as (typeof Method)[number]

      // file name must be a method name                                                                       
      if (!Method.includes(method)) {
        this.logger.error(`File ${file} is not a valid controller, check the filename maybe?`)
        throw new Error()
      }

      const route: Route = {
        path: `/${folder}`,
      }

      const { controller } = await this.registerController(method as unknown as TMethod, route)
      controllers.set(method, controller)
    }

    return controllers


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

