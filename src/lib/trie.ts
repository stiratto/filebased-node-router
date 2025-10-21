import { Controller, MiddlewareProps } from "./interfaces";

export class RouteTrieNode {
	children: Map<string, RouteTrieNode>;
	isDynamic: boolean;
	segment: string;
	hasControllers: boolean;
	controllers: Map<string, Controller>;
	depth: number;
	isCatchAll: boolean;
	middlewares: MiddlewareProps[]
	webSockets: any[]


	constructor() {
		this.children = new Map();
		this.depth = 0;
		this.isDynamic = false;
		this.segment = '';
		this.hasControllers = false;
		this.controllers = new Map();
		this.isCatchAll = false;
		this.middlewares = []
		this.webSockets = []
	}

}
