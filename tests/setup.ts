
import { beforeAll, afterAll } from 'vitest';
import { Server } from '../src/server';

export let server: Server;

beforeAll(async () => {
  server = new Server(0, {});
  await server.start();
});

afterAll(async () => {
  await server.stop()
});

