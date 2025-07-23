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


	// tenemos que encontrar el middleware y revisar si ese middleware
	// aplica para la request actual
	//

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

	async readLocalMiddlewares(p = "src/routes") {
		try {
			// get the current recursion path
			const currentPath = path.resolve(p)
			this.logger.info(`Exploring local middlewares in path ${currentPath}`)

			const files = await getRoutesInsideDirectory(currentPath)

			if (files.length === 0) {
				return
			}

			for (const file of files) {
				// gets the current file in the current folder path
				const filePath = path.join(currentPath, file)
				// stats of that file
				const fileStats = await fs.stat(filePath)

				// register middlewares inside that folder               
				if (fileStats.isDirectory() && file === "middlewares") {
					this.logger.log(`Found middlewares/ folder in path ${filePath}`)
					const middlewares = await fs.readdir(filePath);
					for (const middleware of middlewares) {

						await this.readMiddleware(path.join(filePath, middleware))

					}
				}

				if (fileStats.isDirectory() && file !== "middlewares") {
					await this.readLocalMiddlewares(filePath)
				}
			}


		} catch (err) {
			throw err
		}
	}

	// run all middlewares when a request arrives

	// registers a middleware
	async readMiddleware(middlewarePath: string) {
		try {
			this.logger.log(`Registering middleware ${middlewarePath}`)

			// gets only the name, without the extension
			const middlewareFilename = path.basename(middlewarePath).split('.')[0]

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

			props = ValidationMiddlewareOptions.parse(props)
			console.log(props)


			this.registerMiddlewareOnExistingRoute(middleware, props)
		} catch (err: any) {
			throw err
		}
	}



	async registerMiddlewareOnExistingRoute(middleware: MiddlewareProps, props: MiddlewareOptions) {
		try {
			this.logger.error(`Registering middleware ${middleware.name}`)
			const segments = transformPathIntoSegments(middleware.appliesTo)
			console.log(segments)
			const route = this.router.routeExists(segments)

			if (!route?.correspondingRoute) {
				throw new Error("No route exists for that middleware")
			}

			if (!props) {
				route.correspondingRoute.middlewares.push(middleware)
				return
			}

			// handles bubble prop
			if (props.bubble)
				middleware.bubble = props.bubble

			// handles register before prop
			if (props?.registerBefore?.length > 1) {

				const m = route.correspondingRoute.middlewares.find(m => m.name === props.registerBefore)

				if (!m) {
					throw new Error(`Couldn't register middleware ${middleware.name} before ${props.registerBefore} because it doesn't exists.`)
				}

				const index = route.correspondingRoute.middlewares.indexOf(m)

				// register this middleware before the registerBefore middleware                                                               
				route.correspondingRoute.middlewares.splice(index, 0, middleware)

			} else if (props?.registerBefore?.length > 1 && props.registerBefore === "*") {
				route.correspondingRoute.middlewares.unshift(middleware)
			} else {
				route.correspondingRoute.middlewares.push(middleware);
			}

		} catch (err) {
			throw err
		}
	}

}
