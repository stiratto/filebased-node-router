import { describe, expect, test } from "vitest";
import request from 'supertest'
import { server } from "./setup";

describe('dynamic routes', () => {
	test('should return not found', async () => {
		const res = await request(server.getHttpServer()).get("/getId/asd/123")
		expect(res.status).toBe(404)
	})

	test('should return 123', async () => {
		const res = await request(server.getHttpServer()).get("/getId/123")
		expect(res.body.id).toBe("123")
	})

	test('should return 405', async () => {
		const res = await request(server.getHttpServer()).get("/getId")
		expect(res.status).toBe(405)
	})

	test('should return 200 and body \'detailsBody\'', async () => {
		const res = await request(server.getHttpServer()).get("/getId/24/details")
		expect(res.status).toBe(200)
		expect(res.body).toBe('detailsBody')
	})

	test('should return 404', async () => {
		const res = await request(server.getHttpServer()).get("/getId/24/details/more")
		expect(res.status).toBe(404)
	})


})
