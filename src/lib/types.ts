import { ServerOptions } from 'node:http';
import type { Method } from './consts';
import { ExtraOptions } from './interfaces';

export type ContentTypes =
  | 'application/json'
  | 'application/x-www-form-urlencoded'
  | 'multipart/form-data';

export type TMethod = (typeof Method)[number];

export type Options = ServerOptions & ExtraOptions;

