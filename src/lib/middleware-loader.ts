import path, { normalize } from "path";
import fs from "fs/promises";
import { pathToFileURL } from "url";
import { Logger } from "./logger";
import { MiddlewareModule, MiddlewareProps } from "./interfaces";
import { getRoutesInsideDirectory, transformPathIntoSegments } from "./utils";
import { Router } from "@/router";
import { ValidationMiddlewareOptions } from "./consts";
import { MiddlewareOptions } from "./types";

// global middlewares on src/middlewares
// route middlewares on folder middlewares inside routes


export class MiddlewareLoader {
	private logger: Logger;

	constructor(private router: Router) {
		this.logger = new Logger()
	}

	// read middlewares on route src/middlewares
	async readMiddlewares() {
		// lee middlewares globales
		await this.readGlobalMiddlewares()
		// locales
		await this.readLocalMiddlewares()
		this.router.logRoutes()

	}



	/** 
	 * Reads global middlewares (src/middlewares/)
	 *
	 * */
	async readGlobalMiddlewares() {
		const rootPath = path.join("src", "middlewares")

		if (!rootPath) {
			throw new Error("No")
		}

		const files = await fs.readdir(rootPath)

		for (const file of files) {
			await this.readMiddleware(path.join(rootPath, file))
		}

	}

	/**
	 * Reads local middlewares using recursion
	 *
	 * */
	async readLocalMiddlewares(p = "src/routes") {
		try {
			// get the current recursion path
			const currentPath = path.resolve(p)
			this.logger.info(`Exploring local middlewares in path ${currentPath}`)

			const routes = await getRoutesInsideDirectory(currentPath)

			if (routes.length === 0) {
				return
			}

			for (const route of routes) {
				// gets the current file in the current folder path
				const routePath = path.join(currentPath, route)

				// register middlewares inside that folder               
				if (route === "middlewares") {
					this.logger.log(`Found middlewares/ folder in path ${routePath}`)
					const middlewares = await fs.readdir(routePath);
					for (const middleware of middlewares) {

						await this.readMiddleware(path.join(routePath, middleware))

					}
				}

				if (route !== "middlewares") {
					await this.readLocalMiddlewares(routePath)
				}
			}


		} catch (err) {
			throw err
		}
	}

	/** 
	 * Reads middleware file content
	 *
	 * */
	async readMiddleware(middlewarePath: string) {
		try {
			this.logger.log(`Registering middleware ${middlewarePath}`)

			// gets only the name, without the extension
			const middlewareFilename = path.basename(middlewarePath).split('.')[0]

			// middleware that will be passed to
			// registerMiddlewareOnExistingRoute()
			const middleware: MiddlewareProps = {
				bubble: false,
				appliesTo: "",
				name: middlewareFilename,
				handler: null
			}


			// middlewar is in middlewares src folder, is global
			if (middlewarePath.includes(`src${path.sep}middlewares`)) {
				middleware.appliesTo = ""
				// is local
			} else {
				// get the path of middleware based in folders
				const normalizedPath = path.normalize(middlewarePath)
				const separatedPath = normalizedPath.split(path.sep)
				const routesIndex = separatedPath.indexOf("routes")

				// gets the route, skips everything before the first segment
				// in which the middlewares folder is located
				//																				  keep this
				//										< skips all of this | >>>>>>>>> | >	skips
				// C:\\blabla\\blabla\\blala\\123\\b\routes\getId\[id]\middlewares\m1.ts
				const subRouteParts = separatedPath.slice(routesIndex + 1, separatedPath.indexOf("middlewares"))

				const routePath = path.join(...subRouteParts)


				middleware.appliesTo = transformPathIntoSegments(routePath).join(path.sep)
			}


			// Every middleware should export a main() function and
			// optionally a props, but props shouldn't have a random option.
			//
			// Let's validate:
			// - middleware exports a main() function with the signature:
			// (req, res, next) => void
			// - middleware exports optionally a props variable with the
			// signature MiddlewareOptions

			const mod = await import(pathToFileURL(middlewarePath).href) as MiddlewareModule;

			let { props, main } = mod

			if (typeof main !== 'function') {
				throw new Error("A middleware must export a main() function")
			}

			middleware.handler = main;
			if (!props) props = {} as any

			props = ValidationMiddlewareOptions.parse(props)


			this.registerMiddlewareOnRoute(middleware, props)
		} catch (err: any) {
			throw err
		}
	}



	/** 
	 * Registers a middleware in the routes Trie
	 *
	 * @param middleware Middleware to be registered
	 * @param props Parsed middleware props
	 * */
	async registerMiddlewareOnRoute(middleware: MiddlewareProps, props: MiddlewareOptions) {
		try {
			this.logger.error(`Registering middleware ${middleware.name}`)
			const segments = transformPathIntoSegments(middleware.appliesTo)
			const result = this.router.routeExists(segments)
			if (!result) {
				throw new Error("No route exists for that middleware")
			}

			const { route, data } = result

			if (!props) {
				route.middlewares.push(middleware)
				return
			}

			// handles bubble prop
			if (props.bubble)
				middleware.bubble = props.bubble

			// handles register before prop
			if (props?.registerBefore?.length > 1) {

				const m = route.middlewares.find(m => m.name === props.registerBefore)

				if (!m) {
					throw new Error(`Couldn't register middleware ${middleware.name} before ${props.registerBefore} because it doesn't exists.`)
				}

				const index = route.middlewares.indexOf(m)

				// register this middleware before the registerBefore middleware                                                               
				route.middlewares.splice(index, 0, middleware)

			} else if (props?.registerBefore?.length > 1 && props.registerBefore === "*") {
				route.middlewares.unshift(middleware)
			} else {
				route.middlewares.push(middleware);
			}

		} catch (err) {
			throw err
		}
	}

}
