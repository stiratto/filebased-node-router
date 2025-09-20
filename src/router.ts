import { MiddlewareProps } from './lib/interfaces';
import { Logger } from './lib/logger';
import type { RequestWithPrototype } from './lib/request';
import type { ResponseWithPrototype } from './lib/response';
import { RouteTrieNode } from './lib/trie';

export class Router {
	private routes: RouteTrieNode;
	private logger: Logger;

	constructor(routes: RouteTrieNode) {
		this.logger = new Logger();
		this.routes = routes

		this.logger.info("Routes loaded succesfully.")
		// this.logRoutes()
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

			const middlewares = this.collectMiddlewares(req)

			await this.runMiddlewares(middlewares!, req, res)

			if (resolvedData) req.params = resolvedData

			const { status, data } = controller.handler(req, res)

			this.logger.log(`[${status}] ${req.url}`)
			res.send(data, status)
		} else {
			this.logger.error(`[404] ${req.url}`)
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
	collectMiddlewares(req: RequestWithPrototype): Array<any> {
		// empieza desde el nodo root, baja nivel por nivel hasta el nodo
		// del ultimo segmento req.url
		let curr = this.routes
		// bajar de nivel
		// tenemos que manejar los siguientes casos:
		//
		// - rutas estaticas
		// - dinamicas
		// - catchall

		// el problema viene con las rutas catchall, ejemplo, si se hace
		// request a getId/12/12/12/12/12, y loopeamos en los segments de
		// la req.url, al bajar de nivel, vamos a tomar en cuenta todos
		// los 12/12/12/12/, cuando slo deberiamos tomar en ucenta un solo
		// nodo, el nodo catchall

		// SOLO BAJA UNNNNNN NIVEL POR CADA ITERACION


		let middlewaresToReturn: MiddlewareProps[] = []
		const segments = req.url!.split('/').filter(val => val !== '')

		const dfs = (node: RouteTrieNode, index: number, middlewares: MiddlewareProps[]) => {
			this.logger.log(`[MIDDLEWARE READING] dfs() on ${node.segment} node`)

			if (index === segments.length) {
				// const tempMiddlewares = [...middlewares]
				// node.middlewares.forEach((node) => tempMiddlewares.push(node))
				middlewaresToReturn = middlewares
				console.log(`returning on ${node.segment}`)
				return node
			}

			// en cada iteracion recursiva, pushear los middlewares del nodo
			// que coincide a middlewares

			const curr = segments[index]
			if (node.children.has(curr)) {
				this.logger.log(`${curr} exists`)
				// coincide, push middlewares
				const tempMiddlewares: MiddlewareProps[] = [...middlewares]
				for (const middleware of node.children.get(curr)!.middlewares) {
					if (middleware.bubble) {
						tempMiddlewares.push(middleware)
						continue
					}
				}

				const result = dfs(node.children.get(curr)!, index + 1, tempMiddlewares)

				if (result) return result
			} else {
				for (const child of node.children.values()) {
					if (child.isDynamic && !child.isCatchAll) {
						const tempMiddlewares: MiddlewareProps[] = [...middlewares]
						for (const middleware of child.middlewares) {

							if (middleware.bubble) {
								tempMiddlewares.push(middleware)
								continue
							}
						}
						const result = dfs(child, index + 1, tempMiddlewares)
						if (result) return result
					}
				}

				for (const child of node.children.values()) {
					if (!child.isDynamic && child.isCatchAll) {
						const tempMiddlewares: MiddlewareProps[] = [...middlewares]
						for (const middleware of child.middlewares) {
							if (middleware.bubble) {
								tempMiddlewares.push(middleware)
								continue
							}
						}
						for (let i = index; i <= segments.length; i++) {
							const result = dfs(child, i, tempMiddlewares)
							if (result) return result
						}

					}
				}


			}

		}

		dfs(curr, 0, [])

		return middlewaresToReturn
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
			segment: node.segment,
			isDynamic: node.isDynamic,
			hasControllers: node.hasControllers,
			isCatchAll: node.isCatchAll,
			depth: node.depth,
			middlewares: node.middlewares,
			nestedRoutes: json,
			controllers: node.controllers
		};
	}

}
