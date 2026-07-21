module.exports = (req, res) => {
  if (req.method === 'POST') {
    console.log('[LOGGER]', JSON.stringify(req.body));
    // Simpan ke DB atau file di sini jika perlu
    return res.json({ success: true });
  }
  res.status(405).send('Method not allowed');
};
