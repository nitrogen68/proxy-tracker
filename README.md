# 🚀 Proxy Tracker v2.0 (Node.js)

Versi Node.js yang lebih powerful dari Proxy Tracker original. Menggunakan Express + Cheerio untuk manipulasi HTML yang lebih akurat.

## ✨ Fitur Upgrade dari Versi PHP

- **Cheerio Parser**: Manipulasi HTML menggunakan jQuery-like API (lebih reliable dari regex)
- **Asset Proxy**: Bypass CORS untuk fetch/XHR secara otomatis
- **Network Sniffer**: Intercept semua request `fetch()` dan `XMLHttpRequest`
- **Auto Code Generator**: Generate kode PHP/JS dari request API terakhir
- **Floating Dashboard**: UI real-time untuk monitoring request
- **Full Proxy Mode**: Rewrite semua asset (CSS, JS, gambar) melalui proxy

## 🚀 Deploy ke Vercel

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy
vercel --prod
