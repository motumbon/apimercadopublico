import { chromium } from 'playwright';

async function explorePage() {
  console.log('[EXPLORE] Iniciando exploración...');
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--no-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // Ir directamente a una URL de licitación conocida
    const url = 'https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?qs=4309-76-LR25';
    console.log(`[EXPLORE] Navegando a: ${url}`);
    
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(5000);
    
    console.log(`[EXPLORE] URL actual: ${page.url()}`);
    
    // Tomar screenshot
    await page.screenshot({ path: 'explore_page.png', fullPage: true });
    console.log('[EXPLORE] Screenshot guardado: explore_page.png');
    
    // Listar todos los inputs
    const inputs = await page.locator('input').all();
    console.log(`[EXPLORE] Inputs encontrados: ${inputs.length}`);
    
    for (let i = 0; i < Math.min(inputs.length, 10); i++) {
      const id = await inputs[i].getAttribute('id');
      const name = await inputs[i].getAttribute('name');
      const type = await inputs[i].getAttribute('type');
      console.log(`[EXPLORE] Input ${i}: id="${id}", name="${name}", type="${type}"`);
    }
    
    // Listar todos los enlaces
    const links = await page.locator('a').all();
    console.log(`[EXPLORE] Enlaces encontrados: ${links.length}`);
    
    for (let i = 0; i < Math.min(links.length, 20); i++) {
      const href = await links[i].getAttribute('href');
      const text = await links[i].textContent();
      if (text && text.trim().length > 0 && text.trim().length < 50) {
        console.log(`[EXPLORE] Link: "${text.trim()}" -> ${href?.substring(0, 80)}`);
      }
    }
    
    // Esperar para inspección manual
    console.log('[EXPLORE] Navegador abierto. Presiona Ctrl+C para cerrar.');
    await page.waitForTimeout(120000);
    
  } catch (error) {
    console.error('[EXPLORE] Error:', error.message);
  } finally {
    await browser.close();
  }
}

explorePage();
