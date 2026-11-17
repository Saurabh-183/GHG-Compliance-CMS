import mongoose from "mongoose";

const uri = process.env.MONGODB_URI || process.env.MONGO_URL;

if (!uri) throw new Error("MongoDB connection variable is missing");

try {
  await mongoose.connect(uri);

  const db = mongoose.connection.db;
  const companies = await db.collection("clientgroups")
    .find({})
    .sort({ name: 1 })
    .toArray();

  const facilities = await db.collection("facilities")
    .find({})
    .sort({ name: 1 })
    .toArray();

  console.log("\n=== CURRENT COMPANY / FACILITY MAPPING ===\n");

  for (const company of companies) {
    const companyFacilities = facilities.filter(
      facility =>
        String(facility.clientGroupId) === String(company._id)
    );

    console.log(`COMPANY: ${company.name}`);
    console.log(`ID: ${company._id}`);
    console.log(`FACILITIES: ${companyFacilities.length}`);

    for (const facility of companyFacilities) {
      console.log(`  - ${facility.name} [${facility.facilityId}]`);
    }

    console.log("");
  }

  const linkedIds = new Set(
    companies.map(company => String(company._id))
  );

  const unlinked = facilities.filter(
    facility => !linkedIds.has(String(facility.clientGroupId))
  );

  console.log("=== SUMMARY ===");
  console.log("Companies:", companies.length);
  console.log("Facilities:", facilities.length);
  console.log("Facilities without a matching company:", unlinked.length);

  if (unlinked.length) {
    for (const facility of unlinked) {
      console.log(`UNLINKED: ${facility.name} [${facility.facilityId}]`);
    }
  }
} finally {
  await mongoose.disconnect();
}
