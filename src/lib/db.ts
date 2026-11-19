import mongoose, { Connection } from 'mongoose';
import dns from 'dns';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/carbon_crunch_compliance';

// On Windows, Node.js dns.resolveSrv can fail with querySrv ECONNREFUSED when querying local DNS
if (MONGODB_URI.startsWith('mongodb+srv://')) {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch {
    // Fallback if environment restricts setting custom DNS servers
  }
}

function isPlaceholderUri(uri: string): boolean {
  return (
    uri.includes('<') ||
    uri.includes('>') ||
    uri.includes('@cluster0.mongodb.net') || // Generic placeholder without unique cluster hash
    uri.includes('username:password')
  );
}

interface MongooseCache {
  conn: Connection | null;
  promise: Promise<Connection> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectToDatabase(): Promise<Connection> {
  if (cached.conn) {
    return cached.conn;
  }

  const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
  if (isProduction && !process.env.MONGODB_URI) {
    throw new Error(
      'MONGODB_URI is not set in environment variables. Please add your MongoDB Atlas connection string in Vercel Project Settings > Environment Variables.'
    );
  }

  if (isPlaceholderUri(MONGODB_URI)) {
    throw new Error(
      'MONGODB_URI contains a placeholder (@cluster0.mongodb.net). Real MongoDB Atlas URIs require your cluster hash, e.g. cluster0.XXXXX.mongodb.net.'
    );
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 4000, // Fail fast after 4s instead of hanging for 30s
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((m) => {
      return m.connection;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
