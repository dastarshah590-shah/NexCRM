export class HttpError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const notFound = (resource = "Resource") => new HttpError(404, `${resource} not found`);

export const forbidden = (message = "You do not have permission to perform this action") =>
  new HttpError(403, message);
