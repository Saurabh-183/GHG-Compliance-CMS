import dns from "node:dns";
dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
import mongoose from "mongoose";

const uri = process.env.MONGODB_URI || process.env.MONGO_URL;

if (!uri) {
  throw new Error("MONGODB_URI or MONGO_URL is missing from .env");
}

try {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB connection unavailable");

  const targetCollections = [
    "datarequirements",
    "datasets",
    "clarifications",
    "notifications",
    "calendaritems",
    "regulatorysubmissions",
    "facilitydatachecklists",
  ];

  console.log("Removing demo operational records from MongoDB...\n");

  const results = {};
  for (const colName of targetCollections) {
    const res = await db.collection(colName).deleteMany({});
    results[colName] = res.deletedCount;
    console.log(`Deleted ${res.deletedCount} documents from '${colName}'`);
  }

  console.log("\nSummary of deleted documents:", results);
} catch (err) {
  console.error("Error during deletion:", err);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
