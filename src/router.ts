import fs, { constants } from 'fs';
import path from 'path';
import { Method } from './lib/consts';
import type { Controller, Route } from './lib/interfaces';
import { Logger } from './lib/logger';
import type { RequestWithPrototype } from './lib/request';
import type { ResponseWithPrototype } from './lib/response';
import type { TMethod } from './lib/types';
import { fileIsController, transformPathIntoSegments } from './lib/utils';
import { pathToFileURL } from 'url';


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
			//
			this.markNodeEndOfPath()
			this.logger.info("Routes loaded succesfully.")

		} catch (err: any) {
			this.logger.error("Couldn't load routes.")
			throw err
		}

		console.log(JSON.stringify(this.serializeTrieNode(this.routes), null, 2));

	}

	// executes when a request gets to the http.createServer in Server
	// class
	async handleRequest(req: RequestWithPrototype, res: ResponseWithPrototype) {
		const segments = req.url?.split('/');

		// finds the correct route
		const correspondingRoute = this.routeExists(
			// for some reason there is an empty segment
			segments!.filter((v) => v != '')
		);

		if (correspondingRoute) {
			this.logger.info(`Route ${correspondingRoute.segment} exists`)
			const controller = correspondingRoute.controllers.get(req.method as string)
			if (!controller) {
				return res.send("No controller associated.", 405)
			}

			const { status, data } = controller.handler()
			res.send(JSON.stringify(data), status)

		} else {
			res.writeHead(404, { 'Content-Type': 'text/plain' });
			res.end('Not Found');
		}
	}

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
				for (const [_, child] of curr.children) {
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
	serializeTrieNode(node: RouteTrieNode = this.routes): any {
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

	/**
	 * Reads all routes in src/routes/ using recursivity.
	 *
	 * @returns empty
	 */

	private async readRoutes(startingPath = 'routes') {

		try {
			const routesRootFolder = path.join(__dirname, 'routes');

			let rootFolder = startingPath;
			this.logger.info(`Reading routes of path ${rootFolder}`)

			// if path is absolute it means we are in a nested directory
			// (nested route)
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

				// only if it's a directory we explore it (if its a route, not
				// a normal file like a controller)
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
					console.log("\n")
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

	private async registerRoute(segments: string[], routeHasControllers: boolean = false) {
		this.logger.info(`Registering route with segments ${segments}`)

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

			this.readControllers(segments, curr)
		} catch (err: any) {
			this.logger.error(err);
			throw err;
		}
	}

	private markNodeEndOfPath(node = this.routes) {

		for (const [segment, childNode] of node.children) {
			if (childNode.children.size === 0) {
				childNode.endOfPath = true
			}
			this.markNodeEndOfPath(node.children.get(segment))
		}
	}

	/** 
	 *  Reads the controllers of a given route by joining the segments
	 *  array
	 *
	 * @param {string[]} segments - An array of segments (['user', ':id', 'profile']) which is converted then to "/src/routes/[id]/profile"
	 * @param {RouteTrieNode} node - Node in which the controllers will
	 * be registered
	 * 
	 * */
	private async readControllers(segments: string[], node: RouteTrieNode) {
		// read the directory of the current folder

		try {
			console.log(segments)

			const joinedSegments = segments.map((segment) => {
				if (segment.includes(":")) {
					this.logger.info(`${segment} is dynamic, contains a :`)
					let newSegment = segment.replace(":", "[")
					let st = newSegment.split('')
					st.push(']')
					return st.join("")
				}
				return segment
			})
			const absoluteRoutePath = path.resolve(__dirname, "routes", ...joinedSegments)

			this.logger.info(`Reading controllers of route ${absoluteRoutePath}`)



			// folder files                                                                            
			const files = fs.readdirSync(absoluteRoutePath);

			// we can have folders inside folders, so check if file is not a                           
			// folder                                                                                  
			for (const file of files) {
				const filePath = path.join(absoluteRoutePath + "/" + file);
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
	 * @param {TMethod} method - Controller method (get | post | etc)
	 * @param {RouteTrieNode} node - Node route in which the controller will be registered 
	 * @param {string} routePath - Path of the route, used for getting the file whole path.
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
