require('dotenv').config()
const bcrypt = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')
const db = require('./database')

console.log('Seeding database...')

// ── Admin user ──────────────────────────────────────────────────────────────
const existing = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@autopips.com')
if (!existing) {
  const hash = bcrypt.hashSync('Admin@12345', 12)
  db.prepare(`INSERT INTO users (id, email, name, password_hash, role, tier, kyc_level, email_verified, onboarding_complete)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)`)
    .run(uuidv4(), 'admin@autopips.com', 'Platform Admin', hash, 'SUPER_ADMIN', 'PLATINUM', 'FULL')
  console.log('✓ Admin user created: admin@autopips.com / Admin@12345')
} else {
  console.log('✓ Admin user already exists')
}

// ── Payment methods ──────────────────────────────────────────────────────────
const methods = [
  { coin: 'BTC',  network: 'Bitcoin',  address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', label: 'Bitcoin (BTC)' },
  { coin: 'ETH',  network: 'ERC-20',   address: '0x742d35Cc6634C0532925a3b8D4C9C1B63c4B45E', label: 'Ethereum (ETH)' },
  { coin: 'USDT', network: 'TRC-20',   address: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE', label: 'USDT (TRC-20)' },
  { coin: 'USDT', network: 'ERC-20',   address: '0x742d35Cc6634C0532925a3b8D4C9C1B63c4B45E', label: 'USDT (ERC-20)' },
]
for (const m of methods) {
  const ex = db.prepare('SELECT id FROM payment_methods WHERE coin = ? AND network = ?').get(m.coin, m.network)
  if (!ex) db.prepare('INSERT INTO payment_methods (id, coin, network, address, label) VALUES (?, ?, ?, ?, ?)').run(uuidv4(), m.coin, m.network, m.address, m.label)
}
console.log('✓ Payment methods ready')

// ── Platform settings ────────────────────────────────────────────────────────
const settings = [
  ['withdrawal_cooldown_hours', '24'],
  ['min_deposit_usd', '10'],
  ['min_withdrawal_usd', '20'],
  ['maintenance_mode', '0'],
  ['video_rate_default', '25.00'],
  ['ad_management_rate_default', '50.00'],
  ['ai_token_rate', '0.10'],
]
for (const [key, value] of settings) {
  db.prepare('INSERT OR IGNORE INTO platform_settings (key, value) VALUES (?, ?)').run(key, value)
}
console.log('✓ Platform settings ready')

// ── Sample products ──────────────────────────────────────────────────────────
const sampleProducts = [
  {
    name: 'Wireless Noise-Cancelling Earbuds Pro',
    short_desc: 'Premium ANC earbuds with 30hr battery life',
    description: 'High-fidelity stereo sound with active noise cancellation. IPX5 water resistant. Compatible with all Bluetooth 5.0 devices. Comes with charging case.',
    category: 'Electronics',
    cost: '8.50', suggested_price: '34.99', profit_margin: '76',
    supplier_name: 'TechSupply Co.', supplier_country: 'China',
    shipping_estimate: 'ePacket', shipping_days_min: 7, shipping_days_max: 15,
    opportunity_score: 92, is_trending: 1, is_featured: 1,
    tags: JSON.stringify(['wireless','earbuds','audio','trending']),
    images: JSON.stringify(['/img/products/earbuds.jpg']),
  },
  {
    name: 'Portable LED Desk Lamp with USB Charging',
    short_desc: 'Foldable study lamp with wireless phone charger',
    description: 'Multi-angle LED desk lamp with 3 color temperatures and 5 brightness levels. Built-in Qi wireless charger pad. USB-C output port.',
    category: 'Home & Office',
    cost: '6.20', suggested_price: '29.99', profit_margin: '79',
    supplier_name: 'HomeGoods Direct', supplier_country: 'China',
    shipping_estimate: 'Standard Air', shipping_days_min: 10, shipping_days_max: 21,
    opportunity_score: 85, is_trending: 0, is_featured: 1,
    tags: JSON.stringify(['lamp','home','office','wireless charging']),
    images: JSON.stringify(['/img/products/lamp.jpg']),
  },
  {
    name: 'Smart Fitness Resistance Bands Set (5-Pack)',
    short_desc: 'Progressive resistance bands for home workouts',
    description: 'Set of 5 latex resistance bands with progressive resistance from 5–50 lbs. Includes carry bag and exercise guide. Suitable for all fitness levels.',
    category: 'Health & Fitness',
    cost: '4.80', suggested_price: '24.99', profit_margin: '81',
    supplier_name: 'FitGear Wholesale', supplier_country: 'China',
    shipping_estimate: 'ePacket', shipping_days_min: 8, shipping_days_max: 18,
    opportunity_score: 88, is_trending: 1, is_featured: 0,
    tags: JSON.stringify(['fitness','gym','resistance bands','home workout']),
    images: JSON.stringify(['/img/products/bands.jpg']),
  },
  {
    name: 'Collagen Glow Vitamin C Serum',
    short_desc: '20% Vitamin C brightening face serum',
    description: 'Professional-grade 20% Vitamin C serum with hyaluronic acid and collagen peptides. Brightens skin, reduces dark spots, and boosts collagen production.',
    category: 'Beauty & Skincare',
    cost: '3.90', suggested_price: '22.99', profit_margin: '83',
    supplier_name: 'BeautyLab Supplies', supplier_country: 'South Korea',
    shipping_estimate: 'Air Mail', shipping_days_min: 10, shipping_days_max: 20,
    opportunity_score: 94, is_trending: 1, is_featured: 1,
    tags: JSON.stringify(['skincare','vitamin c','serum','beauty']),
    images: JSON.stringify(['/img/products/serum.jpg']),
  },
  {
    name: 'Foldable Pet Car Seat Barrier',
    short_desc: 'Universal SUV/sedan pet travel divider',
    description: 'Universal-fit foldable mesh barrier keeps pets safely in the back seat. Fits most cars and SUVs. Easy installation with adjustable straps.',
    category: 'Pet Supplies',
    cost: '7.10', suggested_price: '32.99', profit_margin: '78',
    supplier_name: 'PetWorld Supply', supplier_country: 'China',
    shipping_estimate: 'Standard Air', shipping_days_min: 12, shipping_days_max: 25,
    opportunity_score: 80, is_trending: 0, is_featured: 0,
    tags: JSON.stringify(['pets','car','travel','dogs']),
    images: JSON.stringify(['/img/products/pet-barrier.jpg']),
  },
  {
    name: 'Minimalist Stainless Steel Water Bottle 1L',
    short_desc: 'Double-wall vacuum insulated, keeps cold 24hr',
    description: 'BPA-free 1-litre vacuum insulated stainless steel bottle. Keeps drinks cold for 24 hours or hot for 12 hours. Leakproof lid. Available in 6 colours.',
    category: 'Kitchen & Dining',
    cost: '5.50', suggested_price: '26.99', profit_margin: '80',
    supplier_name: 'EcoGoods Trading', supplier_country: 'China',
    shipping_estimate: 'ePacket', shipping_days_min: 8, shipping_days_max: 16,
    opportunity_score: 86, is_trending: 0, is_featured: 1,
    tags: JSON.stringify(['bottle','kitchen','eco','hydration']),
    images: JSON.stringify(['/img/products/bottle.jpg']),
  },
  {
    name: 'Kids Learning Tablet — 32GB (7-inch)',
    short_desc: 'Parental-control educational Android tablet',
    description: 'Android-based 7-inch tablet designed for children aged 3-10. 32GB storage, 2MP front/rear cameras, parental control app, 5000mAh battery. Durable shockproof case included.',
    category: 'Kids & Toys',
    cost: '28.00', suggested_price: '79.99', profit_margin: '65',
    supplier_name: 'TechKids Global', supplier_country: 'China',
    shipping_estimate: 'DHL Express', shipping_days_min: 5, shipping_days_max: 10,
    opportunity_score: 78, is_trending: 0, is_featured: 0,
    tags: JSON.stringify(['kids','tablet','education','toys']),
    images: JSON.stringify(['/img/products/tablet.jpg']),
  },
  {
    name: 'Portable Blender Bottle (USB Rechargeable)',
    short_desc: 'Make smoothies anywhere — 400ml USB blender',
    description: 'Compact 400ml personal blender with USB-C charging. 6-blade stainless steel cutter. BPA-free Tritan bottle doubles as a travel cup. 15-second blend cycle.',
    category: 'Kitchen & Dining',
    cost: '9.20', suggested_price: '39.99', profit_margin: '77',
    supplier_name: 'HomeAppliance Direct', supplier_country: 'China',
    shipping_estimate: 'ePacket', shipping_days_min: 9, shipping_days_max: 18,
    opportunity_score: 91, is_trending: 1, is_featured: 1,
    tags: JSON.stringify(['blender','kitchen','fitness','smoothie']),
    images: JSON.stringify(['/img/products/blender.jpg']),
  },
]

for (const p of sampleProducts) {
  const ex = db.prepare('SELECT id FROM products WHERE name = ?').get(p.name)
  if (!ex) {
    db.prepare(`INSERT INTO products (id, name, short_desc, description, category, images, cost, suggested_price, profit_margin, supplier_name, supplier_country, shipping_estimate, shipping_days_min, shipping_days_max, opportunity_score, is_trending, is_featured, tags, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`).run(
      uuidv4(), p.name, p.short_desc, p.description, p.category, p.images,
      p.cost, p.suggested_price, p.profit_margin, p.supplier_name, p.supplier_country,
      p.shipping_estimate, p.shipping_days_min, p.shipping_days_max,
      p.opportunity_score, p.is_trending, p.is_featured, p.tags
    )
  }
}
console.log('✓ Sample products seeded')

// ── Sample strategies ────────────────────────────────────────────────────────
const sampleStrategies = [
  {
    name: 'Beauty on a Budget — Skincare Starter',
    niche: 'Beauty & Skincare', target_country: 'United States', target_audience: 'Women aged 18–35 interested in affordable skincare',
    description: 'A low-cost entry into the high-demand skincare niche. Focus on vitamin C serums, face masks, and moisturisers with strong TikTok visual appeal.',
    estimated_budget: '200', suggested_ad_budget: '50',
    recommended_platforms: JSON.stringify(['TikTok','Instagram']),
    marketing_strategy: 'Short TikTok before/after skincare videos. Partner with micro-influencers (10K–50K). Post 3x per week.',
    seo_strategy: 'Target long-tail keywords: "affordable vitamin c serum", "best drugstore skincare". Optimize product descriptions.',
    social_strategy: 'TikTok: daily product demos. Instagram: aesthetic flat-lay photos. Pinterest: skincare routines.',
    setup_instructions: '1. Add Vitamin C Serum and face mask products. 2. Set up TikTok business account with agent. 3. Fund $50 ad budget. 4. Launch first TikTok video ad.',
    difficulty: 'BEGINNER', is_featured: 1, tags: JSON.stringify(['beauty','skincare','tiktok','beginner']),
  },
  {
    name: 'Home Office Upgrade — WFH Essentials',
    niche: 'Home & Office', target_country: 'United Kingdom', target_audience: 'Remote workers and students aged 22–45',
    description: 'Capitalise on the permanent work-from-home shift. Sell practical desk accessories, lighting, and organisation products to professionals setting up home offices.',
    estimated_budget: '350', suggested_ad_budget: '100',
    recommended_platforms: JSON.stringify(['Facebook','Instagram','Pinterest']),
    marketing_strategy: 'Facebook carousel ads targeting remote workers. Pinterest boards for home office inspiration. Instagram reels of setup transformations.',
    seo_strategy: 'Blog: "Best home office setup 2024". Product SEO: "LED desk lamp with wireless charger". Google Shopping ads.',
    social_strategy: 'Pinterest: home office inspiration pins. Instagram: before/after office setups. YouTube: desk setup tours.',
    setup_instructions: '1. Add Desk Lamp and Water Bottle products. 2. Set up Facebook Business account. 3. Create Pinterest business profile. 4. Launch Google Shopping campaign.',
    difficulty: 'INTERMEDIATE', is_featured: 1, tags: JSON.stringify(['home office','wfh','productivity','intermediate']),
  },
  {
    name: 'Fitness at Home — Gym Equipment Bundle',
    niche: 'Health & Fitness', target_country: 'Australia', target_audience: 'Health-conscious adults aged 25–40 building home gyms',
    description: 'Target the growing home fitness market. Bundle resistance bands, yoga accessories, and portable equipment for people who want gym results at home.',
    estimated_budget: '300', suggested_ad_budget: '75',
    recommended_platforms: JSON.stringify(['Instagram','TikTok','YouTube']),
    marketing_strategy: 'Instagram workout reels featuring products. YouTube tutorial videos. Influencer seeding to fitness accounts.',
    seo_strategy: 'Target: "home gym equipment Australia", "resistance bands for beginners". Blog: workout guides using products.',
    social_strategy: 'Instagram: daily workout content. TikTok: 60-second workout challenges. YouTube: longer workout tutorials.',
    setup_instructions: '1. Add resistance bands and fitness accessories. 2. Create Instagram fitness brand. 3. Partner with local fitness influencer via agent. 4. Launch Instagram ads.',
    difficulty: 'BEGINNER', is_featured: 0, tags: JSON.stringify(['fitness','health','home gym','beginner']),
  },
  {
    name: 'Kids Tech — Educational Gadgets',
    niche: 'Kids & Toys', target_country: 'United States', target_audience: 'Parents with children aged 3–12',
    description: 'Parents are willing to invest in educational technology for their children. Focus on learning tablets, STEM toys, and creative tools that justify premium pricing.',
    estimated_budget: '500', suggested_ad_budget: '150',
    recommended_platforms: JSON.stringify(['Facebook','Instagram','Pinterest']),
    marketing_strategy: 'Facebook parent community targeting. YouTube toy review channels. Back-to-school seasonal campaigns.',
    seo_strategy: 'Target: "educational toys for kids", "best learning tablet 2024". Gift guide SEO for holidays.',
    social_strategy: 'Facebook: parent groups and parenting pages. YouTube: unboxing and review content. Pinterest: gift ideas for kids.',
    setup_instructions: '1. Add Kids Tablet product. 2. Set up Facebook Business targeting parents. 3. Create back-to-school campaign. 4. Launch with agent-managed Facebook ads.',
    difficulty: 'INTERMEDIATE', is_featured: 0, tags: JSON.stringify(['kids','education','parents','technology']),
  },
]

for (const s of sampleStrategies) {
  const ex = db.prepare('SELECT id FROM strategies WHERE name = ?').get(s.name)
  if (!ex) {
    db.prepare(`INSERT INTO strategies (id, name, niche, target_country, target_audience, description, estimated_budget, suggested_ad_budget, recommended_platforms, marketing_strategy, seo_strategy, social_strategy, setup_instructions, difficulty, is_featured, tags, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`).run(
      uuidv4(), s.name, s.niche, s.target_country, s.target_audience, s.description,
      s.estimated_budget, s.suggested_ad_budget, s.recommended_platforms,
      s.marketing_strategy, s.seo_strategy, s.social_strategy, s.setup_instructions,
      s.difficulty, s.is_featured, s.tags
    )
  }
}
console.log('✓ Sample strategies seeded')

// ── Sample agents ────────────────────────────────────────────────────────────
const sampleAgents = [
  {
    name: 'Sarah Chen', avatar_initials: 'SC',
    bio: 'Full-service dropshipping manager with 5+ years experience scaling beauty and lifestyle stores. Specialize in TikTok content, product research, and Facebook ad campaigns.',
    expertise: JSON.stringify(['Product Research','TikTok Content','Facebook Ads','Store Setup']),
    niches: JSON.stringify(['Beauty','Fashion','Lifestyle','Health']),
    services: JSON.stringify(['Store Setup','Product Listing','Social Media Management','Video Creation','Ad Campaign Management','Order Monitoring']),
    languages: JSON.stringify(['English','Mandarin']),
    base_fee: '150.00', fee_period: 'MONTHLY', video_rate: '20.00', ad_management_rate: '45.00',
    rating: '4.9', review_count: 48, stores_managed: 12, is_verified: 1,
  },
  {
    name: 'James Okafor', avatar_initials: 'JO',
    bio: 'E-commerce growth specialist focused on the UK and African markets. Expert in SEO, Google Shopping, and product description writing. Helped 20+ stores reach their first $10K month.',
    expertise: JSON.stringify(['SEO Optimization','Google Ads','Product Descriptions','Market Research']),
    niches: JSON.stringify(['Electronics','Home Office','Pet Supplies','Sports']),
    services: JSON.stringify(['Product Listing','SEO Optimization','Google Ads Management','Market Research','Business Reporting']),
    languages: JSON.stringify(['English','Yoruba','French']),
    base_fee: '120.00', fee_period: 'MONTHLY', video_rate: '30.00', ad_management_rate: '55.00',
    rating: '4.8', review_count: 31, stores_managed: 8, is_verified: 1,
  },
  {
    name: 'Maria Santos', avatar_initials: 'MS',
    bio: 'Creative director and content strategist for dropshipping brands. Builds brand identities from scratch including social media accounts, visual identity, and content calendars.',
    expertise: JSON.stringify(['Brand Identity','Instagram Growth','Content Calendar','Influencer Outreach']),
    niches: JSON.stringify(['Fashion','Beauty','Kids','Home Decor']),
    services: JSON.stringify(['Social Media Account Setup','Brand Identity','Content Creation','Influencer Outreach','Instagram/TikTok Management','AI Video Creation']),
    languages: JSON.stringify(['English','Spanish','Portuguese']),
    base_fee: '130.00', fee_period: 'MONTHLY', video_rate: '18.00', ad_management_rate: '40.00',
    rating: '5.0', review_count: 22, stores_managed: 6, is_verified: 1,
  },
]

for (const a of sampleAgents) {
  const ex = db.prepare('SELECT id FROM agents WHERE name = ?').get(a.name)
  if (!ex) {
    db.prepare(`INSERT INTO agents (id, name, avatar_initials, bio, expertise, niches, services, languages, base_fee, fee_period, video_rate, ad_management_rate, rating, review_count, stores_managed, is_verified, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`).run(
      uuidv4(), a.name, a.avatar_initials, a.bio, a.expertise, a.niches, a.services, a.languages,
      a.base_fee, a.fee_period, a.video_rate, a.ad_management_rate,
      a.rating, a.review_count, a.stores_managed, a.is_verified
    )
  }
}
console.log('✓ Sample agents seeded')
console.log('\nSeed complete.')
