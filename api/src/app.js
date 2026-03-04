require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const geoRoutes = require('./routes/geo');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors({ origin: true }));
app.use(express.json());

app.use('/api/login', authRoutes);
app.use('/api/geo', geoRoutes);

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
