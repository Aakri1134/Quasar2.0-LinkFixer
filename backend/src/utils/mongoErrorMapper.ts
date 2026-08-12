import { AppError } from "./AppError.js"

export const mapMongoError = (error: any): AppError | null => {
	// Duplicate key error
	if (error.code === 11000) {
		const field = Object.keys(error.keyPattern ?? {})[0] ?? "field"
		const message = field === "email"
			? "Email already registered"
			: field === "username"
				? "Username already taken"
				: `${field} already exists`
		return new AppError(message, 409)
	}

	// Mongoose validation error
	if (error.name === "ValidationError") {
		const messages = Object.values(error.errors ?? {}).map((e: any) => e.message)
		return new AppError(messages.join(", ") || "Validation failed", 400)
	}

	// Invalid ObjectId / CastError
	if (error.name === "CastError") {
		return new AppError(`Invalid ${error.path}: ${error.value}`, 400)
	}

	return null // not a recognized Mongo/Mongoose error
}