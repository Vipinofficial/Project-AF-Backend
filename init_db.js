const db = require('./db');

async function initDB() {
  console.log('🚀 Starting Supabase PostgreSQL Database Initialization & Seeding...');

  try {
    // 1. Create Users Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(20) UNIQUE NOT NULL,
        role VARCHAR(20) NOT NULL,
        name JSONB NOT NULL,
        shop_name JSONB,
        pincode VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Users table created/verified');

    // 2. Create Listings Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS listings (
        id SERIAL PRIMARY KEY,
        cat VARCHAR(20) NOT NULL,
        price NUMERIC(10,2) NOT NULL,
        base VARCHAR(30) DEFAULT '#39597B',
        acc VARCHAR(30) DEFAULT '#48688A',
        img TEXT,
        sponsored BOOLEAN DEFAULT false,
        rating VARCHAR(10) DEFAULT '4.9',
        reviews INTEGER DEFAULT 12,
        pincode VARCHAR(10) NOT NULL,
        measurable BOOLEAN DEFAULT false,
        name JSONB NOT NULL,
        shop JSONB NOT NULL,
        desc_text JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Listings table created/verified');

    // 3. Create Orders Table
    await db.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(30) PRIMARY KEY,
        cust_name JSONB NOT NULL,
        item_name JSONB NOT NULL,
        qty INTEGER DEFAULT 1,
        amt NUMERIC(10,2) NOT NULL,
        meas BOOLEAN DEFAULT false,
        status INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✓ Orders table created/verified');

    // Clear existing rows for fresh real database seeding
    await db.query('TRUNCATE TABLE users, listings, orders RESTART IDENTITY CASCADE;');

    // 4. Seed Demo Accounts
    console.log('🌱 Seeding real demo accounts into Supabase Postgres...');
    
    // Demo Customer
    await db.query(`
      INSERT INTO users (phone, role, name, pincode) VALUES
      ('9876543210', 'customer', '{"en": "Priya Sharma", "hi": "प्रिया शर्मा"}', '221001');
    `);

    // Demo Merchants
    await db.query(`
      INSERT INTO users (phone, role, name, shop_name, pincode) VALUES
      ('9812345678', 'merchant', '{"en": "Ramesh Kumar", "hi": "रमेश कुमार"}', '{"en": "Varanasi Vastra Bhandar", "hi": "बनारस वस्त्र भंडार"}', '221001'),
      ('9823456789', 'merchant', '{"en": "Sunita Verma", "hi": "सुनीता वर्मा"}', '{"en": "Jaipur Heritage Boutique", "hi": "जयपुर हेरिटेज बुटीक"}', '302001'),
      ('9834567890', 'merchant', '{"en": "Vikram Singh", "hi": "विक्रम सिंह"}', '{"en": "Royal Cut Tailors", "hi": "रॉयल कट टेलर्स"}', '110001');
    `);

    // 5. Seed Real Products & Services
    console.log('🌱 Seeding real products and custom tailoring services into Supabase Postgres...');
    await db.query(`
      INSERT INTO listings (cat, price, base, acc, img, sponsored, rating, reviews, pincode, measurable, name, shop, desc_text) VALUES
      (
        'service', 350.00, '#7A2E4D', '#E9A23B', '/stock_kurta.png', true, '4.8', 14, '221001', true,
        '{"en": "Kurta Custom Tailor Stitching", "hi": "कुर्ता कस्टम सिलाई"}',
        '{"en": "Varanasi Vastra Bhandar", "hi": "बनारस वस्त्र भंडार"}',
        '{"en": "Traditional Banarasi style bespoke tailor stitching for men & women.", "hi": "पारंपरिक बनारसी शैली कस्टम सिलाई।"}'
      ),
      (
        'fabric', 450.00, '#2A3B66', '#C2492F', '/stock_banarasi.png', true, '4.9', 28, '221001', false,
        '{"en": "Banarasi Gold Zari Silk Fabric", "hi": "बनारसी जरी सिल्क कपड़ा"}',
        '{"en": "Meera Fabrics & Textiles", "hi": "मीरा फैब्रिक्स"}'
        ,
        '{"en": "Authentic Banarasi woven silk cloth with intricate golden floral motifs.", "hi": "प्रामाणिक बनारसी जरी सिल्क कपड़ा।"}'
      ),
      (
        'garment', 2890.00, '#7A1C28', '#D4AF37', '/stock_anarkali.png', false, '4.9', 35, '302001', true,
        '{"en": "Royal Maroon Anarkali Suit", "hi": "रॉयल अनारकली सूट"}',
        '{"en": "Jaipur Heritage Boutique", "hi": "जयपुर हेरिटेज बुटीक"}',
        '{"en": "Hand-embroidered heavy zardozi Anarkali suit set with matching dupatta.", "hi": "हाथ से कढ़ाई किया हुआ भारी अनारकली सूट।"}'
      ),
      (
        'service', 1200.00, '#39597B', '#48688A', '/stock_kurta.png', false, '4.7', 19, '110001', true,
        '{"en": "Indo-Western Sherwani Stitching", "hi": "इंडो-वेस्टर्न शेरवानी सिलाई"}',
        '{"en": "Royal Cut Tailors", "hi": "रॉयल कट टेलर्स"}',
        '{"en": "Bespoke fitting and doorstep measurement for groom sherwanis.", "hi": "दूल्हे की शेरवानी के लिए बेस्पोक फिटिंग।"}'
      );
    `);

    // 6. Seed Real Orders
    console.log('🌱 Seeding initial marketplace orders...');
    await db.query(`
      INSERT INTO orders (id, cust_name, item_name, qty, amt, meas, status) VALUES
      (
        'ARL-2412',
        '{"en": "Priya Sharma", "hi": "प्रिया शर्मा"}',
        '{"en": "Kurta Custom Tailor Stitching", "hi": "कुर्ता कस्टम सिलाई"}',
        1, 350.00, true, 0
      ),
      (
        'ARL-2409',
        '{"en": "Sneha Das", "hi": "स्नेहा दास"}',
        '{"en": "Royal Maroon Anarkali Suit", "hi": "रॉयल अनारकली सूट"}',
        1, 2890.00, true, 1
      ),
      (
        'ARL-2398',
        '{"en": "Rahul Malhotra", "hi": "राहुल मल्होत्रा"}',
        '{"en": "Indo-Western Sherwani Stitching", "hi": "इंडो-वेस्टर्न शेरवानी सिलाई"}',
        1, 1200.00, true, 2
      );
    `);

    console.log('🎉 Supabase PostgreSQL Database Initialized and Seeded Successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Database Initialization Failed:', err);
    process.exit(1);
  }
}

initDB();
