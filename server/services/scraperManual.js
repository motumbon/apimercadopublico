import { chromium } from 'playwright';

const BASE_URL = 'https://www.mercadopublico.cl';

export async function scrapeOrdenesManual(codigoLicitacion, tiempoEspera = 60000) {
  console.log(`[SCRAPER] Iniciando modo navegación asistida para: ${codigoLicitacion}`);
  console.log(`[SCRAPER] El navegador se cerrará automáticamente en ${tiempoEspera / 1000} segundos`);
  
  const browser = await chromium.launch({ 
    headless: false,
    args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: null // Maximizar ventana
  });
  
  const page = await context.newPage();
  
  const codigosOC = new Set();
  const prefijoLicitacion = codigoLicitacion.split('-')[0];
  const patronOC = new RegExp(`${prefijoLicitacion}-\\d+-[A-Z]{2}\\d{2}`, 'g');
  
  // Interceptar TODAS las respuestas de red para detectar OC
  page.on('response', async (response) => {
    try {
      const contentType = response.headers()['content-type'] || '';
      if (contentType.includes('html') || contentType.includes('json') || contentType.includes('text')) {
        const body = await response.text().catch(() => '');
        const matches = body.match(patronOC) || [];
        const ocValidas = matches.filter(c => !c.includes('-LR') && !c.includes('-LE') && !c.includes('-LP'));
        
        if (ocValidas.length > 0) {
          const nuevas = ocValidas.filter(c => !codigosOC.has(c));
          if (nuevas.length > 0) {
            nuevas.forEach(c => codigosOC.add(c));
            console.log(`[SCRAPER] ✓ Detectadas ${nuevas.length} OC nuevas (Total: ${codigosOC.size})`);
          }
        }
      }
    } catch (e) {
      // Ignorar errores
    }
  });
  
  // También detectar OC cuando cambia el DOM
  page.on('domcontentloaded', async () => {
    try {
      const html = await page.content();
      const matches = html.match(patronOC) || [];
      const ocValidas = matches.filter(c => !c.includes('-LR') && !c.includes('-LE') && !c.includes('-LP'));
      ocValidas.forEach(c => codigosOC.add(c));
    } catch (e) {}
  });
  
  try {
    // Navegar a la página de la licitación
    const url = `${BASE_URL}/Procurement/Modules/RFB/DetailsAcquisition.aspx?idLicitacion=${codigoLicitacion}`;
    console.log(`[SCRAPER] Navegando a: ${url}`);
    
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    // Mostrar instrucciones al usuario mediante una alerta en la página
    await page.evaluate((tiempo) => {
      const div = document.createElement('div');
      div.id = 'scraper-instrucciones';
      div.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; background: #1e40af; color: white; padding: 15px 20px; z-index: 999999; font-family: Arial, sans-serif; box-shadow: 0 4px 6px rgba(0,0,0,0.3);">
          <div style="max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong style="font-size: 16px;">🔍 Modo Detección de OC Activo</strong>
              <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">
                Navega a la sección <strong>"Orden de Compra"</strong> y recorre todas las páginas. Las OC se detectan automáticamente.
              </p>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 24px; font-weight: bold;" id="scraper-contador">${tiempo}</div>
              <div style="font-size: 12px; opacity: 0.8;">segundos restantes</div>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(div);
      document.body.style.paddingTop = '80px';
      
      // Contador regresivo
      let segundos = tiempo;
      const interval = setInterval(() => {
        segundos--;
        const contador = document.getElementById('scraper-contador');
        if (contador) contador.textContent = segundos;
        if (segundos <= 0) clearInterval(interval);
      }, 1000);
    }, Math.floor(tiempoEspera / 1000));
    
    console.log(`[SCRAPER] Esperando ${tiempoEspera / 1000} segundos mientras navegas...`);
    
    // Esperar el tiempo especificado mientras el usuario navega
    await page.waitForTimeout(tiempoEspera);
    
    // Hacer un último escaneo del DOM antes de cerrar
    const htmlFinal = await page.content();
    const matchesFinal = htmlFinal.match(patronOC) || [];
    matchesFinal.filter(c => !c.includes('-LR') && !c.includes('-LE') && !c.includes('-LP'))
      .forEach(c => codigosOC.add(c));
    
  } catch (error) {
    console.error('[SCRAPER] Error:', error.message);
  } finally {
    console.log(`[SCRAPER] Cerrando navegador...`);
    await browser.close();
  }
  
  const listaFinal = [...codigosOC];
  console.log(`\n[SCRAPER] === RESULTADO FINAL ===`);
  console.log(`[SCRAPER] Total OC detectadas: ${listaFinal.length}`);
  
  if (listaFinal.length > 0) {
    listaFinal.forEach(c => console.log(`  - ${c}`));
  }
  
  return listaFinal;
}

// Test
if (process.argv[1].includes('scraperManual')) {
  const codigo = process.argv[2] || '4309-76-LR25';
  const tiempo = parseInt(process.argv[3]) || 60000;
  scrapeOrdenesManual(codigo, tiempo).then(codigos => {
    console.log(`\nTotal: ${codigos.length} OC detectadas`);
  });
}
