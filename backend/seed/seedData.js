require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const Offer = require('../models/Offer');
const KnowledgeDoc = require('../models/KnowledgeDoc');
const sampleData = require('./sampleData.json');

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI is not set in environment variables.');
      process.exit(1);
    }

    console.log('⏳ Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB Atlas.');

    console.log('🧹 Clearing existing collections...');
    await Promise.all([
      Category.deleteMany({}),
      MenuItem.deleteMany({}),
      Offer.deleteMany({}),
      KnowledgeDoc.deleteMany({})
    ]);

    console.log('🌱 Seeding categories...');
    const createdCategories = await Category.insertMany(sampleData.categories);
    const categoryMap = {};
    createdCategories.forEach(cat => {
      categoryMap[cat.slug] = cat._id;
    });

    console.log('🌱 Seeding menu items...');
    const menuItemsWithCategoryIds = sampleData.menuItems.map(item => ({
      ...item,
      categoryId: categoryMap[item.categorySlug] || createdCategories[0]._id
    }));
    await MenuItem.insertMany(menuItemsWithCategoryIds);

    console.log('🌱 Seeding offers & coupons...');
    await Offer.insertMany(sampleData.offers);

    console.log('🌱 Seeding AI knowledge documents...');
    await KnowledgeDoc.insertMany(sampleData.knowledgeDocs);

    console.log('🎉 Database seeding completed successfully!');
    console.log(`   - Categories: ${sampleData.categories.length}`);
    console.log(`   - Menu Items: ${sampleData.menuItems.length}`);
    console.log(`   - Offers: ${sampleData.offers.length}`);
    console.log(`   - Knowledge Docs: ${sampleData.knowledgeDocs.length}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding Error:', error);
    process.exit(1);
  }
};

seedDatabase();
