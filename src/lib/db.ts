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

/**
 * On Windows and certain ISP routers, Node.js dns.resolveSrv fails with `querySrv ECONNREFUSED`.
 * This helper resolves mongodb+srv:// URIs using public DNS servers (8.8.8.8, 1.1.1.1) and converts
 * them into direct standard replica set mongodb:// URIs, completely avoiding querySrv failures.
 */
async function resolveMongoUri(uri: string): Promise<string> {
  if (!uri.startsWith('mongodb+srv://')) {
    return uri;
  }

  try {
    const match = uri.match(/^mongodb\+srv:\/\/([^:]+):([^@]+)@([^\/\?]+)(\/[^\?]*)?(\?.*)?$/);
    if (!match) return uri;

    const [, user, pass, host, dbPath = '', query = ''] = match;

    let hosts: string[] = [];
    let txtOptions = '';

    try {
      const resolver = new dns.promises.Resolver();
      resolver.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
      const srvRecords = await resolver.resolveSrv(`_mongodb._tcp.${host}`);
      hosts = srvRecords.map((r) => `${r.name}:${r.port}`);

      try {
        const txtRecords = await resolver.resolveTxt(host);
        txtOptions = txtRecords.map((r) => r.join('')).join('&');
      } catch {
        // TXT records are optional
      }
    } catch {
      // Static fallback for known cluster if local DNS blocks public DNS resolvers
      if (host === 'cluster0.gygsits.mongodb.net') {
        hosts = [
          'ac-iznjjql-shard-00-00.gygsits.mongodb.net:27017',
          'ac-iznjjql-shard-00-01.gygsits.mongodb.net:27017',
          'ac-iznjjql-shard-00-02.gygsits.mongodb.net:27017',
        ];
        txtOptions = 'authSource=admin&replicaSet=atlas-6473xw-shard-0';
      }
    }

    if (hosts.length === 0) {
      return uri;
    }

    const params = new URLSearchParams(query.startsWith('?') ? query.slice(1) : '');
    if (!params.has('ssl')) params.set('ssl', 'true');

    if (txtOptions) {
      const txtParams = new URLSearchParams(txtOptions);
      for (const [k, v] of txtParams.entries()) {
        if (!params.has(k)) params.set(k, v);
      }
    }

    const converted = `mongodb://${user}:${pass}@${hosts.join(',')}${dbPath}?${params.toString()}`;
    return converted;
  } catch (err) {
    console.warn('Failed to convert SRV URI to direct URI, falling back to original:', err);
    return uri;
  }
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

  const rawUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/carbon_crunch_compliance';

  const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
  if (isProduction && !process.env.MONGODB_URI) {
    throw new Error(
      'MONGODB_URI is not set in environment variables. Please add your MongoDB Atlas connection string in Vercel Project Settings > Environment Variables.'
    );
  }

  if (isPlaceholderUri(rawUri)) {
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

    cached.promise = (async () => {
      const targetUri = await resolveMongoUri(rawUri);
      const m = await mongoose.connect(targetUri, opts);
      return m.connection;
    })();
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
