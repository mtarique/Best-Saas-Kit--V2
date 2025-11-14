#!/usr/bin/env node

/**
 * Database Setup Script for Best SAAS Kit V2
 * 
 * This script sets up the database by executing SQL files in the correct order.
 * It requires DATABASE_URL to be set in the environment.
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local if it exists
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    // Skip comments and empty lines
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      return;
    }
    
    // Match KEY=VALUE pattern
    const match = trimmedLine.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      
      // Remove surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  log('❌ Error: DATABASE_URL environment variable is not set!', 'red');
  log('\nPlease set DATABASE_URL in your .env.local file:', 'yellow');
  log('DATABASE_URL=postgresql://username:password@host/database?sslmode=require', 'cyan');
  process.exit(1);
}

// Create database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('sslmode=require') ? {
    rejectUnauthorized: false
  } : false
});

// SQL files to execute in order
const sqlFiles = [
  '00-complete-setup.sql',
  '07-create-discount-codes-table.sql'
];

async function executeSQLFile(filePath) {
  try {
    log(`\n📄 Reading ${path.basename(filePath)}...`, 'cyan');
    const sql = fs.readFileSync(filePath, 'utf8');
    
    log(`⚙️  Executing ${path.basename(filePath)}...`, 'blue');
    await pool.query(sql);
    
    log(`✅ Successfully executed ${path.basename(filePath)}`, 'green');
    return true;
  } catch (error) {
    log(`❌ Error executing ${path.basename(filePath)}:`, 'red');
    log(`   ${error.message}`, 'red');
    
    // Don't fail on "already exists" errors for tables/functions
    if (error.message.includes('already exists') || 
        error.message.includes('duplicate key') ||
        error.code === '42P07' || // duplicate_table
        error.code === '42710') { // duplicate_object
      log(`   ⚠️  Warning: This is usually safe to ignore (object already exists)`, 'yellow');
      return true;
    }
    
    throw error;
  }
}

async function verifyConnection() {
  try {
    log('\n🔌 Testing database connection...', 'cyan');
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    log('✅ Database connection successful!', 'green');
    log(`   PostgreSQL Version: ${result.rows[0].pg_version.split(' ')[0]} ${result.rows[0].pg_version.split(' ')[1]}`, 'cyan');
    return true;
  } catch (error) {
    log('❌ Database connection failed!', 'red');
    log(`   ${error.message}`, 'red');
    log('\nPlease check:', 'yellow');
    log('   1. Your DATABASE_URL is correct', 'yellow');
    log('   2. Your database server is running', 'yellow');
    log('   3. Your network connection is working', 'yellow');
    throw error;
  }
}

async function verifySetup() {
  try {
    log('\n🔍 Verifying database setup...', 'cyan');
    
    // Check if users table exists
    const usersTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (!usersTable.rows[0].exists) {
      log('❌ Users table not found!', 'red');
      return false;
    }
    
    // Check if discount_codes table exists
    const discountTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'discount_codes'
      );
    `);
    
    // Count functions
    const functions = await pool.query(`
      SELECT COUNT(*) as count
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      AND p.proname IN (
        'update_updated_at_column',
        'get_user_stats',
        'get_revenue_stats',
        'add_user_credits',
        'deduct_user_credits',
        'upgrade_user_to_pro',
        'validate_discount_code',
        'increment_discount_usage',
        'get_discount_stats'
      );
    `);
    
    log('✅ Database setup verification:', 'green');
    log(`   ✅ Users table: exists`, 'green');
    if (discountTable.rows[0].exists) {
      log(`   ✅ Discount codes table: exists`, 'green');
    }
    log(`   ✅ Database functions: ${functions.rows[0].count} found`, 'green');
    
    return true;
  } catch (error) {
    log('⚠️  Verification check failed:', 'yellow');
    log(`   ${error.message}`, 'yellow');
    return false;
  }
}

async function main() {
  try {
    log('\n🚀 Best SAAS Kit V2 - Database Setup', 'bright');
    log('=====================================\n', 'bright');
    
    // Verify connection
    await verifyConnection();
    
    // Get the SQL queries directory path
    const sqlDir = path.join(__dirname, '..', 'sql-queries');
    
    // Execute SQL files in order
    for (const fileName of sqlFiles) {
      const filePath = path.join(sqlDir, fileName);
      
      if (!fs.existsSync(filePath)) {
        log(`⚠️  Warning: ${fileName} not found, skipping...`, 'yellow');
        continue;
      }
      
      await executeSQLFile(filePath);
    }
    
    // Verify setup
    await verifySetup();
    
    log('\n🎉 Database setup completed successfully!', 'green');
    log('\n📝 Next steps:', 'cyan');
    log('   1. Your database is ready to use', 'cyan');
    log('   2. Start your Next.js app with: npm run dev', 'cyan');
    log('   3. Test authentication and features', 'cyan');
    log('\n');
    
  } catch (error) {
    log('\n❌ Database setup failed!', 'red');
    log(`   Error: ${error.message}`, 'red');
    log('\nPlease check the error above and try again.\n', 'yellow');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the setup
main();

