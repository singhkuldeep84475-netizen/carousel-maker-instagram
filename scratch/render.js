import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function renderSlides() {
  const htmlPath = path.join(__dirname, 'liquidity.html');
  const exportDir = path.join(__dirname, '..', 'liquidity_carousel_exports');

  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  console.log('🚀 Starting slide rendering with Puppeteer...');
  console.log(`📂 Source: ${htmlPath}`);
  console.log(`📂 Destination directory: ${exportDir}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Set viewport high enough to fit high resolution
    await page.setViewport({
      width: 1200,
      height: 1500,
      deviceScaleFactor: 2 // 2x scale for stunning high-res clarity
    });

    // Load file
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
    console.log('✅ Page loaded successfully. Rendering slides...');

    // Select all slide elements
    const slides = await page.$$('.slide');
    console.log(`📊 Found ${slides.length} slides to render.`);

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const filename = `slide-${String(i + 1).padStart(2, '0')}.png`;
      const outputPath = path.join(exportDir, filename);

      console.log(`📸 Capturing Slide ${i + 1}/${slides.length}...`);
      await slide.screenshot({
        path: outputPath,
        type: 'png',
        omitBackground: true
      });
      console.log(`💾 Saved to ${outputPath}`);
    }

    console.log('\n🎉 SUCCESS! All slides successfully converted to 1080x1350px PNGs (2x scaled for high-density screens)!');
  } catch (error) {
    console.error('❌ Error during rendering:', error);
  } finally {
    await browser.close();
  }
}

renderSlides();
