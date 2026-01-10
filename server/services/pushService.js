import { obtenerTodosPushTokens } from '../db/database.js';

// Enviar notificaciones push usando Expo Push API
export async function enviarNotificacionPush(titulo, mensaje, data = {}) {
  try {
    console.log(`[PUSH] Intentando enviar: "${titulo}" - "${mensaje}"`);
    const tokens = await obtenerTodosPushTokens();
    console.log(`[PUSH] Tokens encontrados: ${tokens.length}`);
    
    if (tokens.length === 0) {
      console.log('[PUSH] No hay tokens registrados');
      return { sent: 0 };
    }
    
    const messages = tokens
      .filter(t => t.token && t.token.startsWith('ExponentPushToken'))
      .map(t => ({
        to: t.token,
        sound: 'default',
        title: titulo,
        body: mensaje,
        data: data,
        priority: 'high',
        channelId: 'default'
      }));
    
    if (messages.length === 0) {
      console.log('[PUSH] No hay tokens válidos de Expo');
      return { sent: 0 };
    }
    
    console.log(`[PUSH] Enviando ${messages.length} notificaciones...`);
    
    // Enviar en lotes de 100 (límite de Expo)
    const chunks = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }
    
    let totalSent = 0;
    
    for (const chunk of chunks) {
      try {
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(chunk)
        });
        
        const result = await response.json();
        console.log('[PUSH] Respuesta Expo:', JSON.stringify(result));
        
        if (result.data) {
          const successCount = result.data.filter(r => r.status === 'ok').length;
          totalSent += successCount;
          console.log(`[PUSH] Lote enviado: ${successCount}/${chunk.length} exitosos`);
          
          // Log errores específicos
          result.data.forEach((r, i) => {
            if (r.status !== 'ok') {
              console.log(`[PUSH] Error en token ${i}: ${r.status} - ${r.message || 'Sin mensaje'}`);
              if (r.details) {
                console.log(`[PUSH] Detalles: ${JSON.stringify(r.details)}`);
              }
            }
          });
        }
      } catch (error) {
        console.error('[PUSH] Error enviando lote:', error.message);
      }
    }
    
    console.log(`[PUSH] Total enviados: ${totalSent}`);
    return { sent: totalSent };
    
  } catch (error) {
    console.error('[PUSH] Error general:', error);
    return { sent: 0, error: error.message };
  }
}

// Notificar nuevas órdenes de compra (solo push, la notificación en BD ya se crea en mercadoPublico.js)
export async function notificarNuevasOC(ordenesEncontradas) {
  if (!ordenesEncontradas || ordenesEncontradas.length === 0) {
    console.log('[PUSH] No hay OC para notificar');
    return { sent: 0 };
  }
  
  const cantidad = ordenesEncontradas.length;
  const montoTotal = ordenesEncontradas.reduce((sum, oc) => sum + (oc.monto || 0), 0);
  
  const titulo = `🛒 ${cantidad} nueva${cantidad > 1 ? 's' : ''} OC detectada${cantidad > 1 ? 's' : ''}`;
  const mensaje = `Monto total: $${montoTotal.toLocaleString('es-CL')}`;
  
  console.log(`[PUSH] Notificando ${cantidad} nuevas OC, monto total: ${montoTotal}`);
  
  // NO crear notificación en BD aquí - ya se crea en mercadoPublico.js para evitar duplicados
  
  // Enviar push notification
  const result = await enviarNotificacionPush(titulo, mensaje, {
    type: 'nueva_oc',
    cantidad: cantidad,
    monto: montoTotal
  });
  
  console.log(`[PUSH] Resultado envío push: ${result.sent} enviados`);
  return result;
}
