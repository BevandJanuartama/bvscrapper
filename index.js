const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const app = express();
const PORT = 3000;

app.use(express.static("public"));

async function scrapeFullData(targetUrl) {
  console.log(`[LOG] Memulai scraping untuk: ${targetUrl}`);
  try {
    const { data } = await axios.get(targetUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 10000, // Maksimal 10 detik
    });
    const $ = cheerio.load(data);
    const originUrl = new URL(targetUrl).origin;

    // Nama file: test-com-halaman.txt
    let rawName = targetUrl.replace(/^https?:\/\//, "");
    let fileName =
      rawName
        .replace(/[^a-z0-9]/gi, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") + ".txt";

    $("script, style, noscript, nav, footer").remove();
    const allText = $("body").text().replace(/\s\s+/g, "\n").trim();

    const images = new Set();
    $("img").each((i, el) => {
      const src = $(el).attr("src");
      if (src) {
        try {
          images.add(new URL(src, targetUrl).href);
        } catch (e) {}
      }
    });

    const links = new Set();
    $("a").each((i, el) => {
      const href = $(el).attr("href");
      if (href) {
        try {
          const fullUrl = new URL(href, targetUrl).href;
          if (fullUrl.startsWith(originUrl)) links.add(fullUrl);
        } catch (e) {}
      }
    });

    let fileContent = `SOURCE: ${targetUrl}\nDATE: ${new Date().toLocaleString()}\n\n`;
    fileContent += `=== DAFTAR URL INTERNAL ===\n${Array.from(links).join("\n")}\n\n`;
    fileContent += `=== DAFTAR GAMBAR ===\n${Array.from(images).join("\n")}\n\n`;
    fileContent += `=== KONTEN TEKS ===\n${allText}`;

    console.log(`[LOG] Berhasil memproses ${fileName}`);
    return { fileName, fileContent };
  } catch (error) {
    console.error(`[ERROR] Gagal scrape: ${error.message}`);
    throw error;
  }
}

// ROUTE API
app.get("/api/process", async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "URL required" });

  try {
    const result = await scrapeFullData(url);
    res.json(result); // WAJIB JSON
  } catch (err) {
    res
      .status(500)
      .json({ error: "Server gagal mengambil data: " + err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Server Scraper Bepann siap!`);
  console.log(`👉 Akses di: http://localhost:${PORT}`);
  console.log(`--------------------------------------`);
});
