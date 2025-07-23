import path from 'path';
import { MiddlewareProps } from './lib/interfaces';
import { Logger } from './lib/logger';
import type { RequestWithPrototype } from './lib/request';
import type { ResponseWithPrototype } from './lib/response';
import { RouteTrieNode } from './lib/trie';
import { transformPathIntoSegments } from './lib/utils';

export class Router {
	private routes: RouteTrieNode;
	private logger: Logger;

	constructor(routes: RouteTrieNode) {
		this.logger = new Logger();
		this.routes = new RouteTrieNode();
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
			const middlewares = this.collectMiddlewares(req)

			await this.runMiddlewares(middlewares!, req, res)

			const { correspondingRoute, data: reqData } = route

			const controller = correspondingRoute.controllers.get(req.method as string)

			if (!controller) {
				return res.send("No controller associated.", 405)
			}

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

	collectMiddlewares(req: RequestWithPrototype) {
		const middlewares: MiddlewareProps[] = []

		let curr = this.routes

		const segments = path.normalize(req.url!).split(path.sep).filter(v => v !== "")

		segments.forEach((segment, index) => {
			curr = curr.children.get(segment)!

			const isLast = index === segments.length - 1
			for (const middleware of curr.middlewares) {

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
		})


		return middlewares
	}



	routeExists(segments: string[]) {
		try {
			let curr = this.routes;
			let data = {}
			let matched = false

			if (segments.length === 0) {
				return {
					correspondingRoute: this.routes,
					data: {}
				}
			}

			// loop en los segments de req.url
			for (const [index, segment] of segments.entries()) {

				console.log(curr.segment === segment)
				// si segment existe en las nested routes del nodo actual

				if (curr.children.has(segment)) {
					console.log("Pene")

					// setea curr a ese hijo
					curr = curr.children.get(segment)!
					matched = true

					// si no hay ruta estatica, buscar dinamica o catchall si no
					// hay dinamica
				} else {
					let foundDynamic = false
					let foundCatchAll = false

					for (const [_, child] of curr.children) {
						if (child.isDynamic) {
							data[child.segment.replace(":", "")] = segment
							curr = child
							foundDynamic = true
							matched = true
							break
						} else if (!child.isDynamic && child.isCatchAll) {
							data[child.segment.replace("...", "")] = segments.slice(index)
							curr = child
							foundCatchAll = true
							matched = true
							break
						}
					}
				}

			}

			if (!matched)
				return null



			console.log('asd', curr)
			return {
				correspondingRoute: curr,
				data
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
