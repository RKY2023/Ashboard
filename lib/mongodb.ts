import { MongoClient, Db } from 'mongodb';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

interface ConnectionResult {
  client: MongoClient;
  db: Db;
}

export async function connectToDatabase(): Promise<ConnectionResult> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  if (!process.env.API_URL) {
    throw new Error('API_URL environment variable is not defined');
  }

  try {
    const client = await MongoClient.connect(process.env.API_URL);
    const db = client.db();

    cachedClient = client;
    cachedDb = db;

    return { client, db };
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

export async function getDatabase(): Promise<Db> {
  const { db } = await connectToDatabase();
  return db;
}

export async function closeDatabase(): Promise<void> {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
  }
}

// Multi-database connection pooling
interface CachedConnection {
  client: MongoClient;
  db: Db;
}

const connectionCache = new Map<string, CachedConnection>();

export async function getDatabaseByName(
  connectionString: string,
  databaseName: string
): Promise<Db> {
  const cacheKey = `${connectionString}:${databaseName}`;

  if (connectionCache.has(cacheKey)) {
    return connectionCache.get(cacheKey)!.db;
  }

  const client = await MongoClient.connect(connectionString);
  const db = client.db(databaseName);

  connectionCache.set(cacheKey, { client, db });
  return db;
}

// Pre-configured helpers
export async function getCsvDatabase(): Promise<Db> {
  if (!process.env.API_URL) {
    throw new Error('API_URL environment variable is not defined');
  }
  return getDatabaseByName(process.env.API_URL, 'CSV');
}

export async function getSysinfoDatabase(): Promise<Db> {
  if (!process.env.API_URL2) {
    throw new Error('API_URL2 environment variable is not defined');
  }
  return getDatabaseByName(process.env.API_URL2, 'sysinfo');
}
