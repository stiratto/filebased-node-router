import { test, describe, expect, vi } from "vitest";
import { Router } from "@/router";
import { RouteTrieNode } from "@/lib/trie";
import { createDummyController, createFakeRoute } from "@/lib/utils";
import req, { RequestWithPrototype } from "@/lib/request";
import { IncomingMessage, ServerResponse } from "http";
import res, { ResponseWithPrototype } from "@/lib/response";

describe('Router', () => {
	test('should call controller', async () => {
		// create a fake route and a fake controller
		const rootRoute = new RouteTrieNode()
		const fakeRoute = createFakeRoute('static')

		const handler = vi.fn(() => {
			return { status: 200, data: { message: 'ok' } }
		})

		fakeRoute.controllers.set('GET', { handler })
		fakeRoute.hasControllers = true

		rootRoute.children.set('static', fakeRoute)
		const router = new Router(rootRoute)

		const fakeReq: RequestWithPrototype = Object.create(req)
		const fakeRes: ResponseWithPrototype = {
			setHeader: vi.fn(),
			send: vi.fn()
		} as any

		fakeReq.url = '/static'
		fakeReq.method = 'GET'

		await router.logRoutes()

		await router.handleRequest(fakeReq, fakeRes)

		expect(handler).toHaveBeenCalled()
	})

})
