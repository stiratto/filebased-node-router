import { RouteTrieNode } from "#/trie";
import fs from "fs/promises"
import path from "path"
import { fileIsController, getControllerFilesForRoute, getRoutesInsideDirectory, joinSegments, transformPathIntoSegments } from "#/utils";
import Logger from "#/logger";
import { Controller } from "#/interfaces";
import { pathToFileURL } from "url";
import { Method } from "#/consts";
import { TMethod } from "#/types";
import { WebSocketsInstance } from "#/websockets";
import { isValidHttpMethodFile, parseHttpMethod } from "./utils";

// All this logic takes care of loading the routes and controllers
// into the routes Trie. This does not loads middlewares.



export default class RouteLoader {
	private routes: RouteTrieNode;
	private logger: Logger
	private WebSocketsInstance: WebSocketsInstance

	constructor() {
		this.routes = new RouteTrieNode()
		this.logger = new Logger()
	}

	async init() {
		try {
			await this.readRoutes()
			return this
		} catch (err) {
			throw err
		}
	}

	getRoutes() {
		return this.routes
	}

	/**
	 * Reads all routes in src/routes/ using recursivity, registers a
	 * route using registerRoute()
	 *
	 * @returns empty
	 */

	private async readRoutes(startingPath = 'src/routes') {
		try {
			const routesRootFolder = path.resolve("src/routes");
			let rootFolder = startingPath;
			// this.logger.info(`Reading routes of path ${rootFolder}`)

			// if path is absolute it means we are in a nested directory
			// (nested route)

			if (!path.isAbsolute(startingPath)) {
				rootFolder = path.join(startingPath);
			}


			let currentFolderFiles;
			try {
				currentFolderFiles = await getRoutesInsideDirectory(rootFolder)
			} catch (err) {
				throw new Error(err)
			}

			// base case
			if (currentFolderFiles.length <= 0) {
				return;
			}


			for (const folder of currentFolderFiles) {
				if (folder === "middlewares") continue
				// only if it's a directory we explore it (if its a route, not
				// a normal file like a controller)
				const pathOfThisFolder = path.resolve(rootFolder, folder);

				let controllers: string[] = [];
				controllers = await fs.readdir(pathOfThisFolder);
				// if route doesn't has controllers, mark that route in the
				// TrieNode as hasControllers = false
				const routeProps = {
					hasControllers: false,
					hasWebSocket: false
				}

				const relative = path.relative(routesRootFolder, pathOfThisFolder);
				const segments = transformPathIntoSegments(relative);
				// check if route has controllers
				for (const controller of controllers) {
					const controllerPath = path.resolve(pathOfThisFolder, controller);

					const isController = await fileIsController(controllerPath);

					if (isController) {
						routeProps.hasControllers = true;
						break
					}

				}


				this.registerRoute(segments, routeProps);
				await this.readRoutes(pathOfThisFolder);

			}
		} catch (err: any) {
			throw err;
		}
	}

	// To register a websocket into a route node, we have to find the
	// node where the websocket will be inserted (into node.webSockets)
	private async registerWebSocket(websocket: any, node: RouteTrieNode) {
		this.logger.info('Registering websocket.')
		node.webSockets.push(websocket)
	}

	/**
	 * Adds a route into this.routes (Map)
	 *
	 * #param {string[]} segments: Segments, an array like: ['user', 'id'] which would be /user/id
	 * #param {boolean} routeHasControllers
	 *
	 * #returns empty
	 *
	 */

	private async registerRoute(segments: string[], routeProps: { hasControllers: boolean, hasWebSocket: boolean }) {
		// this.logger.info(`Registering route with segments ${segments}`)

		const { hasControllers, hasWebSocket } = routeProps

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

				if (segment.includes('...')) {
					curr.isCatchAll = true
				}
				curr.depth = segments.length;

				curr.segment = segment;

				// if the current segment index is equal to the last index of
				// segments, this is so we assign hasControllers to the last
				// route, if we have /getId/[slug], only mark [slug] with
				// hasControllers and not /getId/
				if (index === segments.length - 1) {
					curr.hasControllers = hasControllers;
				}
			});

			this.readControllers(segments, curr)
		} catch (err: any) {
			this.logger.error(err);
			throw err;
		}
	}

	/** 
	 *  Reads the controllers of a given route by joining the segments
	 *  array
	 *
	 * #param {string[]} segments - An array of segments (['user', ':id', 'profile']) which is converted then to "/src/routes/[id]/profile"
	 * #param {RouteTrieNode} node - Node in which the controllers will
	 * be registered
	 * 
	 * */

	private async readControllers(segments: string[], node: RouteTrieNode) {
		// read the directory of the current folder

		try {

			const joinedSegments = joinSegments(segments)

			const absoluteRoutePath = path.resolve("src/routes", ...joinedSegments)

			// this.logger.info(`Reading controllers of route ${absoluteRoutePath}`)

			// folder files                                                                            

			// we can have folders inside folders, so check if file is not a                           
			// folder                                                                                  
			let files = await getControllerFilesForRoute(joinedSegments)

			for (const file of files) {

				// checks if the file is not a valid http method controller
				// (get.ts, post.ts, put.ts)
				if (!isValidHttpMethodFile(file)) {
					this.logger.error("File is not a valid HTTP method")
					if (file.includes("ws")) {
						this.registerWebSocket(file, node)
						return
					}
					continue
				}

				const method = parseHttpMethod(file)

				await this.registerController(
					method as typeof Method[number],
					node,
					absoluteRoutePath
				);

			}
		} catch (err) {
			throw err
		}
	}


	/** 
	 * Registers a single controller on a given node route with the given
	 * method, gets the method using the routePath
	 *
	 * #param {TMethod} method - Controller method (get | post | etc)
	 * #param {RouteTrieNode} node - Node route in which the controller will be registered 
	 * #param {string} routePath - Path of the route, used for getting the file whole path.
	 *
	 *
	 * 
	 * */

	private async registerController(method: TMethod, node: RouteTrieNode, routePath: string) {
		try {
			// get the controller path
			const file = path.join(
				`${routePath}`,
				method.toString().toLowerCase() + '.ts'
			);


			// get the controller functions
			const validPath = pathToFileURL(file)
			const fileModules = await import(validPath.href);

			const functions: {
				[funcName: string]: Function;
			} = fileModules.default;

			if (!functions) {
				this.logger.error(`Can't extract main function from ${file}`)
				return
			}

			for (const [functionName, func] of Object.entries(functions)) {
				if (func.length > 2) {
					throw new Error(
						'Controller function handler must wait only 2 params: Request and Response.'
					);
				}

				const newController: Controller = {
					handler: func as () => any
				}

				node.controllers.set(method, newController)
			}
		} catch (err: any) {
			throw err
		}
	}


}
