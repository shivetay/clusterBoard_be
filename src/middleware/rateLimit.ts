import rateLimit from 'express-rate-limit';

export const invitationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req) => (req.user?.role === 'cluster_god' ? 100 : 10), // higher limit for cluster_god, default 10 otherwise
  message: 'Too many invitations sent, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});
