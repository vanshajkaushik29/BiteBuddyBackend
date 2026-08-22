// Extends Express Request to include the user property set by authMiddleware.
// The middleware sets req.user = { id: string } after JWT verification.
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
      };
    }
  }
}

export {};
