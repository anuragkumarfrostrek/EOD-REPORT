require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { query } = require('./config/db');

const authRoutes = require('./routes/auth.routes');
const projectRoutes = require('./routes/project.routes');
const reportRoutes = require('./routes/report.routes');

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/reports', reportRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'disconnected', error: err.message });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Run database migrations
const runMigration = async () => {
  try {
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    for (const file of files) {
      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await query(sql);
    }
    console.log('✅ Database migrations completed successfully');
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    // Don't exit – tables might already exist
  }
};

// Schedule a job at midnight daily to perform background checks
cron.schedule('0 0 * * *', async () => {
  console.log('⏰ Midnight Cron Job: Performing daily checks...');
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    const res = await query(
      'SELECT COUNT(*) as count FROM reports WHERE report_date = $1',
      [dateStr]
    );
    console.log(`📊 Reports submitted for ${dateStr}: ${res.rows[0].count}`);
  } catch (err) {
    console.error('❌ Cron job error:', err.message);
  }
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await runMigration();
  app.listen(PORT, () => {
    console.log(`🚀 EOD Backend running on http://localhost:${PORT}`);
    console.log(`📊 API Health: http://localhost:${PORT}/api/health`);
  });
};

startServer();
