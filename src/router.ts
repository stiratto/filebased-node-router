import { MiddlewareProps } from './lib/interfaces';
import Logger from '#/logger/index';
import type { RequestWithPrototype } from './lib/request';
import type { ResponseWithPrototype } from './lib/response';
import { RouteTrieNode } from './lib/trie';
import Middlewares from '#/middlewares/index';
import { Duplex } from 'node:stream';


export class Router {
	private routes: RouteTrieNode;
	private logger: Logger;
	private Middlewares: Middlewares

	constructor(routes: RouteTrieNode) {

		this.logger = new Logger();
		this.routes = routes

		this.logger.info("Routes loaded succesfully.")
		this.Middlewares = new Middlewares()
	}


	async logRoutes() {


		console.log(JSON.stringify(this.serializeTrieNode(this.routes), (_, value) => {
			if (typeof value === 'function') return '[Function]';
			if (value instanceof Map) {
				// Convertir a objeto plano
				return Object.fromEntries(value);
			}

			return value;
		}, 2));

	}

	async handleWebSocket(req: RequestWithPrototype, socket: Duplex, head: Buffer) {
		const segments = req.url?.split('/').filter((v) => v != '')!;
		const resolved = this.routeExists(segments)

	}
	// executes when a request gets to the http.createServer in Server
	// class
	async handleRequest(req: RequestWithPrototype, res: ResponseWithPrototype) {
		const segments = req.url?.split('/').filter((v) => v != '')!;

		// finds the correct route
		const resolved = this.routeExists(segments);

		if (resolved) {
			const { route, data: resolvedData } = resolved
			const controller = route.controllers.get(req.method as string)

			if (!controller) {
				return res.send("No controller associated.", 405)
			}

			const middlewares = this.Middlewares.collectMiddlewares(req, this.routes)

			await this.Middlewares.runMiddlewares(middlewares!, req, res)

			if (resolvedData) req.params = resolvedData

			const { status, data } = controller.handler(req, res)

			this.logger.log(`[${status}] ${req.url}`)
			res.send(data, status)
		} else {
			this.logger.error(`[404] ${req.url}`)
			res.send('Not Found', 404);
		}
	}



	routeExists(segments: string[]): { route: RouteTrieNode, data: any } | null {

		const dfs = (node: RouteTrieNode, index: number) => {
			// base case 
			if (index === segments.length) {
				return { node, data: null }
			}

			// use index instead of creating a whole new array,
			// segments[index]
			const curr = segments[index]

			// checks for static, fast because direct check on hashmap keys (they are segments)
			if (node.children.has(curr)) {
				// dfs on that children if found, cut segments
				const result = dfs(node.children.get(curr)!, index + 1)

				// what gets the job done
				if (result) {
					const { node, data } = result
					return { node, data }
				}

			} else {
				// static route doesn't exists, search for dynamic or catchall
				// loops first dynamic nodes

				// searches dynamic first
				for (const [_, childNode] of node.children) {
					if (childNode.isDynamic && !childNode.isCatchAll) {
						const result = dfs(childNode, index + 1)
						if (result) {
							return { node: result.node, data: segments.slice(index, index) }
						}
					}
				}

				// searches catchall if no dynamic was found
				for (const [_, childNode] of node.children) {
					if (!childNode.isDynamic && childNode.isCatchAll) {
						// from the ...catchall node, loop starting from that
						// segment to the rest segments, this allows us to use
						// intermediate routes, getId/1/2/3/4/test/5/6/7/
						for (let i = index; i <= segments.length; i++) {
							const result = dfs(childNode, i)
							if (result) {
								return {
									node: result.node,
									data: segments.slice(index)
								}
							}
						}
					}
				}

				return null
			}
		}

		const result = dfs(this.routes, 0)


		if (!result) {
			return null
		}
		const { node: nodeFound, data } = result


		return {
			data: data,
			route: nodeFound,
		}


	}


	// return a readable json of the Trie
	serializeTrieNode(node: RouteTrieNode = this.routes): any {
		const json = {};

		for (const [segment, childNode] of node.children.entries()) {
			json[segment] = this.serializeTrieNode(childNode);
		}

		return {
			webSockets: node.webSockets,
			segment: node.segment,
			isDynamic: node.isDynamic,
			hasControllers: node.hasControllers,
			isCatchAll: node.isCatchAll,
			depth: node.depth,
			middlewares: node.middlewares,
			nestedRoutes: json,
			controllers: node.controllers,
		};
	}

}
