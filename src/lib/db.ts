import mongoose, { Connection } from 'mongoose';
import dns from 'dns';
import '@/models';

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
  if (cached.conn && cached.conn.readyState === 1) {
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
      serverSelectionTimeoutMS: 5000,
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
