declare global {
    namespace Express {
        interface Request {
            user: {
                id: string;
                email: string;
                emailVerified: boolean;
                // Bumped on logout and password change; authMiddleware compares it against the
                // User document so tokens minted before either event stop being accepted.
                tokenVersion?: number;
            };
        }
    }
}
