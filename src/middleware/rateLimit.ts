import rateLimit from 'express-rate-limit';

export const invitationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 invitations per window
  message: 'Too many invitations sent, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for cluster_god
    return req.user?.role === 'cluster_god';
  },
});
