import { MongoClient, ObjectId } from 'mongodb';

export default async function handler(req, res) {
  // CORS Ayarları
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-mongodb-uri');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // URI'yi hem Header'dan hem de URL'den (?uri=...) alabilir
  const mongoUri = req.headers['x-mongodb-uri'] || req.query.uri;
  const { db, col, action, id, export: exportJson } = req.query;

  if (!mongoUri) {
    return res.status(400).json({ error: "Hata: MongoDB URI (bağlantı adresi) bulunamadı!" });
  }

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const database = client.db(db || 'test');
    const collection = database.collection(col || 'items');

    if (req.method === 'GET') {
      // 📊 İstatistik Modu
      if (action === 'stats') {
        const stats = await database.command({ dbStats: 1 });
        return res.status(200).json({
          status: "success",
          storage: {
            used_mb: (stats.storageSize / 1024 / 1024).toFixed(2),
            objects: stats.objects
          }
        });
      }

      // 📥 Veri Listeleme / JSON Dışa Aktarma
      const docs = await collection.find({}).limit(5000).toArray();

      // Eğer export=true ise tarayıcıya dosya indirtme başlığı ekle
      if (exportJson === 'true') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=mongodb_export.json');
        return res.status(200).send(JSON.stringify(docs, null, 2));
      }

      return res.status(200).json(docs);
    }

    if (req.method === 'POST') {
      const result = await collection.insertOne(req.body);
      return res.status(201).json(result);
    }

    // ... Diğer metodlar (PUT/DELETE)
  } catch (err) {
    return res.status(500).json({ error: err.message });
  } finally {
    await client.close();
  }
}
