import { Controller } from "./interfaces";

export class RouteTrieNode {
	children: Map<string, RouteTrieNode>;
	endOfPath: boolean;
	isDynamic: boolean;
	segment: string;
	hasControllers: boolean;
	controllers: Map<string, Controller>;

	constructor() {
		this.children = new Map();
		this.endOfPath = false;
		this.isDynamic = false;
		this.segment = '';
		this.hasControllers = false;
		this.controllers = new Map();
	}

}
