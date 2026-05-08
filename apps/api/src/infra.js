const { Pool } = require('pg');
const { S3Client } = require('@aws-sdk/client-s3');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || '145.223.34.99',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'viralforge',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
});

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT || 'http://145.223.34.99:9000',
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.S3_SECRET_KEY || 'minioadmin',
  },
  forcePathStyle: true,
});

const BUCKET = process.env.S3_BUCKET || 'viralforge';
const BUCKET_URL = process.env.S3_BUCKET_URL || 'http://145.223.34.99:9000/viralforge';

async function initDB() {
  const client = await pool.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS viral_jobs (
      id SERIAL PRIMARY KEY,
      job_id VARCHAR(255) UNIQUE,
      user_id VARCHAR(255),
      job_type VARCHAR(50),
      status VARCHAR(20) DEFAULT 'pending',
      input_data JSONB,
      output_url TEXT,
      runway_task_id VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  client.release();
}

module.exports = { pool, s3, BUCKET, BUCKET_URL, initDB };