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
				return res.send("No controller associated", 405)
			}

			const middlewares = this.Middlewares.collectMiddlewares(req, this.routes)

			await this.Middlewares.runMiddlewares(middlewares!, req, res)

			if (resolvedData) req.params = resolvedData

			const { status, data } = controller.handler(req, res) ?? { status: 200, data: {} }

			this.logger.log(`[${status}] ${req.url}`)
			res.send(data, status)
		} else {
			this.logger.error(`[404] ${req.url}`)
			res.send('Not Found', 404);
		}
	}

	routeExists(segments: string[]): { route: RouteTrieNode, data: any } | null {
		// normalize the segments array by removing empty items
		segments = segments.filter((i) => i.length > 0)

		const dfs = (node: RouteTrieNode, index: number) => {
			// base case, if current dfs() call index param is =
			// segments.length, it means we explored all nodes, 
			if (index === segments.length) {
				return { node, data: null }
			}

			// use index instead of creating a whole new array,
			// segments[index]
			const curr = segments[index]

			// history/user/123

			// checks for static, fast because direct check on hashmap keys (they are segments)
			if (node.children.has(curr)) {
				// dfs on that children if found, cut segments (index + 1, we
				// start from the next segment)
				const result = dfs(node.children.get(curr)!, index + 1)

				// what gets the job done, this basically is what "propagates"
				// the result, if we explored all nodes (we reached the base
				// case), that will cause a return, which cancels the current
				// dfs(), returning the result, continues after the dfs() call
				// in that recursive iteration, reaches the if (result) return
				// result, and this logic will be executed on every reverse
				// iteration
				if (result) return result

			} else {
				// static route doesn't exists, search for dynamic or catchall
				// loops first dynamic nodes

				// searches dynamic first
				for (const [_, childNode] of node.children) {

					if (childNode.isDynamic) {
						// same static logic of propagation in static routes applies both here and in the catchall part
						const result = dfs(childNode, index + 1)
						if (result) {
							const data = segments.slice(index, index + segments.length)
							const node = result.node
							return { node, data }
						}
					}
				}

				// searches catchall if no dynamic was found
				for (const [_, childNode] of node.children) { // 
					if (childNode.isCatchAll) {
						// this allows combined catchall and dynamic/static
						// routes, /history/user/123/456/789/333/44/details
						// start frm index + 1 (from the second segment, we dont
						// need to explore the current index)
						for (let i = index + 1; i <= segments.length; i++) {
							// childNode would always be 123, lets say we have url 
							// history/user/123/456/789/details
							// we currently are in 123, curr index is 2, childNode
							// 123 = (123 node).
							// we enter on this loop, we do dfs(123node, )
							const result = dfs(childNode, i)
							if (result) {
								return {
									node: result.node,
									data: segments.slice(index)
								}
							}
						}
					}
				} // 

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
			webSocket: node.webSocket,
			webSocketHandlers: node.socketEventHandlers,
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
