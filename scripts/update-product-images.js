/**
 * Updates products with Unsplash stock image URLs.
 * Uses specific photo IDs from Unsplash for clean, product-relevant images.
 */
const db = require('../db/database')

// Map product name fragment → [primary, secondary?] Unsplash photo IDs
const imageMap = [
  {
    match: 'Bluetooth 5.3 Wireless Earbuds',
    imgs: [
      'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&q=80',
      'https://images.unsplash.com/photo-1612444530582-fc66183b16f7?w=600&q=80',
    ]
  },
  {
    match: 'USB-C 100W GaN Charger',
    imgs: [
      'https://images.unsplash.com/photo-1588702547919-26089e690ecc?w=600&q=80',
    ]
  },
  {
    match: 'RGB Gaming Mouse Pad',
    imgs: [
      'https://images.unsplash.com/photo-1527814050087-3793815479db?w=600&q=80',
      'https://images.unsplash.com/photo-1593640495253-23196b27a87f?w=600&q=80',
    ]
  },
  {
    match: 'Portable Bluetooth Speaker',
    imgs: [
      'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600&q=80',
      'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&q=80',
    ]
  },
  {
    match: 'Smart Digital Alarm Clock',
    imgs: [
      'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=600&q=80',
    ]
  },
  {
    match: '4K Action Camera',
    imgs: [
      'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&q=80',
      'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=600&q=80',
    ]
  },
  {
    match: 'Electric Herb & Spice Grinder',
    imgs: [
      'https://images.unsplash.com/photo-1620574387735-3624d75b2dbc?w=600&q=80',
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80',
    ]
  },
  {
    match: 'Collapsible Silicone Food Storage',
    imgs: [
      'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=600&q=80',
    ]
  },
  {
    match: 'Magnetic Spice Rack',
    imgs: [
      'https://images.unsplash.com/photo-1556909172-54557c7e4fb7?w=600&q=80',
      'https://images.unsplash.com/photo-1457131760772-7017c6180f05?w=600&q=80',
    ]
  },
  {
    match: 'Vegetable Chopper',
    imgs: [
      'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&q=80',
      'https://images.unsplash.com/photo-1495195134817-aeb325a55b65?w=600&q=80',
    ]
  },
  {
    match: 'Self-Watering Indoor Plant Pot',
    imgs: [
      'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&q=80',
      'https://images.unsplash.com/photo-1491147334573-44cbb4602074?w=600&q=80',
    ]
  },
  {
    match: 'Bamboo Dish Drying Rack',
    imgs: [
      'https://images.unsplash.com/photo-1584208632869-05fa2b2a5934?w=600&q=80',
    ]
  },
  {
    match: 'Jade Roller & Gua Sha',
    imgs: [
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80',
      'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80',
    ]
  },
  {
    match: 'LED Light Therapy Face Mask',
    imgs: [
      'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=600&q=80',
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80',
    ]
  },
  {
    match: 'Electric Facial Cleansing Brush',
    imgs: [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80',
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80',
    ]
  },
  {
    match: 'Eyebrow Microblading Stamp',
    imgs: [
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80',
    ]
  },
  {
    match: 'Hair Growth Scalp Massager',
    imgs: [
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80',
      'https://images.unsplash.com/photo-1500840216050-6ffa99d75160?w=600&q=80',
    ]
  },
  {
    match: 'Adjustable Resistance Bands',
    imgs: [
      'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=600&q=80',
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80',
    ]
  },
  {
    match: 'Smart Jump Rope',
    imgs: [
      'https://images.unsplash.com/photo-1434596922112-19c563067271?w=600&q=80',
    ]
  },
  {
    match: 'Foam Roller',
    imgs: [
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&q=80',
    ]
  },
  {
    match: 'Non-Slip Yoga Mat',
    imgs: [
      'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?w=600&q=80',
      'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&q=80',
    ]
  },
  {
    match: 'Adjustable Dumbbell Handle',
    imgs: [
      'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80',
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80',
    ]
  },
  {
    match: 'Minimalist Mesh Watch',
    imgs: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
      'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=600&q=80',
    ]
  },
  {
    match: 'Canvas Tote Bag',
    imgs: [
      'https://images.unsplash.com/photo-1544816565-aa8c1166648f?w=600&q=80',
      'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=600&q=80',
    ]
  },
  {
    match: 'Polarised Sports Sunglasses',
    imgs: [
      'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&q=80',
      'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&q=80',
    ]
  },
  {
    match: 'Leather Card Holder Slim Wallet',
    imgs: [
      'https://images.unsplash.com/photo-1627123424574-724758594785?w=600&q=80',
      'https://images.unsplash.com/photo-1612345810986-7bd8dc32d9b8?w=600&q=80',
    ]
  },
  {
    match: 'Interactive Feather Wand Cat Toy',
    imgs: [
      'https://images.unsplash.com/photo-1548802673-380ab8ebc7b7?w=600&q=80',
      'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&q=80',
    ]
  },
  {
    match: 'Dog Lick Mat',
    imgs: [
      'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&q=80',
      'https://images.unsplash.com/photo-1534361960057-19f4434a4bee?w=600&q=80',
    ]
  },
  {
    match: 'Pet GPS Tracker',
    imgs: [
      'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&q=80',
    ]
  },
  {
    match: 'Ergonomic Lumbar Support Pillow',
    imgs: [
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600&q=80',
    ]
  },
  {
    match: 'Wireless Keyboard & Mouse Combo',
    imgs: [
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600&q=80',
      'https://images.unsplash.com/photo-1593640495253-23196b27a87f?w=600&q=80',
    ]
  },
  {
    match: 'Adjustable Monitor Stand',
    imgs: [
      'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600&q=80',
      'https://images.unsplash.com/photo-1547119957-637f8679db1e?w=600&q=80',
    ]
  },
  {
    match: 'Under Desk Cable Management',
    imgs: [
      'https://images.unsplash.com/photo-1593640495253-23196b27a87f?w=600&q=80',
    ]
  },
  {
    match: 'Packing Cubes',
    imgs: [
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80',
      'https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=600&q=80',
    ]
  },
  {
    match: 'Travel Neck Pillow',
    imgs: [
      'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&q=80',
      'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&q=80',
    ]
  },
  {
    match: 'Anti-Theft Backpack',
    imgs: [
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80',
      'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=600&q=80',
    ]
  },
  {
    match: 'Portable Luggage Scale',
    imgs: [
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80',
      'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&q=80',
    ]
  },
  {
    match: 'Smart Plant Soil Moisture',
    imgs: [
      'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&q=80',
      'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80',
    ]
  },
  {
    match: 'Reusable Smart Notebook',
    imgs: [
      'https://images.unsplash.com/photo-1517842645767-c639042777db?w=600&q=80',
      'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=600&q=80',
    ]
  },
  {
    match: 'Magnetic Phone Mount for Car',
    imgs: [
      'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=600&q=80',
    ]
  },
  {
    match: 'Portable Mini Projector',
    imgs: [
      'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&q=80',
      'https://images.unsplash.com/photo-1626379953822-baec19c3accd?w=600&q=80',
    ]
  },
  {
    match: 'Sunrise Alarm Clock',
    imgs: [
      'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=600&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80',
    ]
  },
  {
    match: 'Portable Neck Fan',
    imgs: [
      'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&q=80',
    ]
  },
  {
    match: 'Digital Kitchen Scale',
    imgs: [
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80',
      'https://images.unsplash.com/photo-1495195134817-aeb325a55b65?w=600&q=80',
    ]
  },
  {
    match: 'Portable Blender',
    imgs: [
      'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=600&q=80',
      'https://images.unsplash.com/photo-1610970881699-44a5587cabec?w=600&q=80',
    ]
  },
  {
    match: 'Reusable Silicone Beeswax Food Wraps',
    imgs: [
      'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=600&q=80',
    ]
  },
  {
    match: 'Car Organiser Console Box',
    imgs: [
      'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=600&q=80',
    ]
  },
  {
    match: 'Montessori Busy Board',
    imgs: [
      'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600&q=80',
      'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=600&q=80',
    ]
  },
  {
    match: "Children's Digital Drawing Tablet",
    imgs: [
      'https://images.unsplash.com/photo-1510915228340-29c85a43dcfe?w=600&q=80',
      'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600&q=80',
    ]
  },
  {
    match: 'Acupressure Mat & Pillow',
    imgs: [
      'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&q=80',
      'https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?w=600&q=80',
    ]
  },
  {
    match: 'Posture Corrector Brace',
    imgs: [
      'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=600&q=80',
    ]
  },
  {
    match: 'Digital Blood Pressure Monitor',
    imgs: [
      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&q=80',
    ]
  },
  {
    match: 'Mini Portable Nebuliser',
    imgs: [
      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&q=80',
    ]
  },
  {
    match: 'Solar Fairy Lights',
    imgs: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
      'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=600&q=80',
    ]
  },
  {
    match: 'Herb Garden Starter Kit',
    imgs: [
      'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80',
      'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=600&q=80',
    ]
  },
  {
    match: 'Collapsible Garden Wagon Cart',
    imgs: [
      'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80',
    ]
  },
]

const updateStmt = db.prepare("UPDATE products SET images=? WHERE name LIKE ?")

let updated = 0
for (const entry of imageMap) {
  const result = updateStmt.run(JSON.stringify(entry.imgs), `%${entry.match}%`)
  if (result.changes > 0) {
    updated++
    console.log(`  ✓ ${entry.match}`)
  } else {
    console.log(`  ? no match: ${entry.match}`)
  }
}

console.log(`\nUpdated ${updated} / ${imageMap.length} products with stock images.`)
