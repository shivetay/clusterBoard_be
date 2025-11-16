import dotenv from 'dotenv';
import mongoose from 'mongoose';

const DEFAULT_PORT = 3003;
// Load environment variables based on NODE_ENV
const envFile =
  process.env.NODE_ENV === 'production' ? './prod.env' : './dev.env';
dotenv.config({ path: envFile });

// Import app after environment variables are loaded
import app from './app';

const PORT = process.env.PORT || DEFAULT_PORT;

// DB connection

const DB_CONNECTION =
  process.env.DATABASE_URL?.replace(
    '<db_userName>',
    process.env.DATABASE_USER || '',
  ).replace('<db_password>', process.env.DATABASE_PASSWORD || '') || '';

mongoose
  .connect(DB_CONNECTION)
  .then(() => {
    // biome-ignore lint/suspicious/noConsole: console log for DB connected successfully
    console.log('DB connected successfully');
  })
  .catch((err: Error) => {
    // biome-ignore lint/suspicious/noConsole: console log for DB connection error
    console.log(err);
  });

app.listen(PORT, () => {
  // biome-ignore lint/suspicious/noConsole: console log for server running
  console.log(`Server is running on port ${PORT}`);
});
