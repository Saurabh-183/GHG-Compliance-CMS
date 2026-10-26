import mongoose from "mongoose";
import { EJSON } from "bson";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const uri = process.env.MONGODB_URI || process.env.MONGO_URL;

if (!uri) {
  throw new Error("MONGODB_URI or MONGO_URL is missing from .env");
}

const backupDir = path.resolve("mongo-backup");
await mkdir(backupDir, { recursive: true });

try {
  await mongoose.connect(uri);

  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB connection is not available");

  const collections = await db.listCollections({}, { nameOnly: true }).toArray();
  const summary = [];

  for (const { name } of collections) {
    const documents = await db.collection(name).find({}).toArray();
    const file = path.join(backupDir, `${name}.json`);

    await writeFile(
      file,
      EJSON.stringify(documents, null, 2, { relaxed: false }),
      "utf8"
    );

    summary.push({
      collection: name,
      documents: documents.length,
      file: path.basename(file),
    });

    console.log(`Backed up ${name}: ${documents.length} documents`);
  }

  await writeFile(
    path.join(backupDir, "_backup-summary.json"),
    JSON.stringify(
      {
        database: db.databaseName,
        createdAt: new Date().toISOString(),
        collections: summary,
      },
      null,
      2
    ),
    "utf8"
  );

  console.log(`\nBackup completed: ${backupDir}`);
  console.log(`Collections backed up: ${summary.length}`);
} finally {
  await mongoose.disconnect();
}
