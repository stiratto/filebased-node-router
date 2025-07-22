import { warn } from 'console';
import { Logger } from './lib/logger';
import type { RequestWithPrototype } from './lib/request';
import type { ResponseWithPrototype } from './lib/response';
import { RouteTrieNode } from './lib/trie';

export class Router {
	private routes: RouteTrieNode;
	private logger: Logger;

	constructor(routes: RouteTrieNode) {
		this.logger = new Logger();
		this.routes = new RouteTrieNode();
		this.routes = routes


		this.logger.info("Routes loaded succesfully.")
		console.log(JSON.stringify(this.serializeTrieNode(this.routes), null, 2));

	}


	// executes when a request gets to the http.createServer in Server
	// class
	async handleRequest(req: RequestWithPrototype, res: ResponseWithPrototype) {
		const segments = req.url?.split('/').filter((v) => v != '')!;

		// finds the correct route
		const route = this.routeExists(segments);


		if (route) {
			let index = 0;

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

	routeExists(segments: string[]) {
		try {
			let curr = this.routes;
			let data = {}
			let matched = false

			// loop en los segments de req.url
			for (const [index, segment] of segments.entries()) {

				// si segment existe en las nested routes del nodo actual
				if (curr.children.has(segment)) {

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
			nestedRoutes: json,
		};
	}

}
