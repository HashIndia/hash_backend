import { Router } from 'express';

const router = Router();

// Debug endpoint to check cookies and headers
router.get('/debug', (req, res) => {
  res.json({
    message: 'Debug endpoint',
    environment: process.env.NODE_ENV,
    cookies: req.cookies,
    headers: {
      origin: req.headers.origin,
      'user-agent': req.headers['user-agent'],
      authorization: req.headers.authorization,
      cookie: req.headers.cookie,
    },
    corsOrigins: process.env.NODE_ENV === 'production' 
      ? [process.env.FRONTEND_URL, process.env.ADMIN_URL]
      : 'all',
    environmentCheck: {
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasJwtRefreshSecret: !!process.env.JWT_REFRESH_SECRET,
      hasAdminJwtSecret: !!process.env.ADMIN_JWT_SECRET,
      hasMongoUri: !!process.env.MONGODB_URI,
      hasFrontendUrl: !!process.env.FRONTEND_URL,
      hasAdminUrl: !!process.env.ADMIN_URL,
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
