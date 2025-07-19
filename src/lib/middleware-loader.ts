import path from "path";
import { RouteTrieNode } from "./trie";
import fs from "fs/promises";
import { pathToFileURL } from "url";
import { Logger } from "./logger";
import { RequestWithPrototype } from "./request";
import { ResponseWithPrototype } from "./response";
import { MiddlewareProps } from "./interfaces";
import { warn } from "console";

// global middlewares on src/middlewares
// route middlewares on folder middlewares inside routes


type FinalHandler = (req: RequestWithPrototype, res: ResponseWithPrototype) => any

export class MiddlewareLoader {
	private middlewares: Array<MiddlewareProps>;
	private logger: Logger;

	constructor(private routes: RouteTrieNode) {
		this.logger = new Logger()
		this.middlewares = []
	}

	// read middlewares on route src/middlewares
	async readGlobalMiddlewares() {
		const rootPath = path.join("src", "middlewares")

		if (!rootPath) {
			throw new Error("No")
		}

		const files = await fs.readdir(rootPath)

		for (const file of files) {
			await this.readMiddleware(path.join(rootPath, file))
		}

		return this.middlewares;
	}

	// run all middlewares when a request arrives

	// registers a middleware
	async readMiddleware(middlewarePath: string) {
		try {


			const middlewareFilename = path.basename(middlewarePath).split('.')[0]

			const middleware: MiddlewareProps = {
				name: middlewareFilename,
				isGlobal: false,
				isRouteLocal: false,
				handler: null
			}

			// middlewar is in middlewares src folder, is global
			if (middlewarePath.includes(`src${path.sep}middlewares`)) {
				middleware.isGlobal = true
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

			}

		} catch (err: any) {
			throw err
		}
	}


}
