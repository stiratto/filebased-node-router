import path from 'path';
import { MiddlewareProps } from './lib/interfaces';
import { Logger } from './lib/logger';
import type { RequestWithPrototype } from './lib/request';
import type { ResponseWithPrototype } from './lib/response';
import { RouteTrieNode } from './lib/trie';
import { checkForDynamicOrCatchAll } from './lib/utils';

export class Router {
	private routes: RouteTrieNode;
	private logger: Logger;

	constructor(routes: RouteTrieNode) {
		this.logger = new Logger();
		this.routes = routes

		this.logger.info("Routes loaded succesfully.")

	}

	async logRoutes() {
		console.log(JSON.stringify(this.serializeTrieNode(this.routes), (_, value) => {
			if (typeof value === 'function') return '[Function]';

			return value;
		}, 2));
	}


	// executes when a request gets to the http.createServer in Server
	// class
	async handleRequest(req: RequestWithPrototype, res: ResponseWithPrototype) {
		const segments = req.url?.split('/').filter((v) => v != '')!;

		// finds the correct route
		const route = this.routeExists(segments);

		if (route) {
			const { correspondingRoute, data: reqData } = route

			const controller = correspondingRoute.controllers.get(req.method as string)

			if (!controller) {
				return res.send("No controller associated.", 405)
			}

			const middlewares = this.collectMiddlewares(req)

			await this.runMiddlewares(middlewares!, req, res)


			if (reqData) req.params = reqData

			const { status, data } = controller.handler(req, res)

			this.logger.log(`[${status}] ${req.url}`)
			res.send(data, status)
		} else {
			this.logger.error(`[404] ${req.url}`)
			// res.writeHead(404, { 'Content-Type': 'text/plain' });
			res.send('Not Found', 404);
		}
	}

	async runMiddlewares(middlewares: MiddlewareProps[], req: RequestWithPrototype, res: ResponseWithPrototype) {
		// so when we do index++ in next(), we start with first one
		let index = -1;

		// function that will be run by middlewares to continue with
		// request
		const next = async () => {
			index++

			if (!middlewares) return
			if (index < middlewares.length) {

				// exec middleware handler, middlewares will execute the next
				// func passed to them
				middlewares[index].handler?.(req, res, next)
			} else {
				// if every middleware was ran succesfully, execute the
				// finalHAndler which should be router.handleRequest() for the
				// request to get to the corresponding controllers
				return
			}
		}

		// on first execute, execute the first middleware
		next()

	}


	/** 
	 * This function is run when a request reaches the server, before it
	 * reaches the controller. This basically collect all middlewares
	 * in order, if a parent route has bubble: true, the middleware will
	 * be added to the middleswares array that will be executed. No
	 * ordering has to be done because it starts from the root node
	 * going to the corresponding req.url route node, all middlewares
	 * are already built and ordered by the middleware loader.
	 *
	 *	@param req Req object, used for exploring the Trie (req.url
	 *	segments).
	 *
	 * */
	collectMiddlewares(req: RequestWithPrototype) {
		try {
			const middlewares: MiddlewareProps[] = []
			let curr = this.routes

			const segments = path.normalize(req.url!).split(path.sep).filter(v => v !== "")

			segments.forEach((segment, index) => {
				const isLast = index === segments.length - 1

				if (curr.children.has(segment)) {
					curr = curr.children.get(segment)!
				} else {
					let fallback = checkForDynamicOrCatchAll(curr)
					if (!fallback) return
					curr = fallback
				}

				try {
					for (const middleware of curr?.middlewares) {

						// if we're at the current req.url route, just push the
						// middlewares without checking for bubble
						if (isLast) {
							middlewares.push(middleware)
							continue
						}

						// if no middleware.bubble, dont register it to children
						if (!middleware.bubble) {
							continue
						}


						// else, if middleawre.bubble, register it
						middlewares.push(middleware)
					}

				} catch (err) {
					throw new Error(`Couldn't loop middlewares of node ${curr.segment} in segment ${segment}`)
				}
			})

			return middlewares

		} catch (err) {
			throw err
		}
	}



	routeExists(segments: string[]) {
		try {
			let curr = this.routes;
			let data = {}

			if (segments.length === 0) {
				return {
					correspondingRoute: this.routes,
					data: {}
				}
			}


			// getId/123/asdasd -> 404

			// loop en los segments de req.url
			for (const [index, segment] of segments.entries()) {

				// si segment existe en las nested routes del nodo actual
				if (curr.children.has(segment)) {
					curr = curr.children.get(segment)!
					continue
				}

				// si no hay ruta estatica, buscar dinamica o catchall si no
				// hay dinamica
				const fallback = checkForDynamicOrCatchAll(curr)
				if (!fallback) return

				if (fallback.isDynamic) {
					data[fallback.segment.replace(":", "")] = segment
					curr = fallback
				}

				if (fallback.isCatchAll) {
					// we dont need to use spread operator because data isn't
					// being used anywhere else
					data[fallback.segment.replace("...", "")] = segments.slice(index)
					curr = fallback
					break
				}
			}


			return {
				correspondingRoute: curr,
				data: { ...data }
			}

		} catch (err) {
			throw err
		}

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
			hasControllers: node.hasControllers,
			isCatchAll: node.isCatchAll,
			middlewares: node.middlewares,
			nestedRoutes: json,
		};
	}

}
