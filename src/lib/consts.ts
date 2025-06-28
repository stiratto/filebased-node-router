export const mimeTypes = {
  json: 'application/json',
  multipart: 'multipart/form-data',
  urlencoded: 'application/x-www-form-urlencoded'
} satisfies Record<string, string>

export const Method = [
  'POST',
  'GET',
  'PUT',
  'DELETE',
  'PATCH',
  'WEBSOCKET',
] as const
