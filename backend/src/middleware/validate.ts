import type { NextFunction, Request, Response } from 'express';
import { ZodObject, ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';

export const validate = (schema: ZodObject<any>) => (req: Request, res: Response, next: NextFunction) => {
    try {
        schema.parse({
            body: req.body,
            params: req.params,
            query: req.query,
        });
        next();
    } catch (error: any) {
        if (error instanceof ZodError) {
            const formattedErrors = error.issues.map((issue) => {
                const path = issue.path.join('.');
                const errorDetail: any = {
                    field: path || 'unknown',
                    message: issue.message,
                    code: issue.code,
                };

                if (issue.code === 'invalid_type') {
                    errorDetail.expected = issue.expected;
                    errorDetail.received = (issue as any).received;
                }

                return errorDetail;
            });

            return next(new AppError('Schema Validation Failed', 400, true, formattedErrors));
        }
        return next(error);
    }
}