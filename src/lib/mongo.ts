import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Missing MONGODB_URI in .env.local");

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const client = new MongoClient(uri);

export const mongoClientPromise =
  global._mongoClientPromise ?? (global._mongoClientPromise = client.connect());

export async function getDb(): Promise<Db> {
  const c = await mongoClientPromise;
  // URI에 /weight-tracker 붙였으면 해당 DB가 잡힘
  return c.db();
}

export async function ensureIndexes() {
  const db = await getDb();
  const logs = db.collection("daily_logs");

  // 하루(userId+dateKey) 유니크 보장
  await logs.createIndex({ userId: 1, dateKey: 1 }, { unique: true });

  // 조회 성능용 (기간 검색)
  //await logs.createIndex({ userId: 1, dateKey: 1 });
}