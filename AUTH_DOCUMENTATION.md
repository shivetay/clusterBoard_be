# Authentication System Documentation

## Overview

This backend application provides a comprehensive authentication system with **two authentication strategies**:

1. **JWT-based Authentication** - Stateless authentication using JSON Web Tokens
2. **Session-based Authentication** - Stateful authentication using Express sessions with MongoDB storage

Additionally, the system supports **OAuth integration** with Google and Facebook.

---

## Table of Contents

- [Authentication Methods](#authentication-methods)
- [API Endpoints](#api-endpoints)
- [Protected Routes](#protected-routes)
- [Password Management](#password-management)
- [OAuth Integration](#oauth-integration)
- [Environment Variables](#environment-variables)
- [Usage Examples](#usage-examples)

---

## Authentication Methods

### 1. JWT-Based Authentication

**Advantages:**
- Stateless (no server-side session storage)
- Scalable for microservices
- Works well with mobile apps
- Can be used across different domains

**How it works:**
1. User logs in with credentials
2. Server returns a JWT token
3. Client stores token (localStorage, sessionStorage, etc.)
4. Client sends token in `Authorization` header for protected requests: `Bearer <token>`

**Token expiry:** 90 days (configurable via `JWT_EXPIRES_IN`)

### 2. Session-Based Authentication

**Advantages:**
- Server has full control over sessions
- Easy to revoke sessions
- Better for traditional web applications
- Automatic session management

**How it works:**
1. User logs in with credentials
2. Server creates a session and stores it in MongoDB
3. Server sends session cookie to client
4. Client automatically sends cookie with each request
5. Server validates session on each request

**Session expiry:** 7 days (configurable in `app.ts`)

---

## API Endpoints

### Base URL: `/api/v1/auth`

### JWT-Based Authentication

#### Register (JWT)
```http
POST /api/v1/auth/jwt/register
Content-Type: application/json

{
  "user_name": "johndoe",
  "email": "john@example.com",
  "password": "password123",
  "password_confirm": "password123",
  "role": "cluster_owner"
}
```

**Response:**
```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "_id": "...",
      "user_name": "johndoe",
      "email": "john@example.com",
      "role": "cluster_owner",
      "oauth_provider": "local"
    }
  }
}
```

#### Login (JWT)
```http
POST /api/v1/auth/jwt/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:** Same as register

#### Get Current User (JWT)
```http
GET /api/v1/auth/jwt/me
Authorization: Bearer <your-jwt-token>
```

#### Update Password (JWT)
```http
PATCH /api/v1/auth/jwt/update-password
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "current_password": "password123",
  "new_password": "newpassword456",
  "new_password_confirm": "newpassword456"
}
```

#### Deactivate Account (JWT)
```http
DELETE /api/v1/auth/jwt/deactivate
Authorization: Bearer <your-jwt-token>
```

---

### Session-Based Authentication

#### Register (Session)
```http
POST /api/v1/auth/session/register
Content-Type: application/json

{
  "user_name": "johndoe",
  "email": "john@example.com",
  "password": "password123",
  "password_confirm": "password123",
  "role": "cluster_owner"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "...",
      "user_name": "johndoe",
      "email": "john@example.com",
      "role": "cluster_owner"
    }
  }
}
```
*Session cookie is automatically set*

#### Login (Session)
```http
POST /api/v1/auth/session/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Logout (Session)
```http
POST /api/v1/auth/session/logout
```

#### Get Current User (Session)
```http
GET /api/v1/auth/session/me
```
*Cookie is automatically sent*

#### Update Password (Session)
```http
PATCH /api/v1/auth/session/update-password
Content-Type: application/json

{
  "current_password": "password123",
  "new_password": "newpassword456",
  "new_password_confirm": "newpassword456"
}
```

#### Deactivate Account (Session)
```http
DELETE /api/v1/auth/session/deactivate
```

---

## Password Management

### Forgot Password
```http
POST /api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Password reset token sent to email!",
  "resetToken": "abc123..." // Only in development mode
}
```

**Note:** In production, the reset token should be sent via email. In development, it's returned in the response for testing.

### Reset Password
```http
PATCH /api/v1/auth/reset-password/:token
Content-Type: application/json

{
  "password": "newpassword123",
  "password_confirm": "newpassword123"
}
```

**Note:** The token is the one received from the forgot password endpoint (or email in production).

---

## OAuth Integration

### Google OAuth

#### Initiate Google Login
```http
GET /api/v1/auth/google?auth_type=jwt
```
or
```http
GET /api/v1/auth/google?auth_type=session
```

This will redirect to Google's OAuth consent screen.

#### Google Callback
```http
GET /api/v1/auth/google/callback
```

This is called automatically by Google after authentication. Configure this URL in your Google OAuth app settings.

**Response (JWT mode):**
```json
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "user": {
      "_id": "...",
      "user_name": "John Doe",
      "email": "john@gmail.com",
      "role": "cluster_owner",
      "oauth_provider": "google",
      "oauth_id": "google-user-id"
    }
  }
}
```

**Response (Session mode):**
```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "...",
      "user_name": "John Doe",
      "email": "john@gmail.com",
      "role": "cluster_owner",
      "oauth_provider": "google"
    }
  }
}
```

### Facebook OAuth

Similar to Google OAuth:

#### Initiate Facebook Login
```http
GET /api/v1/auth/facebook?auth_type=jwt
```
or
```http
GET /api/v1/auth/facebook?auth_type=session
```

#### Facebook Callback
```http
GET /api/v1/auth/facebook/callback
```

---

## Protected Routes

### Middleware Options

1. **`protectJWT`** - Requires valid JWT token in Authorization header
2. **`protectSession`** - Requires valid session cookie
3. **`optionalAuth`** - Allows both authenticated and unauthenticated access (user info available if authenticated)
4. **`restrictTo(...roles)`** - Restricts access to specific user roles

### Example Protected Routes

```javascript
// Protect with JWT
router.post('/projects/create', protectJWT, createProject);

// Protect with Session
router.post('/projects/create', protectSession, createProject);

// Restrict to specific roles
router.delete('/projects/:id', protectJWT, restrictTo('cluster_owner', 'cluster_god'), deleteProject);

// Optional authentication
router.get('/projects', optionalAuth, getAllProjects);
```

### User Roles

- `investor` - Can view and invest in projects
- `cluster_owner` - Can create and manage their own projects
- `cluster_god` - Admin with full access
- `team_member` - Member of a project team

---

## Protected Route Examples

### Projects

| Method | Endpoint | Auth Required | Roles | Description |
|--------|----------|---------------|-------|-------------|
| GET | `/api/v1/projects` | Optional | Any | Get all projects |
| GET | `/api/v1/projects/:id` | Optional | Any | Get project by ID |
| GET | `/api/v1/projects/user/:id` | Optional | Any | Get user's projects |
| POST | `/api/v1/projects/create` | JWT Required | Any | Create new project |
| PATCH | `/api/v1/projects/:id` | JWT Required | Any | Update project |
| DELETE | `/api/v1/projects/:id` | JWT Required | `cluster_owner`, `cluster_god` | Delete project |
| PATCH | `/api/v1/projects/:id/status` | JWT Required | Any | Change project status |

### Users

| Method | Endpoint | Auth Required | Roles | Description |
|--------|----------|---------------|-------|-------------|
| GET | `/api/v1/users` | JWT Required | `cluster_god` | Get all users (admin only) |
| GET | `/api/v1/users/:id` | JWT Required | Any | Get user by ID |
| POST | `/api/v1/users/create` | JWT Required | `cluster_god` | Create user (admin only) |

---

## Environment Variables

See `.env.example` for a complete list of required environment variables.

### Required Variables

```env
# Server
NODE_ENV=development
PORT=3003

# Database
DATABASE_URL=mongodb+srv://<db_userName>:<db_password>@cluster.mongodb.net/database
DATABASE_USER=your_username
DATABASE_PASSWORD=your_password

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=90d

# Session
SESSION_SECRET=your-super-secret-session-key

# CORS
CORS_ORIGIN=http://localhost:3000
```

### Optional Variables (for OAuth)

```env
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3003/api/v1/auth/google/callback

# Facebook OAuth
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_CALLBACK_URL=http://localhost:3003/api/v1/auth/facebook/callback
```

---

## Usage Examples

### Frontend Integration

#### Using JWT Authentication

```javascript
// Register
const register = async () => {
  const response = await fetch('http://localhost:3003/api/v1/auth/jwt/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_name: 'johndoe',
      email: 'john@example.com',
      password: 'password123',
      password_confirm: 'password123',
    }),
  });
  const data = await response.json();
  
  // Store token
  localStorage.setItem('token', data.token);
};

// Login
const login = async () => {
  const response = await fetch('http://localhost:3003/api/v1/auth/jwt/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'john@example.com',
      password: 'password123',
    }),
  });
  const data = await response.json();
  
  // Store token
  localStorage.setItem('token', data.token);
};

// Make authenticated request
const createProject = async () => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('http://localhost:3003/api/v1/projects/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: 'My Project',
      description: 'Project description',
    }),
  });
  const data = await response.json();
};
```

#### Using Session Authentication

```javascript
// Register
const register = async () => {
  const response = await fetch('http://localhost:3003/api/v1/auth/session/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Important for cookies
    body: JSON.stringify({
      user_name: 'johndoe',
      email: 'john@example.com',
      password: 'password123',
      password_confirm: 'password123',
    }),
  });
  const data = await response.json();
};

// Login
const login = async () => {
  const response = await fetch('http://localhost:3003/api/v1/auth/session/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Important for cookies
    body: JSON.stringify({
      email: 'john@example.com',
      password: 'password123',
    }),
  });
  const data = await response.json();
};

// Make authenticated request (cookie is sent automatically)
const createProject = async () => {
  const response = await fetch('http://localhost:3003/api/v1/projects/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Important for cookies
    body: JSON.stringify({
      title: 'My Project',
      description: 'Project description',
    }),
  });
  const data = await response.json();
};

// Logout
const logout = async () => {
  const response = await fetch('http://localhost:3003/api/v1/auth/session/logout', {
    method: 'POST',
    credentials: 'include',
  });
  const data = await response.json();
};
```

---

## Security Features

1. **Password Hashing** - Passwords are hashed using bcrypt with 12 salt rounds
2. **Password Validation** - Minimum 8 characters, maximum 20 characters
3. **Password Reset Tokens** - Tokens expire after 10 minutes
4. **Session Security** - HttpOnly cookies, secure in production, sameSite protection
5. **CORS Protection** - Configurable allowed origins
6. **XSS Protection** - Input sanitization
7. **Account Deactivation** - Users can deactivate their accounts
8. **Password Change Tracking** - Tracks when passwords are changed
9. **OAuth Account Linking** - Existing accounts can be linked with OAuth providers

---

## OAuth Setup

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3003/api/v1/auth/google/callback`
6. Copy Client ID and Client Secret to `.env` file

### Facebook OAuth Setup

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Facebook Login product
4. Configure OAuth Redirect URIs: `http://localhost:3003/api/v1/auth/facebook/callback`
5. Copy App ID and App Secret to `.env` file

---

## Testing

### Test JWT Authentication

```bash
# Register
curl -X POST http://localhost:3003/api/v1/auth/jwt/register \
  -H "Content-Type: application/json" \
  -d '{
    "user_name": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "password_confirm": "password123"
  }'

# Login
curl -X POST http://localhost:3003/api/v1/auth/jwt/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Get current user (replace TOKEN with actual token)
curl -X GET http://localhost:3003/api/v1/auth/jwt/me \
  -H "Authorization: Bearer TOKEN"
```

### Test Session Authentication

```bash
# Register (save cookies)
curl -X POST http://localhost:3003/api/v1/auth/session/register \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "user_name": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "password_confirm": "password123"
  }'

# Get current user (use saved cookies)
curl -X GET http://localhost:3003/api/v1/auth/session/me \
  -b cookies.txt
```

---

## Troubleshooting

### Common Issues

1. **"Invalid token" error**
   - Check if JWT_SECRET matches between registration and login
   - Verify token is not expired
   - Ensure token is sent in correct format: `Bearer <token>`

2. **"Session not found" error**
   - Check if MongoDB connection is working
   - Verify SESSION_SECRET is set
   - Ensure cookies are enabled in browser
   - Check CORS configuration allows credentials

3. **OAuth not working**
   - Verify callback URLs match exactly in OAuth provider settings
   - Check if CLIENT_ID and CLIENT_SECRET are correct
   - Ensure OAuth provider (Google/Facebook) is configured in environment variables

4. **CORS errors**
   - Check CORS_ORIGIN in .env matches your frontend URL
   - Ensure credentials: 'include' is set in frontend requests for session auth

---

## Next Steps

1. Configure email service for password reset emails (currently using console in development)
2. Add rate limiting to prevent brute force attacks
3. Add 2FA (Two-Factor Authentication) support
4. Add refresh token mechanism for JWT
5. Add account verification via email
6. Add more OAuth providers (GitHub, Twitter, etc.)

---

## Support

For issues or questions, please refer to the main README or create an issue in the repository.
