import { Logger } from './lib/logger';
import type { RequestWithPrototype } from './lib/request';
import type { ResponseWithPrototype } from './lib/response';
import { RouteTrieNode } from './lib/trie';
import { RouteLoader } from './lib/route-loader';

export class Router {
	private routes: RouteTrieNode;
	private logger: Logger;

	constructor() {
		this.logger = new Logger();
		this.routes = new RouteTrieNode();
		this.init();
	}

	async init() {
		try {
			const routeLoader = await new RouteLoader().init()
			this.routes = routeLoader.getRoutes()

			this.markNodeEndOfPath()

			this.logger.info("Routes loaded succesfully.")
			console.log(JSON.stringify(this.serializeTrieNode(this.routes), null, 2));
		} catch (err: any) {
			this.logger.error("Couldn't load routes.")
			throw err
		}
	}

	// executes when a request gets to the http.createServer in Server
	// class
	async handleRequest(req: RequestWithPrototype, res: ResponseWithPrototype) {
		const segments = req.url?.split('/');

		// finds the correct route
		const route = this.routeExists(
			// for some reason there is an empty segment
			segments!.filter((v) => v != '')
		)!;


		if (route) {
			const { correspondingRoute, data: reqData } = route

			const controller = correspondingRoute.controllers.get(req.method as string)
			if (!controller) {
				return res.send("No controller associated.", 405)
			}

			if (reqData) req.params = reqData

			const { status, data } = controller.handler(req, res)
			res.send(data, status)

		} else {
			res.writeHead(404, { 'Content-Type': 'text/plain' });
			res.end('Not Found');
		}
	}

	routeExists(segments: string[]) {
		let curr = this.routes;
		let data = {}

		// loop en los segments de req.url
		for (const segment of segments) {

			// si segment existe en las nested routes del nodo actual
			if (curr.children.has(segment)) {


				console.log("exists", segment)
				// setea curr a ese hijo
				curr = curr.children.get(segment)!

				// si no existe esa nested route en el nodo actual, hay que
				// verificar si hay una ruta dinamica (rutas :id o :slug o asi)
			} else if (!curr.children.has(segment)) {

				console.log("no exists", segment)
				let foundDynamic = false
				// loopeamos en los hijos del nodo actual y verificamos si hay
				// una ruta dinamica
				for (const [c, child] of curr.children) {
					this.logger.info(`${c} ${child.segment}, ${child.isDynamic}`)
					if (child.isDynamic) {
						data[child.segment.replace(":", "")] = segment
						curr = child
						foundDynamic = true
					}
				}

				if (!foundDynamic) return null

			} else {
				return null
			}
		}


		return {
			correspondingRoute: curr,
			data
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
			endOfPath: node.endOfPath,
			hasControllers: node.hasControllers,
			nestedRoutes: json,
		};
	}


	private markNodeEndOfPath(node = this.routes) {

		for (const [segment, childNode] of node.children) {
			if (childNode.children.size === 0) {
				childNode.endOfPath = true
			}
			this.markNodeEndOfPath(node.children.get(segment))
		}
	}



}
