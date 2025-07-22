import path, { normalize } from "path";
import { RouteTrieNode } from "./trie";
import fs from "fs/promises";
import { pathToFileURL } from "url";
import { Logger } from "./logger";
import { MiddlewareProps } from "./interfaces";
import { getRoutesInsideDirectory, transformPathIntoSegments } from "./utils";
import { Router } from "@/router";

// global middlewares on src/middlewares
// route middlewares on folder middlewares inside routes


export class MiddlewareLoader {
	private middlewares: Array<MiddlewareProps>;
	private logger: Logger;

	constructor(private router: Router) {
		this.logger = new Logger()
		this.middlewares = []
	}

	// read middlewares on route src/middlewares
	async readMiddlewares() {
		// lee middlewares globales
		await this.readGlobalMiddlewares()
		// locales
		await this.readLocalMiddlewares()
		console.log(this.middlewares)
		return this.middlewares;
	}


	// tenemos que encontrar el middleware y revisar si ese middleware
	// aplica para la request actual
	//
	async findCorrespondingMiddleware(url) {

		const normalized = path.normalize(url)
		const separatedPath = normalized.split(path.sep).filter(v => v !== '')
		console.log(separatedPath)
		const routeExists = this.router.routeExists(separatedPath)
		if (!routeExists) {
			this.logger.error("No middleware for that route")
			return
		}

		const { correspondingRoute: route } = routeExists
		console.log(route)

		let normalizedUrl = path.normalize(url)
		if (normalizedUrl.indexOf(path.sep) === 0 || normalizedUrl.indexOf(path.sep) === normalizedUrl.length - 1) {
			normalizedUrl = normalizedUrl.replace(path.sep, "")
		}
		const correspondingMiddleware = this.middlewares.find(middleware => middleware.appliesTo === normalizedUrl)

		if (!correspondingMiddleware) {
			this.logger.error("No middleware for that")
		}

	}

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

			return this.middlewares

		} catch (err) {
			throw new Error("Error reading local middlewares")
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
				appliesTo: "",
				name: middlewareFilename,
				isGlobal: false,
				isRouteLocal: false,
				handler: null
			}


			// middlewar is in middlewares src folder, is global
			if (middlewarePath.includes(`src${path.sep}middlewares`)) {
				middleware.isGlobal = true
				middleware.appliesTo = "/"
				// is local
			} else {
				middleware.isGlobal = false
				middleware.isRouteLocal = true
				// get the path of middleware based in folders
				const normalizedPath = path.normalize(middlewarePath)
				const separatedPath = normalizedPath.split(path.sep)
				console.log(separatedPath)
				const routesIndex = separatedPath.indexOf("routes")

				// gets the route, skips everything before the first segment
				// in which the middlewares folder is located
				//																				  keep this
				//										< skips all of this | >>>>>>>>> | >	skips
				// C:\\blabla\\blabla\\blala\\123\\b\routes\getId\[id]\middlewares\m1.ts
				const subRouteParts = separatedPath.slice(routesIndex + 1, separatedPath.indexOf("middlewares"))

				const routePath = path.join(...subRouteParts)
				middleware.appliesTo = routePath
			}

			const { props, main } = await import(pathToFileURL(middlewarePath).href)

			middleware.handler = main;

			if (props) {
				// register middleware before another
				if (props?.registerBefore?.length > 1) {

					const m = this.middlewares.find(m => m.name === props.registerBefore)
					if (!m) {
						throw new Error(`Couldn't register middleware ${middleware.name} before ${props.registerBefore} because it doesn't exists.`)
					}

					const index = this.middlewares.indexOf(m)

					this.middlewares.splice(index, 0, middleware)
					// register first
				} else if (props.registerBefore === "*") {
					this.middlewares.unshift(middleware)
					// else, at the end
				} else {
					this.middlewares.push(middleware)
				}
			} else {
				this.middlewares.push(middleware)
			}

		} catch (err: any) {
			throw err
		}
	}


}
