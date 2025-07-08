import { RouteTrieNode } from "./trie";
import fs from "fs"
import path from "path"
import { fileIsController, joinSegments, transformPathIntoSegments } from "./utils";
import { Logger } from "./logger";
import { Controller } from "./interfaces";
import { pathToFileURL } from "url";
import { Method } from "./consts";
import { TMethod } from "./types";

export class RouteLoader {
	private routes: RouteTrieNode;
	private logger: Logger

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
	 * Reads all routes in src/routes/ using recursivity and registers
	 * them.
	 *
	 * @returns empty
	 */

	private async readRoutes(startingPath = 'src/routes') {

		try {
			const routesRootFolder = path.resolve("src/routes");
			let rootFolder = startingPath;
			this.logger.info(`Reading routes of path ${rootFolder}`)

			// if path is absolute it means we are in a nested directory
			// (nested route)

			if (!path.isAbsolute(startingPath)) {
				rootFolder = path.join(startingPath);
			}


			const currentFolderFiles = await this.getRoutesInsideDirectory(rootFolder)

			// base case
			if (currentFolderFiles.length <= 0) {
				return;
			}


			for (const folder of currentFolderFiles) {
				// only if it's a directory we explore it (if its a route, not
				// a normal file like a controller)
				const pathOfThisFolder = path.resolve(rootFolder, folder);

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
					}

				}
				const relative = path.relative(routesRootFolder, pathOfThisFolder);

				const segments = transformPathIntoSegments(relative);

				this.registerRoute(segments, hasControllers);
				await this.readRoutes(pathOfThisFolder);

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

	private async getRoutesInsideDirectory(folderPath: string) {
		let files = fs.readdirSync(folderPath).map((file) => {
			const currFilePath = path.join(folderPath, path.sep, file)
			const currFileStats = fs.statSync(currFilePath)

			if (!currFileStats.isDirectory()) {
				return ''
			}

			return file
		})

		return files.filter((file) => file !== '')
	}

	// returns an array of controller names in the current route
	private async getControllerFilesForRoute(segments: string[]) {
		const absoluteRoutePath = path.resolve("src/routes", ...segments)

		let files = fs.readdirSync(absoluteRoutePath).map((file) => {
			const currFilePath = path.join(absoluteRoutePath, path.sep, file)
			const currFileStats = fs.statSync(currFilePath)

			if (currFileStats.isDirectory()) {
				return ''
			}

			return file
		})

		return files.filter((file) => file !== '')
	}

	private isValidHttpMethodFile(file: string) {

		// get only the file name, without the extension                                         
		const indexOfLastDot = file.lastIndexOf('.');

		const method = file
			.slice(0, indexOfLastDot)
			.toUpperCase() as (typeof Method)[number];

		// file name must be a method name                                                       
		if (!Method.includes(method)) {
			return false
		}

		return true

	}

	private parseHttpMethod(fileName: string) {

		// get only the file name, without the extension                                         
		const indexOfLastDot = fileName.lastIndexOf('.');

		const method = fileName
			.slice(0, indexOfLastDot)
			.toUpperCase() as (typeof Method)[number];

		return method
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

			const joinedSegments = joinSegments(segments)

			const absoluteRoutePath = path.resolve("src/routes", ...joinedSegments)

			this.logger.info(`Reading controllers of route ${absoluteRoutePath}`)

			// folder files                                                                            

			// we can have folders inside folders, so check if file is not a                           
			// folder                                                                                  
			let files = await this.getControllerFilesForRoute(joinedSegments)
			for (const file of files) {

				if (!this.isValidHttpMethodFile(file)) {
					this.logger.error("File is not a valid HTTP method")
					throw new Error("File is not a valid HTTP method")
				}

				const method = this.parseHttpMethod(file)

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
