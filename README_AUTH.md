# Authentication System Implementation Summary

## ✅ Completed Features

### 1. **Dual Authentication Strategy** ✓
- **JWT-based Authentication** - Stateless authentication with JSON Web Tokens
- **Session-based Authentication** - Stateful authentication with Express sessions stored in MongoDB
- Both strategies work independently and can be chosen based on your needs

### 2. **User Registration & Login** ✓
Implemented **2 choices** for both registration and login:
- `/api/v1/auth/jwt/register` - Register with JWT
- `/api/v1/auth/session/register` - Register with Session
- `/api/v1/auth/jwt/login` - Login with JWT
- `/api/v1/auth/session/login` - Login with Session

### 3. **Protected Routes** ✓
Implemented multiple middleware options:
- `protectJWT` - Protects routes using JWT authentication
- `protectSession` - Protects routes using session authentication
- `restrictTo(...roles)` - Role-based access control
- `optionalAuth` - Optional authentication (user info available if logged in)

### 4. **Password Management** ✓
Complete password management system:
- **Password Hashing** - bcrypt with 12 salt rounds
- **Password Validation** - 8-20 characters minimum
- **Forgot Password** - Generate reset tokens
- **Reset Password** - Token-based password reset (10-minute expiry)
- **Update Password** - For logged-in users
- **Password Change Tracking** - Tracks when passwords are changed

### 5. **OAuth Integration** ✓
Implemented OAuth 2.0 for:
- **Google OAuth** - Full integration with account linking
- **Facebook OAuth** - Full integration with account linking
- Both support JWT and Session modes via query parameter `?auth_type=jwt` or `?auth_type=session`
- Automatic account linking if email already exists

---

## 📁 File Structure

```
/workspace/
├── src/
│   ├── config/
│   │   └── passport.ts           # Passport strategies (Local, Google, Facebook)
│   ├── controllers/
│   │   └── authController.ts     # All authentication controllers
│   ├── middleware/
│   │   └── authMiddleware.ts     # Authentication & authorization middleware
│   ├── model/
│   │   ├── userModel.ts          # Enhanced User model with OAuth fields
│   │   └── types/
│   │       └── userModel.type.ts # Updated User interface
│   ├── routes/
│   │   ├── authRoutes.ts         # All authentication routes
│   │   ├── projectRoutes.ts      # Updated with protected routes
│   │   ├── userRoutes.ts         # Updated with protected routes
│   │   └── index.ts              # Routes index
│   └── app.ts                    # Updated with session & passport config
├── .env.example                  # Environment variables template
├── AUTH_DOCUMENTATION.md         # Complete API documentation
└── README_AUTH.md                # This file
```

---

## 🔐 Authentication Endpoints

### JWT-Based Routes
```
POST   /api/v1/auth/jwt/register       # Register with JWT
POST   /api/v1/auth/jwt/login          # Login with JWT
GET    /api/v1/auth/jwt/me             # Get current user (JWT)
PATCH  /api/v1/auth/jwt/update-password # Update password (JWT)
DELETE /api/v1/auth/jwt/deactivate     # Deactivate account (JWT)
```

### Session-Based Routes
```
POST   /api/v1/auth/session/register   # Register with Session
POST   /api/v1/auth/session/login      # Login with Session
POST   /api/v1/auth/session/logout     # Logout (Session)
GET    /api/v1/auth/session/me         # Get current user (Session)
PATCH  /api/v1/auth/session/update-password # Update password (Session)
DELETE /api/v1/auth/session/deactivate # Deactivate account (Session)
```

### Password Management
```
POST   /api/v1/auth/forgot-password    # Request password reset
PATCH  /api/v1/auth/reset-password/:token # Reset password with token
```

### OAuth Routes
```
GET    /api/v1/auth/google             # Initiate Google OAuth
GET    /api/v1/auth/google/callback    # Google OAuth callback
GET    /api/v1/auth/facebook           # Initiate Facebook OAuth
GET    /api/v1/auth/facebook/callback  # Facebook OAuth callback
```

---

## 🛡️ Protected Routes Examples

### Project Routes
```javascript
// Public routes (optional auth)
GET    /api/v1/projects              # Get all projects
GET    /api/v1/projects/:id          # Get project by ID
GET    /api/v1/projects/user/:id     # Get user's projects

// Protected routes (JWT required)
POST   /api/v1/projects/create       # Create project
PATCH  /api/v1/projects/:id          # Update project
DELETE /api/v1/projects/:id          # Delete project (cluster_owner, cluster_god only)
PATCH  /api/v1/projects/:id/status   # Change project status
```

### User Routes
```javascript
// All routes require JWT authentication
GET    /api/v1/users                 # Get all users (cluster_god only)
GET    /api/v1/users/:id             # Get user by ID
POST   /api/v1/users/create          # Create user (cluster_god only)
```

---

## 🔧 Environment Variables

Create a `.env` file based on `.env.example`:

### Required Variables
```env
NODE_ENV=development
PORT=3003
DATABASE_URL=mongodb+srv://<db_userName>:<db_password>@cluster.mongodb.net/database
DATABASE_USER=your_username
DATABASE_PASSWORD=your_password
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=90d
SESSION_SECRET=your-super-secret-session-key
CORS_ORIGIN=http://localhost:3000
```

### Optional Variables (for OAuth)
```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3003/api/v1/auth/google/callback

FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_CALLBACK_URL=http://localhost:3003/api/v1/auth/facebook/callback
```

---

## 📦 Installed Packages

### Dependencies
- `passport` - Authentication middleware
- `passport-local` - Local strategy (email/password)
- `passport-google-oauth20` - Google OAuth 2.0 strategy
- `passport-facebook` - Facebook OAuth strategy
- `express-session` - Session management
- `connect-mongo` - MongoDB session store
- `nodemailer` - Email sending (for password reset)
- `jsonwebtoken` - JWT token generation & verification
- `bcryptjs` - Password hashing

### Dev Dependencies
- `@types/passport`
- `@types/passport-local`
- `@types/passport-google-oauth20`
- `@types/passport-facebook`
- `@types/express-session`
- `@types/nodemailer`

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment
```bash
cp .env.example dev.env
# Edit dev.env with your configuration
```

### 3. Start Development Server
```bash
pnpm run dev
```

### 4. Test Authentication

#### Register with JWT
```bash
curl -X POST http://localhost:3003/api/v1/auth/jwt/register \
  -H "Content-Type: application/json" \
  -d '{
    "user_name": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "password_confirm": "password123"
  }'
```

#### Login with JWT
```bash
curl -X POST http://localhost:3003/api/v1/auth/jwt/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

#### Access Protected Route
```bash
# Replace TOKEN with the JWT from login response
curl -X GET http://localhost:3003/api/v1/auth/jwt/me \
  -H "Authorization: Bearer TOKEN"
```

---

## 🎯 Key Features & Benefits

### JWT Authentication
✅ Stateless - No server-side session storage  
✅ Scalable - Perfect for microservices  
✅ Mobile-friendly - Easy to integrate with mobile apps  
✅ Cross-domain - Can work across different domains  

### Session Authentication
✅ Server-controlled - Full control over sessions  
✅ Easy revocation - Can invalidate sessions easily  
✅ Traditional - Better for server-rendered apps  
✅ Automatic - Cookie management handled by browser  

### Security Features
✅ Password hashing with bcrypt (12 rounds)  
✅ Password change tracking  
✅ Token-based password reset (10-minute expiry)  
✅ Account deactivation (soft delete)  
✅ Role-based access control  
✅ HttpOnly cookies for sessions  
✅ CORS protection  
✅ XSS protection  
✅ OAuth account linking  

---

## 📚 Documentation

For complete API documentation with examples, see:
- **[AUTH_DOCUMENTATION.md](./AUTH_DOCUMENTATION.md)** - Complete API reference with examples
- **[.env.example](./.env.example)** - Environment variables template

---

## 🔄 User Flow Examples

### Flow 1: JWT Registration & Login
1. User registers via `/api/v1/auth/jwt/register`
2. Server creates user and returns JWT token
3. Client stores token in localStorage
4. Client sends token in `Authorization: Bearer <token>` header for protected routes

### Flow 2: Session Registration & Login
1. User registers via `/api/v1/auth/session/register`
2. Server creates user and session
3. Server sends session cookie to client
4. Browser automatically sends cookie with each request

### Flow 3: OAuth (Google/Facebook)
1. Client redirects to `/api/v1/auth/google?auth_type=jwt`
2. User authenticates with Google
3. Google redirects to callback URL
4. Server creates/links account and returns JWT or creates session
5. Client stores token or session cookie

### Flow 4: Password Reset
1. User requests reset via `/api/v1/auth/forgot-password`
2. Server generates reset token and sends email (in dev, returns token)
3. User clicks link with token
4. User submits new password to `/api/v1/auth/reset-password/:token`
5. Server validates token, updates password, and logs user in

---

## 🎨 User Model Enhancements

### New Fields
```typescript
{
  oauth_provider: 'local' | 'google' | 'facebook',  // Auth provider
  oauth_id: string,                                  // Provider user ID
  oauth_access_token: string,                        // Provider access token
  is_active: boolean,                                // Account status
  password_changed_at: Date,                         // Password change tracking
  password_reset_token: string,                      // Reset token hash
  password_reset_expires: Date                       // Token expiration
}
```

### New Methods
```typescript
user.comparePassword(candidatePassword, userPassword)  // Compare passwords
user.createPasswordResetToken()                        // Generate reset token
user.changedPasswordAfter(JWTTimestamp)               // Check if password changed after JWT issued
```

---

## 🔒 Middleware Usage

### Protect Routes with JWT
```typescript
import { protectJWT } from './middleware/authMiddleware';

router.post('/projects/create', protectJWT, createProject);
```

### Protect Routes with Session
```typescript
import { protectSession } from './middleware/authMiddleware';

router.post('/projects/create', protectSession, createProject);
```

### Role-Based Access Control
```typescript
import { protectJWT, restrictTo } from './middleware/authMiddleware';

router.delete(
  '/projects/:id',
  protectJWT,
  restrictTo('cluster_owner', 'cluster_god'),
  deleteProject
);
```

### Optional Authentication
```typescript
import { optionalAuth } from './middleware/authMiddleware';

// User info available if authenticated, but route works without auth too
router.get('/projects', optionalAuth, getAllProjects);
```

---

## 🎯 Next Steps / Future Enhancements

1. **Email Service** - Configure nodemailer for production email sending
2. **Rate Limiting** - Add rate limiting to prevent brute force attacks
3. **2FA** - Implement two-factor authentication
4. **Refresh Tokens** - Add refresh token mechanism for JWT
5. **Email Verification** - Add email verification on registration
6. **More OAuth Providers** - Add GitHub, Twitter, etc.
7. **Account Deletion** - Add permanent account deletion
8. **Login History** - Track user login history and devices
9. **Security Notifications** - Email notifications for security events

---

## 🐛 Troubleshooting

### Issue: "Invalid token" error
- Check if JWT_SECRET matches between registration and login
- Verify token is not expired (check JWT_EXPIRES_IN)
- Ensure token format is `Bearer <token>`

### Issue: "Session not found" error
- Check MongoDB connection
- Verify SESSION_SECRET is set
- Ensure cookies are enabled in browser
- Check CORS configuration allows credentials

### Issue: OAuth not working
- Verify callback URLs match exactly in OAuth provider settings
- Check CLIENT_ID and CLIENT_SECRET are correct
- Ensure OAuth provider is configured in environment variables

---

## 📝 License

ISC

---

## 👨‍💻 Author

Łukasz Dawidowicz

---

## 🙏 Acknowledgments

Built with:
- Express.js
- Passport.js
- MongoDB
- TypeScript
- JWT
- bcrypt

---

**For detailed API documentation and usage examples, see [AUTH_DOCUMENTATION.md](./AUTH_DOCUMENTATION.md)**
