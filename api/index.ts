import { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../src/app';

// Export the Express app as a Vercel serverless function
export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}
