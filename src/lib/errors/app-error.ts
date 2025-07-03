export class AppError extends Error {
  constructor(message: string, status = 500, cause?: unknown) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}
