export interface WebSocketOptions {
  baseUrl: string
}

export interface WebSocketStructure {
  props: any;
  handleMessage: () => any;
  handleConnection: () => any;
  handleDisconnection: () => any;
}
