import { chromium } from 'playwright';

async function findIframes() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idLicitacion=4309-76-LR25', 
      { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // Clic en tab OC
    await page.click('text=Orden de Compra');
    await page.waitForTimeout(5000);
    
    // Listar URLs de iframes
    const iframeUrls = await page.evaluate(() => {
      const urls = [];
      document.querySelectorAll('iframe').forEach((iframe, i) => {
        urls.push({
          index: i,
          src: iframe.src || 'sin src',
          id: iframe.id || 'sin id',
          name: iframe.name || 'sin name'
        });
      });
      return urls;
    });
    
    console.log('\n=== IFRAMES ENCONTRADOS ===');
    iframeUrls.forEach(f => {
      console.log(`\nIframe ${f.index}:`);
      console.log(`  ID: ${f.id}`);
      console.log(`  Name: ${f.name}`);
      console.log(`  URL: ${f.src}`);
    });
    
    // Intentar acceder a cada frame
    console.log('\n=== CONTENIDO DE FRAMES ===');
    const frames = page.frames();
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      console.log(`\nFrame ${i}: ${frame.url()}`);
      
      try {
        const text = await frame.evaluate(() => document.body?.innerText?.substring(0, 500) || 'vacío');
        console.log(`  Contenido: ${text.substring(0, 200)}...`);
        
        // Buscar códigos OC
        const fullText = await frame.evaluate(() => document.body?.innerText || '');
        const ocMatches = fullText.match(/4309-\d+-[A-Z]{2}\d{2}/g) || [];
        if (ocMatches.length > 0) {
          console.log(`  ¡OC ENCONTRADAS!: ${[...new Set(ocMatches)].join(', ')}`);
        }
      } catch (e) {
        console.log(`  Error: ${e.message}`);
      }
    }
    
    await page.waitForTimeout(60000);
    
  } finally {
    await browser.close();
  }
}

findIframes();
