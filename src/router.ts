import { IncomingMessage, ServerResponse } from "http"
import fs, { constants } from "fs"
import path from "path"
import { Response } from "./lib/response";

// let's create a simple router from scratch that uses folder names as
// routes, like next.js does
//
// we want:
// - folder names as routes. (getId folder maps to /getId route)
// - files names inside folder maps to logic. (index.ts inside getId should contain the routes controllers)
// - we want to specify method post when registrating a new route,
//    this way we could add headers and customize responses depending on
//    the method
//
// 
// a single route can contain various methods, each folder route will
// have a file for each method (post.ts, get.ts, etc)
//
//
// done:
// - rest methods support
//
//
// todo:
//
// - middlewares support
// - dynamic routes support (folder named [id])
// - wildcard support for routes
// - websockets support
//
//
// - better responses, send()
//

export const Method = ["POST", "GET", "PUT", "DELETE", "PATCH", "WEBSOCKET"] as const;

type TMethod = typeof Method[number]

interface Route {
  path: string
}

interface Controller {
  method: TMethod
  route: Route
  handler: Function
}

export class Router {
  private routes: Route[];
  private controllers: Controller[]

  constructor() {
    this.routes = []
    this.controllers = []
    this.init()
  }

  async init() {
    try {
      await this.readRoutes()
      await this.readMiddlewares()
    } catch (err: any) {
      throw new Error(err)
    }
  }

  // executes when a request gets to the http.createServer in Server
  // class
  async handleRequest(req: IncomingMessage, res: ServerResponse & Response) {


    const correspondingRoute = this.routes.find((route) => route.path === req.url)

    if (correspondingRoute) {
      const correspondingHandler = this.controllers.find((controller) => controller.route.path === correspondingRoute.path)

      if (!correspondingHandler)
        throw new Error("No handler for that route")

      if (!(correspondingHandler.method === req.method))
        throw new Error("Methods aren't matching")

      const { status, data } = correspondingHandler.handler()

      if (status >= 200 && status < 300) {
        res.send(data, status)
      }

      return
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" })
      res.end("Not Found")
    }
  }

  private async readRoutes() {
    // this is the path that will be used for routes. all routes MUST
    // be here
    try {

      const routesFolder = path.join(__dirname, "routes")

      // check if exists                                              
      fs.access(routesFolder, constants.F_OK, (err) => {
        if (err)
          throw new Error("Folder doesn't exists")
      })
      // check if is readable                                         
      fs.access(routesFolder, constants.R_OK, (err) => {
        if (err)
          throw new Error("Folder is not readable")
      })


      const folders = fs.readdirSync(routesFolder)


      folders.map((folder) => {
        // get the absolute path of the current folder                
        const folderPath = path.join(routesFolder, folder)

        // get the stats of the folder                                
        const stat = fs.statSync(folderPath)

        if (stat.isDirectory) {
          // if the folder is a directory, register routes inside and 
          // read controllers too

          this.registerRoute(`/${folder}`)
          this.readControllers(folderPath, folder)
        }
      })

    } catch (err: any) {
      throw new Error(err)
    }
  }

  private async readControllers(folderPath: string, folder: string) {
    try {
      // read the directory of the current folder
      fs.readdirSync(folderPath).map((file) => {
        const indexOfLastDot = file.lastIndexOf(".")
        const method = file.slice(0, indexOfLastDot).toUpperCase() as typeof Method[number]

        // file name must be a method name
        if (!Method.includes(method)) {
          throw new Error(`File ${file} is not a valid controller, check the filename`)
        }

        const route: Route = {
          path: `/${folder}`
        }

        this.registerController(method as unknown as TMethod, route)
      })

    } catch (err: any) {
      throw new Error(err)
    }
  }

  private async registerRoute(path: string) {
    try {

      console.log("Registering route: ", path)
      const route = {
        path
      }
      this.routes.push(route)

    } catch (err: any) {

      throw new Error(err)
    }
  }

  private async registerController(method: TMethod, route: Route) {
    try {
      console.log(`Registering controller: ${method} in route ${route.path}`)
      const file = path.join(__dirname, `routes/${route.path}`, method.toString().toLowerCase() + ".ts")

      const fileModules = await import(file)

      const functions: {
        [funcName: string]: Function
      } = fileModules.default

      for (const [functionName, func] of Object.entries(functions)) {

        if (func.length > 2) {
          throw new Error("Controller function handler must wait only 2 params: Request and Response.")
        }

        const newController: Controller = {
          method,
          route,
          handler: func
        }
        this.controllers.push(newController)
      }



    } catch (err: any) {
      throw new Error(err)
    }
  }

  private async readMiddlewares() {
    try {
      const middlewaresFolder = path.join(__dirname, "middlewares")

      fs.access(middlewaresFolder, constants.F_OK, (err) => {
        if (err)
          throw new Error("Folder doesn't exists")

      })


      fs.access(middlewaresFolder, constants.R_OK, (err) => {
        if (err)
          throw new Error("Folder isn't readable")

      })

      const dir = fs.readdirSync(middlewaresFolder)

      dir.map((file) => {
        console.log(file)
      })

    } catch (err) {
      throw new Error(err)
    }
  }
}



