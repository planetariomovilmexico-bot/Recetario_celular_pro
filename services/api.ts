
import { WEBAPP_URL, WEBAPP_SECRET } from '../constants';

/**
 * Realiza una llamada a la Web App de Google Apps Script.
 * Utiliza una construcción manual del cuerpo para evitar comportamientos inesperados
 * de URLSearchParams con cadenas JSON complejas y asegurar compatibilidad total con e.parameter.
 */
export const callWebApp = async (action: string, params: any = {}) => {
  // Limpieza de parámetros: eliminamos valores undefined para evitar ruidos en el JSON
  const cleanParams = Object.keys(params).reduce((acc: any, key) => {
    if (params[key] !== undefined && params[key] !== null) {
      acc[key] = params[key];
    }
    return acc;
  }, {});

  // Construimos el objeto de carga útil
  const payloadObj = { action, ...cleanParams };
  const payloadString = JSON.stringify(payloadObj);
  
  // Construcción manual del cuerpo application/x-www-form-urlencoded.
  // Es vital usar encodeURIComponent de forma explícita para el JSON completo.
  const body = `secret=${encodeURIComponent(WEBAPP_SECRET)}&payload=${encodeURIComponent(payloadString)}`;

  try {
    const response = await fetch(WEBAPP_URL, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body,
    });

    if (!response.ok) {
      throw new Error(`Error de red: ${response.status} ${response.statusText}`);
    }
    
    const text = await response.text();
    const cleanText = text.trim();

    // Verificación de respuesta HTML (indicativo de errores de despliegue en GAS)
    if (cleanText.includes('<!DOCTYPE') || cleanText.includes('<html')) {
      throw new Error('El servidor respondió con HTML en lugar de JSON. Verifique la publicación del Script.');
    }

    try {
      // Intento de extracción de JSON robusto por si hay caracteres basura al inicio o final
      let data;
      const startIdx = cleanText.indexOf('{');
      const endIdx = cleanText.lastIndexOf('}');
      
      if (startIdx !== -1 && endIdx !== -1) {
        const jsonOnly = cleanText.substring(startIdx, endIdx + 1);
        data = JSON.parse(jsonOnly);
      } else {
        data = JSON.parse(cleanText);
      }

      if (data && data.ok === false) {
        throw new Error(data.error || 'Error desconocido en el servidor');
      }
      
      return data;
    } catch (parseError: any) {
      console.error("Error al procesar JSON del servidor:", cleanText);
      throw new Error(`Error de formato en respuesta: ${parseError.message}`);
    }
  } catch (error: any) {
    console.error("Fallo en la comunicación con la API:", error);
    throw error;
  }
};

export const api = {
  saveConsulta: (payload: any) => callWebApp('save_consulta', payload),
  getLastByPhone: (phone: string) => callWebApp('getLastByPhone', { phone }),
  getCatalogs: () => callWebApp('getCatalogs'),
  saveAppointment: (payload: any) => callWebApp('saveAppointment', payload),
};
