import Logger from "#/logger";
import { MiddlewareProps } from "#/interfaces";
import { RouteTrieNode } from "../trie";
import { RequestWithPrototype } from "../request";
import { ResponseWithPrototype } from "../response";

export default class Middlewares {
	private logger: Logger;

	constructor() {
		this.logger = new Logger()
	}


	/**
	 *  Runs middlewares in order.
	 *
	 * @param middlewares Array containing the middlewares to run. This array
	 * must contain the middlewares already ordered.
	 *
	 *
	 * */
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
	 *	@param routes Root node from the Routes Trie
	 *
	 * */
	collectMiddlewares(req: RequestWithPrototype, routes: RouteTrieNode): Array<any> {
		// empieza desde el nodo root, baja nivel por nivel hasta el nodo
		// del ultimo segmento req.url
		let curr = routes
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
				// console.log(`returning on ${node.segment}`)
				return node
			}

			// en cada iteracion recursiva, pushear los middlewares del nodo
			// que coincide a middlewares

			const curr = segments[index]
			if (node.children.has(curr)) {
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

}
