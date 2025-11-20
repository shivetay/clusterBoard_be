import crypto from 'node:crypto';
import passport from 'passport';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import type { IUserSchema } from '../model/types';
import User from '../model/userModel';

// Serialize user for the session
passport.serializeUser((user: Express.User, done) => {
  done(null, (user as IUserSchema)._id);
});

// Deserialize user from the session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Local Strategy (Username/Email and Password)
passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password',
    },
    async (email, password, done) => {
      try {
        // Find user by email
        const user = await User.findOne({ email }).select(
          '+password +is_active',
        );

        if (!user) {
          return done(null, false, { message: 'Incorrect email or password.' });
        }

        // Check if account is active
        if (!user.is_active) {
          return done(null, false, {
            message: 'This account has been deactivated.',
          });
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(
          password,
          user.password,
        );

        if (!isPasswordValid) {
          return done(null, false, { message: 'Incorrect email or password.' });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    },
  ),
);

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:
          process.env.GOOGLE_CALLBACK_URL || '/api/v1/auth/google/callback',
        scope: ['profile', 'email'],
      },
      async (accessToken, _refreshToken, profile, done) => {
        try {
          // Check if user already exists
          let user = await User.findOne({
            oauth_id: profile.id,
            oauth_provider: 'google',
          });

          if (!user) {
            // Check if user exists with same email
            const emailUser = await User.findOne({
              email: profile.emails?.[0]?.value,
            });

            if (emailUser) {
              // Link Google account to existing user
              emailUser.oauth_provider = 'google';
              emailUser.oauth_id = profile.id;
              emailUser.oauth_access_token = accessToken;
              user = await emailUser.save();
            } else {
              // Create new user
              user = await User.create({
                user_name:
                  profile.displayName ||
                  profile.emails?.[0]?.value?.split('@')[0] ||
                  'user',
                email: profile.emails?.[0]?.value,
                oauth_provider: 'google',
                oauth_id: profile.id,
                oauth_access_token: accessToken,
                password: crypto.randomBytes(32).toString('hex'), // Random password for OAuth users
                password_confirm: '',
              });
            }
          } else {
            // Update access token
            user.oauth_access_token = accessToken;
            await user.save();
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error, undefined);
        }
      },
    ),
  );
}

// Facebook OAuth Strategy
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(
    new FacebookStrategy(
      {
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL:
          process.env.FACEBOOK_CALLBACK_URL || '/api/v1/auth/facebook/callback',
        profileFields: ['id', 'displayName', 'emails', 'name'],
      },
      async (accessToken, _refreshToken, profile, done) => {
        try {
          // Check if user already exists
          let user = await User.findOne({
            oauth_id: profile.id,
            oauth_provider: 'facebook',
          });

          if (!user) {
            // Check if user exists with same email
            const emailUser = await User.findOne({
              email: profile.emails?.[0]?.value,
            });

            if (emailUser) {
              // Link Facebook account to existing user
              emailUser.oauth_provider = 'facebook';
              emailUser.oauth_id = profile.id;
              emailUser.oauth_access_token = accessToken;
              user = await emailUser.save();
            } else {
              // Create new user
              user = await User.create({
                user_name:
                  profile.displayName ||
                  profile.emails?.[0]?.value?.split('@')[0] ||
                  'user',
                email: profile.emails?.[0]?.value,
                oauth_provider: 'facebook',
                oauth_id: profile.id,
                oauth_access_token: accessToken,
                password: crypto.randomBytes(32).toString('hex'), // Random password for OAuth users
                password_confirm: '',
              });
            }
          } else {
            // Update access token
            user.oauth_access_token = accessToken;
            await user.save();
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error, undefined);
        }
      },
    ),
  );
}

export default passport;
