import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE_URL = 'https://www.mercadopublico.cl';

export async function scrapeOrdenesDeCompraAuto(codigoLicitacion, mostrarNavegador = false) {
  console.log(`[SCRAPER] Iniciando scraping automático para: ${codigoLicitacion}`);
  
  const browser = await chromium.launch({ 
    headless: !mostrarNavegador,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  
  const codigosOC = new Set();
  const prefijoLicitacion = codigoLicitacion.split('-')[0];
  
  try {
    // 1. Navegar a la página de la licitación
    const url = `${BASE_URL}/Procurement/Modules/RFB/DetailsAcquisition.aspx?idLicitacion=${codigoLicitacion}`;
    console.log(`[SCRAPER] Navegando a: ${url}`);
    
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    
    // Guardar screenshot inicial
    await page.screenshot({ path: 'debug_1_pagina_inicial.png', fullPage: true });
    console.log('[SCRAPER] Screenshot guardado: debug_1_pagina_inicial.png');
    
    // 2. Buscar y hacer clic en el tab/enlace de "Orden de Compra"
    console.log('[SCRAPER] Buscando tab "Orden de Compra"...');
    
    // Intentar múltiples selectores
    const selectoresOC = [
      page.getByText('Orden de Compra', { exact: false }),
      page.getByRole('tab', { name: /orden.*compra/i }),
      page.getByRole('link', { name: /orden.*compra/i }),
      page.locator('a:has-text("Orden de Compra")'),
      page.locator('[id*="ordencompra" i]'),
      page.locator('[id*="oc" i]:has-text("Orden")'),
      page.locator('text=Orden de Compra')
    ];
    
    let clickExitoso = false;
    for (const selector of selectoresOC) {
      try {
        const count = await selector.count();
        if (count > 0) {
          console.log(`[SCRAPER] Encontrado elemento OC, haciendo clic...`);
          await selector.first().click();
          clickExitoso = true;
          break;
        }
      } catch (e) {
        // Continuar con siguiente selector
      }
    }
    
    if (!clickExitoso) {
      console.log('[SCRAPER] No se encontró tab de OC, buscando en página actual...');
    }
    
    // Esperar a que cargue el contenido
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
    
    // Guardar screenshot después del clic
    await page.screenshot({ path: 'debug_2_despues_clic.png', fullPage: true });
    console.log('[SCRAPER] Screenshot guardado: debug_2_despues_clic.png');
    
    // 3. Extraer códigos de OC de múltiples fuentes
    console.log('[SCRAPER] Extrayendo códigos de OC...');
    
    // Función para extraer OC del contenido
    const extraerCodigosOC = async () => {
      const datos = await page.evaluate((prefijo) => {
        const resultado = {
          html: document.documentElement.outerHTML,
          texto: document.body.innerText,
          enlaces: []
        };
        
        // Buscar en todos los enlaces
        document.querySelectorAll('a').forEach(a => {
          const href = a.href || '';
          const texto = a.textContent || '';
          if (href.includes('idLicitacion=') || texto.match(/\d{4}-\d+-[A-Z]{2}\d{2}/)) {
            resultado.enlaces.push({ href, texto: texto.trim() });
          }
        });
        
        return resultado;
      }, prefijoLicitacion);
      
      // Buscar patrones de OC en HTML
      const patronOC = new RegExp(`${prefijoLicitacion}-\\d+-[A-Z]{2}\\d{2}`, 'g');
      
      const matchesHtml = datos.html.match(patronOC) || [];
      const matchesTexto = datos.texto.match(patronOC) || [];
      
      // Filtrar solo OC (no licitaciones que terminan en -LR)
      const todos = [...new Set([...matchesHtml, ...matchesTexto])];
      return todos.filter(c => !c.includes('-LR') && !c.includes('-LE') && !c.includes('-LP'));
    };
    
    // Extraer de página actual
    let codigosEncontrados = await extraerCodigosOC();
    codigosEncontrados.forEach(c => codigosOC.add(c));
    
    console.log(`[SCRAPER] Página 1: ${codigosEncontrados.length} OC encontradas`);
    
    // 4. Manejar paginación
    let paginaActual = 1;
    const maxPaginas = 30;
    
    while (paginaActual < maxPaginas) {
      // Buscar botón de siguiente página
      const siguientePagina = paginaActual + 1;
      
      const selectoresPaginacion = [
        page.getByText(`${siguientePagina}`, { exact: true }),
        page.locator(`a:has-text("${siguientePagina}")`),
        page.getByRole('link', { name: `${siguientePagina}` }),
        page.locator('[class*="pager"] a').filter({ hasText: `${siguientePagina}` }),
        page.locator('a.aspNetDisabled').filter({ hasText: `${siguientePagina}` }).locator('..').locator('a').first()
      ];
      
      let encontroPagina = false;
      
      for (const selector of selectoresPaginacion) {
        try {
          const visible = await selector.first().isVisible({ timeout: 2000 });
          if (visible) {
            console.log(`[SCRAPER] Navegando a página ${siguientePagina}...`);
            await selector.first().click();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);
            
            // Extraer OC de nueva página
            const nuevosOC = await extraerCodigosOC();
            const nuevos = nuevosOC.filter(c => !codigosOC.has(c));
            nuevos.forEach(c => codigosOC.add(c));
            
            console.log(`[SCRAPER] Página ${siguientePagina}: ${nuevos.length} OC nuevas (total: ${codigosOC.size})`);
            
            paginaActual++;
            encontroPagina = true;
            break;
          }
        } catch (e) {
          // Continuar
        }
      }
      
      if (!encontroPagina) {
        console.log('[SCRAPER] No hay más páginas');
        break;
      }
    }
    
    // Guardar screenshot final
    await page.screenshot({ path: 'debug_3_final.png', fullPage: true });
    
    // Guardar HTML para análisis
    const htmlFinal = await page.content();
    writeFileSync('debug_pagina_oc.html', htmlFinal);
    console.log('[SCRAPER] HTML guardado: debug_pagina_oc.html');
    
  } catch (error) {
    console.error('[SCRAPER] Error:', error.message);
    await page.screenshot({ path: 'debug_error.png', fullPage: true });
  } finally {
    await browser.close();
  }
  
  const listaFinal = [...codigosOC];
  console.log(`\n[SCRAPER] === RESULTADO ===`);
  console.log(`[SCRAPER] Total OC encontradas: ${listaFinal.length}`);
  
  if (listaFinal.length > 0) {
    console.log('[SCRAPER] Códigos:');
    listaFinal.forEach(c => console.log(`  - ${c}`));
  }
  
  return listaFinal;
}

// Test directo
if (process.argv[1].includes('scraperAuto')) {
  const codigo = process.argv[2] || '4309-76-LR25';
  scrapeOrdenesDeCompraAuto(codigo, true).then(codigos => {
    console.log(`\n=== ${codigos.length} OC ENCONTRADAS ===`);
  });
}
