export class AppError extends Error {
    public statusCode: number;
    public isOperational: boolean;
    public validationErrors?: unknown;

    constructor(message: string, statusCode: number = 500, isOperational: boolean = true, validationErrors?: unknown) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.validationErrors = validationErrors;

        Error.captureStackTrace(this, this.constructor);
    }

    //TODO  implement logger
}