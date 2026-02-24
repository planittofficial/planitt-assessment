import connectDB from "./config/db";

async function testDB() {
  try {
    await connectDB();
    console.log("🟢 MongoDB Connection Successful");
    process.exit(0);
  } catch (error) {
    console.error("🔴 DB Connection Failed:", error);
    process.exit(1);
  }
}

testDB();
