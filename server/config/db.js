import mongoose from "mongoose";

const syncIndexesSafely = async () => {
  try {
    const collections = await mongoose.connection.db
      .listCollections({ name: "books" })
      .toArray();

    if (collections.length > 0) {
      const bookIndexes = await mongoose.connection.db
        .collection("books")
        .indexes();

      const hasOldIsbnIndex = bookIndexes.some((idx) => idx.name === "isbn_1");

      if (hasOldIsbnIndex) {
        console.log("Migrating database index: dropping old global isbn_1 index...");
        await mongoose.connection.db.collection("books").dropIndex("isbn_1");
        console.log("Successfully dropped legacy isbn_1 index.");
      }
    }
  } catch (indexErr) {
    console.warn(
      "Index migration warning (safe to ignore if indexes are already synced):",
      indexErr.message
    );
  }
};

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/bookhive";
    const conn = await mongoose.connect(uri);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    await syncIndexesSafely();
  } catch (error) {
    console.error("❌ Database Connection Failed");
    console.error(error.message);
    process.exit(1);
  }
};

export default connectDB;