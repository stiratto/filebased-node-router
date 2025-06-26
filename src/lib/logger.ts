import { pad } from './utils'

interface Options {
  timestamp?: boolean
}

export class Logger {
  private options: Options = {
    timestamp: true,
  }

  constructor(options?: Options) {
    if (options) this.options = options
  }

  log(message: string) {
    this._print(message, '32')
  }

  error(message: string) {
    this._print(message, '31')
  }

  info(message: string) {
    this._print(message, '36')
  }

  warning(message: string) {
    this._print(message, '33')
  }

  private _print(message: string, color: string) {
    const now = new Date()
    const timestamp = this.options.timestamp
      ? `[${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}] `
      : ''

    console.log(`\x1b[${color}m${timestamp}${message}\x1b[0m`)
  }
}
