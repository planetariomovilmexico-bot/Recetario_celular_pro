
import { WEBAPP_URL, WEBAPP_SECRET } from '../constants';

export const callWebApp = async (action: string, params: any = {}) => {
  const body = new URLSearchParams();
  body.append('secret', WEBAPP_SECRET);
  
  // The provided Apps Script expects action and data inside a JSON string in 'payload'
  body.append('payload', JSON.stringify({ action, ...params }));

  const response = await fetch(WEBAPP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body,
  });

  if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
  
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error('La respuesta del servidor no es un JSON válido');
  }

  if (!data.ok) throw new Error(data.error || 'Operación fallida');
  return data;
};

export const api = {
  saveConsulta: (payload: any) => callWebApp('save_consulta', payload),
  getLastByPhone: (phone: string) => callWebApp('getLastByPhone', { phone }),
  getCatalogs: () => callWebApp('getCatalogs'),
  saveAppointment: (payload: any) => callWebApp('saveAppointment', { addToCalendar: '1', ...payload }),
};
