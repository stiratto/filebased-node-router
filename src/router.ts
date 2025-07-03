import fs, { constants } from 'fs';
import path from 'path';
import util from 'util';
import { Method } from './lib/consts';
import type { Controller, Route } from './lib/interfaces';
import { Logger } from './lib/logger';
import type { RequestWithPrototype } from './lib/request';
import type { ResponseWithPrototype } from './lib/response';
import type { TMethod } from './lib/types';
import { fileIsController, transformPathIntoSegments } from './lib/utils';


class RouteTrieNode {
  children: Map<string, RouteTrieNode>;
  endOfPath: boolean;
  isDynamic: boolean;
  segment: string;
  hasControllers: boolean;
  controllers: Map<string, Controller>;

  constructor() {
    this.children = new Map();
    this.endOfPath = false;
    this.isDynamic = false;
    this.segment = '';
    this.hasControllers = false;
    this.controllers = new Map();
  }
}

export class Router {
  private routes: RouteTrieNode;
  private logger: Logger;

  constructor() {
    this.logger = new Logger();
    this.routes = new RouteTrieNode();
    this.init();
  }

  async init() {
    try {
      await this.readRoutes();
      // when all routes are created, mark the final node of each path as endOfPath = true 
      this.markNodeEndOfPath()
      console.log(JSON.stringify(this.serializeTrieNode(this.routes), null, 2));

    } catch (err: any) {
      throw err;
    }
  }

  // executes when a request gets to the http.createServer in Server
  // class
  async handleRequest(req: RequestWithPrototype, res: ResponseWithPrototype) {
    const segments = req.url.split('/');

    // finds the correct route

    const correspondingRoute = this.routeExists(
      segments.filter((v) => v != '')
    );


    if (correspondingRoute) {
      this.logger.info(`Route ${correspondingRoute.segment} exists`)

      const controller = 'asd';

      if (!controller) throw new Error('Method not allowed');
      //
      // const { status, data } = controller.handler(req, res)
      //
      // if (status >= 200 && status < 300) {
      //   res.send(data, status)
      // }
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  }

  // TODO
  routeExists(segments: string[]): RouteTrieNode | null {
    let curr = this.routes;

    // loop en los segments de req.url
    for (const segment of segments) {

      // si segment existe en las nested routes del nodo actual
      if (curr.children.has(segment)) {

        // setea curr a ese hijo
        curr = curr.children.get(segment)!

        // si no existe esa nested route en el nodo actual, hay que
        // verificar si hay una ruta dinamica (rutas :id o :slug o asi)
      } else if (!curr.children.has(segment)) {

        // loopeamos en los hijos del nodo actual y verificamos si hay
        // una ruta dinamica
        for (const [acc, child] of curr.children) {
          this.logger.info(`${child.segment}, ${child.isDynamic}`)
          if (child.isDynamic) {
            curr = child
            break
          } else {
            return null
          }
        }

      } else {
        return null
      }
    }


    return curr
  }

  // return a readable json of the Trie
  serializeTrieNode(node: RouteTrieNode): any {
    const json = {};
    for (const [segment, childNode] of node.children.entries()) {
      json[segment] = this.serializeTrieNode(childNode);
    }

    return {
      segment: node.segment,
      isDynamic: node.isDynamic,
      endOfPath: node.endOfPath,
      hasControllers: node.hasControllers,
      nestedRoutes: json,
    };
  }

  private logRoutes(node: any, currentPath: string[] = []) {
    for (const [segment, childNode] of node.children.entries()) {
      const newPath = [...currentPath, segment];
      this.logRoutes(childNode, newPath);
    }
  }

  /**
   * Reads all routes in src/routes/ using recursivity.
   *
   * @returns empty
   */

  private async readRoutes(startingPath = 'routes') {

    try {
      const routesRootFolder = path.join(__dirname, 'routes');
      // if path is absolute it means we are in a nested directory
      // (nested route)
      let rootFolder = startingPath;

      if (!path.isAbsolute(startingPath)) {
        rootFolder = path.join(__dirname, startingPath);
      }

      const currentFolderFiles = fs.readdirSync(rootFolder);

      // base case
      if (currentFolderFiles.length <= 0) {
        return;
      }

      for (const file of currentFolderFiles) {
        const currentFilePath = path.join(rootFolder, file);
        const currentFileIsDirectory = fs
          .statSync(currentFilePath)
          .isDirectory();

        if (currentFileIsDirectory) {
          const pathOfThisFolder = path.resolve(rootFolder, file);

          const controllers = fs.readdirSync(pathOfThisFolder);
          // if route doesn't has controllers, mark that route in the
          // TrieNode as hasControllers = false
          let hasControllers = false;

          // check if route has controllers
          for (const controller of controllers) {
            const controllerPath = path.resolve(pathOfThisFolder, controller);
            const isController = fileIsController(controllerPath);

            if (isController) {
              hasControllers = true;
              break;
            }
          }

          const relative = path.relative(routesRootFolder, pathOfThisFolder);

          const segments = transformPathIntoSegments(relative);

          this.registerRoute(segments, hasControllers);
          this.readRoutes(pathOfThisFolder);
        }
      }
    } catch (err: any) {
      throw err;
    }
  }

  /**
   * Adds a route into this.routes (Map)
   *
   * @param {string[]} segments: Segments, an array like: ['user', 'id'] which would be /user/id
   * @param {boolean} routeHasControllers
   *
   * @returns empty
   *
   */

  private async registerRoute(segments: string[], routeHasControllers = false) {
    // this is for the loop
    if (!segments)
      throw new Error('registerRoute() expects an array of segment(s)');

    let curr = this.routes;

    try {
      segments.forEach((segment, index) => {
        if (!curr.children.has(segment)) {
          // segment does not exists, create that segment
          curr.children.set(segment, new RouteTrieNode());
        }

        curr = curr.children.get(segment)!

        // we have to set immediately the curr node to the one that we
        // just created, if we don't do this, we would be working with
        // an empty node (the root node) initially, then we would
        // be working with the previous node, not the current actual
        // node

        if (segment.includes(':')) {
          curr.isDynamic = true;
        }

        curr.segment = segment;

        // if the current segment index is equal to the last index of
        // segments, this is so we assign hasControllers to the last
        // route, if we have /getId/[slug], only mark [slug] with
        // hasControllers and not /getId/


        if (index === segments.length - 1) {
          curr.hasControllers = routeHasControllers;
        }
      });
    } catch (err: any) {
      this.logger.error(err);
      throw err;
    }
  }

  private markNodeEndOfPath(node = this.routes) {

    for (const [segment, childNode] of node.children) {
      if (childNode.children.size === 0) {
        this.logger.info(`${segment} is the final node of a path`)
        childNode.endOfPath = true
      }
      this.markNodeEndOfPath(node.children.get(segment))
    }
  }

  private async readControllers(absoluteRoutePath: string) {
    // read the directory of the current folder

    // current folder name
    const folder = path.basename(absoluteRoutePath);
    this.logger.info(`Reading controllers of route /${folder}`);
    // current folder files
    const files = fs.readdirSync(absoluteRoutePath);
    const controllers = new Map<string, Controller>();

    // we can have folders inside folders, so check if file is not a
    // folder
    for (const file of files) {
      const filePath = path.join(absoluteRoutePath + '/' + file);
      const fileStat = fs.statSync(filePath);

      if (fileStat.isDirectory()) {
        continue;
      }

      // get only the file name, without the extension
      const indexOfLastDot = file.lastIndexOf('.');
      const method = file
        .slice(0, indexOfLastDot)
        .toUpperCase() as (typeof Method)[number];

      // file name must be a method name
      if (!Method.includes(method)) {
        this.logger.error(
          `File ${file} is not a valid controller, check the filename maybe?`
        );
        throw new Error();
      }

      const route: Route = {
        path: `/${folder}`,
      };

      const { controller } = await this.registerController(
        method as unknown as TMethod,
        route
      );
      controllers.set(method, controller);
    }

    return controllers;
  }

  private async registerController(method: TMethod, route: Route) {
    try {
      this.logger.log(
        `Registering controller: ${method} in route ${route.path}`
      );

      // get the controller path
      const file = path.join(
        __dirname,
        `routes/${route.path}`,
        method.toString().toLowerCase() + '.ts'
      );

      // get the controller functions
      const fileModules = await import(file);

      const functions: {
        [funcName: string]: Function;
      } = fileModules.default;

      for (const [functionName, func] of Object.entries(functions)) {
        if (func.length > 2) {
          throw new Error(
            'Controller function handler must wait only 2 params: Request and Response.'
          );
        }

        const newController = {
          handler: func,
        };

        return { method, controller: newController };
      }
    } catch (err: any) {
      throw new Error(err);
    }
  }

  async readMiddlewares(req: RequestWithPrototype, res: ResponseWithPrototype) {
    try {
      const middlewaresFolder = path.join(__dirname, 'middlewares');

      fs.access(middlewaresFolder, constants.F_OK, (err) => {
        if (err) throw new Error("Folder doesn't exists");
      });

      fs.access(middlewaresFolder, constants.R_OK, (err) => {
        if (err) throw new Error("Folder isn't readable");
      });

      const dir = fs.readdirSync(middlewaresFolder);

      dir.map((file) => {
        this.logger.info(file);
        this.registerMiddleware(file, req, res);
      });
    } catch (err) {
      throw new Error(err);
    }
  }

  private async registerMiddleware(filename, req, res): Promise<any> {
    const filePath = path.join(__dirname, `middlewares/${filename}`);
    console.log(filePath);

    const middleware = await import(filePath);
    return new Promise((resolve) => {
      const { modReq, modRes } = middleware.main(req, res);
      resolve({ modReq, modRes });
    });
  }
}
