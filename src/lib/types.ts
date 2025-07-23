import { ServerOptions } from 'node:http';
import type { Method, ValidationMiddlewareOptions } from './consts';
import { ExtraOptions } from './interfaces';
import z from 'zod';

export type ContentTypes =
  | 'application/json'
  | 'application/x-www-form-urlencoded'
  | 'multipart/form-data';

export type TMethod = (typeof Method)[number];

export type Options = ServerOptions & ExtraOptions;

export type MiddlewareOptions = z.infer<typeof ValidationMiddlewareOptions>

