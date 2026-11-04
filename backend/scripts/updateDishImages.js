require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const MenuItem = require('../models/MenuItem');
const sampleData = require('../seed/sampleData.json');

/**
 * Targeted Dish Image Updater for RESTOSMART
 *
 * Safely updates ONLY the 'image' field for existing MenuItem documents in MongoDB.
 * Matches by exact dish name.
 * Preserves all other fields (price, description, categories, availability, tags, ratings).
 * Does NOT touch other collections (Categories, Orders, Reservations, Offers, KnowledgeDocs).
 */

// Specific image mappings to correct
const IMAGE_CORRECTIONS = {
  'Butter Naan': '/images/dishes/butter-naan.jpg',
  'Gobi Manchurian': '/images/dishes/gobi-manchurian.jpg',
  'Gulab Jamun (2 Pcs)': '/images/dishes/gulab-jamun.jpg',
  "Sizzling S'mores Brownie": 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=600&h=400&fit=crop',
};

const runTargetedImageUpdate = async (isDryRun = false) => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI is not set in environment variables.');
    process.exit(1);
  }

  try {
    console.log('⏳ Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB Atlas.\n');

    console.log(`🔍 Scanning MenuItems for image updates (${isDryRun ? 'DRY-RUN MODE' : 'LIVE EXECUTION'})...\n`);

    const dishesToProcess = Object.keys(IMAGE_CORRECTIONS);
    const plan = [];

    for (const dishName of dishesToProcess) {
      const targetImage = IMAGE_CORRECTIONS[dishName];
      const existingDoc = await MenuItem.findOne({ name: dishName });

      if (!existingDoc) {
        plan.push({
          dishName,
          status: 'NOT_FOUND',
          currentImage: 'N/A',
          targetImage,
          action: 'Skip (Document not in DB)'
        });
        continue;
      }

      if (existingDoc.image === targetImage) {
        plan.push({
          dishName,
          status: 'ALREADY_MATCHED',
          currentImage: existingDoc.image,
          targetImage,
          action: 'No change required'
        });
      } else {
        plan.push({
          dishName,
          status: 'NEEDS_UPDATE',
          id: existingDoc._id,
          currentImage: existingDoc.image,
          targetImage,
          action: 'Update image field only'
        });
      }
    }

    console.log('📋 AUDIT & EXECUTION PLAN:');
    console.log('========================================================================================');
    plan.forEach((item, index) => {
      console.log(`[${index + 1}] Dish: "${item.dishName}"`);
      console.log(`    Status:        ${item.status}`);
      console.log(`    Current Image: ${item.currentImage}`);
      console.log(`    Target Image:  ${item.targetImage}`);
      console.log(`    Action:        ${item.action}`);
      console.log('----------------------------------------------------------------------------------------');
    });

    const updateCandidates = plan.filter(p => p.status === 'NEEDS_UPDATE');
    console.log(`\nSummary: ${updateCandidates.length} item(s) pending image update out of ${dishesToProcess.length} audited.`);

    if (isDryRun) {
      console.log('\n🔒 DRY RUN COMPLETE: No modifications were made to the database.');
    } else {
      if (updateCandidates.length === 0) {
        console.log('\n✨ Database is already up to date. No writes performed.');
      } else {
        console.log('\n🚀 Applying updates to MongoDB Atlas...');
        for (const candidate of updateCandidates) {
          const result = await MenuItem.updateOne(
            { _id: candidate.id },
            { $set: { image: candidate.targetImage } }
          );
          console.log(`  ✓ Updated "${candidate.dishName}" (matched: ${result.matchedCount}, modified: ${result.modifiedCount})`);
        }
        console.log('\n🎉 Image field update completed successfully!');
      }
    }

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB Atlas.');
    return plan;
  } catch (error) {
    console.error('❌ Script Error:', error);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
};

// Check for --dry-run CLI argument or default to dry-run
const isDryRunArg = process.argv.includes('--dry-run') || !process.argv.includes('--execute');

if (require.main === module) {
  runTargetedImageUpdate(isDryRunArg);
}

module.exports = { runTargetedImageUpdate, IMAGE_CORRECTIONS };
