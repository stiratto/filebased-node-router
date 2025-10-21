export interface MiddlewareOptions {
	registerBefore: string,
	// if child routes will inherit the same middleware
	bubble: boolean;
}
