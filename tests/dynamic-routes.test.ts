import { describe, expect, test } from "vitest";
import request from 'supertest'
import { server } from "./setup";

describe('dynamic routes', () => {
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

	test('should return 200, catchall', async () => {
		const res = await request(server.getHttpServer()).get("/getId/24/details/more")
		expect(res.status).toBe(200)
	})

	test('should return catchall intermediate route response data', async () => {
		const res = await request(server.getHttpServer()).get("/getId/1/2/3/4/test")
		expect(res.status).toBe(200)
		expect(res.body).toBe('...ids/test')
	})


})
