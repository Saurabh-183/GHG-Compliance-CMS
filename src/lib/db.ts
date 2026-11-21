import mongoose, { Connection } from 'mongoose';
import dns from 'dns';

function normalizeMongoUri(uri: string): string {
  return uri.replace(/mongodb(\+srv)?:\/\/localhost/gi, (_m, srv) => `mongodb${srv || ''}://127.0.0.1`);
}

const MONGODB_URI = normalizeMongoUri(
  process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/carbon_crunch_compliance'
);

export function isMongoUnavailableError(error: unknown): boolean {
  const name = (error as { name?: string })?.name ?? '';
  const code = (error as { code?: string })?.code ?? '';
  const message = String((error as { message?: string })?.message ?? '');
  return (
    name === 'MongooseServerSelectionError' ||
    name === 'MongoServerSelectionError' ||
    (code === 'ECONNREFUSED' && message.includes('querySrv'))
  );
}

const ATLAS_DNS_SERVERS = ['8.8.8.8', '1.1.1.1', '8.8.4.4'] as const;

/** Atlas SRV URIs need working DNS; many Windows networks refuse SRV on the default resolver. */
export function ensureMongoSrvDns(): void {
  if (!MONGODB_URI.startsWith('mongodb+srv://')) return;
  try {
    dns.setServers([...ATLAS_DNS_SERVERS]);
  } catch {
    // Fallback if environment restricts setting custom DNS servers
  }
}

ensureMongoSrvDns();

/** True for 24-char hex MongoDB ObjectId strings (not arbitrary demo JWT user ids). */
export function isMongoObjectId(value: string | undefined | null): boolean {
  if (!value?.trim()) return false;
  return mongoose.Types.ObjectId.isValid(value) && /^[a-f0-9]{24}$/i.test(value.trim());
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
  ensureMongoSrvDns();

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
      serverSelectionTimeoutMS:
        process.env.NODE_ENV === 'production' ? 10_000 : 2_000,
      /** Avoid ::1 ECONNREFUSED on Windows when only IPv4 mongod is listening */
      family: 4 as const,
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
