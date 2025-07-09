import { Controller } from "./interfaces";

export class RouteTrieNode {
	children: Map<string, RouteTrieNode>;
	isDynamic: boolean;
	segment: string;
	hasControllers: boolean;
	controllers: Map<string, Controller>;
	isCatchAll: boolean;

	constructor() {
		this.children = new Map();
		this.isDynamic = false;
		this.segment = '';
		this.hasControllers = false;
		this.controllers = new Map();
		this.isCatchAll = false;
	}

}
