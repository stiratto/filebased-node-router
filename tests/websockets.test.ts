import { describe, expect, test } from "vitest"
import request from "supertest"
import { server } from "./setup"
import { IncomingHttpHeaders } from "http"

describe('Websockets', () => {
  test('test websocket conn', () => {
    const response = request(server.getHttpServer()).get("/messages").set("upgrade", "")

  })
})
