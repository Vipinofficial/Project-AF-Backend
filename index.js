const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const db = require('./db');

const app = express();
const PORT = env.PORT;

// An open CORS policy is fine on localhost and reckless in production: it lets
// any site on the internet call this API with a user's credentials. In
// production an explicit allowlist is required, and boot fails without one
// rather than silently falling back to open.
if (env.IS_PRODUCTION) {
  if (env.CORS_ORIGINS.length === 0) {
    throw new Error(
      'CORS_ORIGINS must list the allowed origins in production, ' +
      'e.g. https://arli.in,https://business.arli.in'
    );
  }
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
} else {
  app.use(cors());
}
app.use(express.json());

// Basic health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({
      status: 'ok',
      message: 'ARLI Backend connected to Supabase PostgreSQL',
      dbTime: result.rows[0].now,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// GET /api/listings - Fetch all listings from Supabase Postgres
app.get('/api/listings', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM listings ORDER BY id DESC');
    // Map DB fields for frontend contract
    const formatted = result.rows.map((row) => ({
      id: row.id,
      cat: row.cat,
      price: Number(row.price),
      base: row.base,
      acc: row.acc,
      img: row.img,
      sponsored: row.sponsored,
      rating: row.rating,
      reviews: row.reviews,
      pincode: row.pincode,
      measurable: row.measurable,
      lat: row.lat === null ? undefined : Number(row.lat),
      lng: row.lng === null ? undefined : Number(row.lng),
      name: row.name,
      shop: row.shop,
      desc: row.desc_text,
    }));
    res.json(formatted);
  } catch (err) {
    console.error('Error fetching listings:', err);
    res.status(500).json({ error: 'Failed to fetch listings from database' });
  }
});

// POST /api/listings - Create new listing in Supabase Postgres
app.post('/api/listings', async (req, res) => {
  try {
    const { cat, price, base, acc, img, sponsored, rating, reviews, pincode, measurable, lat, lng, name, shop, desc } = req.body;
    const result = await db.query(
      `INSERT INTO listings (cat, price, base, acc, img, sponsored, rating, reviews, pincode, measurable, lat, lng, name, shop, desc_text)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        cat || 'fabric',
        price || 0,
        base || '#39597B',
        acc || '#48688A',
        img || '/stock_kurta.png',
        sponsored || false,
        rating || '5.0',
        reviews || 0,
        pincode || '221001',
        measurable || false,
        lat ?? null,
        lng ?? null,
        JSON.stringify(name || { en: 'New Item', hi: 'नया आइटम' }),
        JSON.stringify(shop || { en: 'Local Merchant', hi: 'स्थानीय व्यापारी' }),
        JSON.stringify(desc || { en: 'Product description', hi: 'उत्पाद विवरण' }),
      ]
    );

    const row = result.rows[0];
    res.status(201).json({
      id: row.id,
      cat: row.cat,
      price: Number(row.price),
      base: row.base,
      acc: row.acc,
      img: row.img,
      sponsored: row.sponsored,
      rating: row.rating,
      reviews: row.reviews,
      pincode: row.pincode,
      measurable: row.measurable,
      lat: row.lat === null ? undefined : Number(row.lat),
      lng: row.lng === null ? undefined : Number(row.lng),
      name: row.name,
      shop: row.shop,
      desc: row.desc_text,
    });
  } catch (err) {
    console.error('Error inserting listing:', err);
    res.status(500).json({ error: 'Failed to insert listing into database' });
  }
});

// GET /api/orders - Fetch orders from Supabase Postgres
app.get('/api/orders', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM orders ORDER BY created_at DESC');
    const formatted = result.rows.map((row) => ({
      id: row.id,
      cust: row.cust_name,
      item: row.item_name,
      qty: row.qty,
      amt: Number(row.amt),
      meas: row.meas,
      status: row.status,
    }));
    res.json(formatted);
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ error: 'Failed to fetch orders from database' });
  }
});

// POST /api/orders - Create new order in Supabase Postgres
app.post('/api/orders', async (req, res) => {
  try {
    const { cust, item, qty, amt, meas, status } = req.body;
    const orderId = `ARL-${Math.floor(1000 + Math.random() * 9000)}`;

    const result = await db.query(
      `INSERT INTO orders (id, cust_name, item_name, qty, amt, meas, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        orderId,
        JSON.stringify(cust || { en: 'Customer', hi: 'ग्राहक' }),
        JSON.stringify(item || { en: 'Order Item', hi: 'ऑर्डर आइटम' }),
        qty || 1,
        amt || 0,
        meas || false,
        status || 0,
      ]
    );

    const row = result.rows[0];
    res.status(201).json({
      id: row.id,
      cust: row.cust_name,
      item: row.item_name,
      qty: row.qty,
      amt: Number(row.amt),
      meas: row.meas,
      status: row.status,
    });
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ error: 'Failed to create order in database' });
  }
});

// POST /api/auth/demo-login - Fetch or create real user account in Supabase Postgres
app.post('/api/auth/demo-login', async (req, res) => {
  try {
    const { phone, role = 'customer' } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    let result = await db.query('SELECT * FROM users WHERE phone = $1', [phone]);
    if (result.rows.length === 0) {
      result = await db.query(
        `INSERT INTO users (phone, role, name, pincode)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          phone,
          role,
          JSON.stringify({ en: `User ${phone.slice(-4)}`, hi: `उपयोगकर्ता ${phone.slice(-4)}` }),
          '221001',
        ]
      );
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error in demo-login:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

app.listen(PORT, env.HOST, () => {
  console.log(`ARLI API listening on ${env.HOST}:${PORT} (${env.NODE_ENV})`);
  if (env.IS_PRODUCTION) {
    console.log(`CORS allowlist: ${env.CORS_ORIGINS.join(', ')}`);
  }
});
