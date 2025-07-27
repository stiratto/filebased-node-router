import { test, describe, expect } from "vitest";
import request from "supertest"
import { server } from "./setup";

describe('Router', () => {
	test('should return a 404', async () => {
		const res = await request(server.getHttpServer()).get("/non-existing-route")
		expect(res.status).toBe(404)
	})

	test('should return a 200', async () => {
		const res = await request(server.getHttpServer()).get("/home")
		expect(res.status).toBe(200)
	})
})
