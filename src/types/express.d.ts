declare namespace Express {
  export interface Request {
    user?: {
      userId: string;
      organizationId: string;
      role: string;
    };
  }
}
