import type { Method } from './consts';

export type ContentTypes =
  | 'application/json'
  | 'application/x-www-form-urlencoded'
  | 'multipart/form-data';

export type TMethod = (typeof Method)[number];
