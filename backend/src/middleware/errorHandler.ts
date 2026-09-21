import type { NextFunction, Request, Response } from "express"
import { AppError } from "../utils/AppError.js"
import { mapMongoError } from "../utils/mongoErrorMapper.js"

export const errorHandler = ( error: Error, req: Request, res: Response, next: NextFunction ) => {
  const mongoError = mapMongoError(error)
  if (mongoError) {
    return res.status(mongoError.statusCode).json({
      success: false,
      message: mongoError.message,
    })
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      ...(error.validationErrors
        ? {
            message: (error.validationErrors as any)[0].message,
            errors: error.validationErrors,
          }
        : {
            message: error.message,
          }),
    })
  }

  console.error(error)
  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
  })
}
