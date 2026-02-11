
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, Plus, Trash2, Printer, 
  Save, Calendar as CalendarIcon, Send, 
  Lock, Activity, Weight, Ruler, Thermometer, Droplet,
  ClipboardList, Stethoscope, RefreshCcw, LogOut, ChevronRight, Wind
} from 'lucide-react';
import { api } from './services/api';
import { INITIAL_PATIENT, ACCESS_CODE } from './constants';
import { Patient, Medication, Catalogs } from './types';
import Autocomplete from './components/Autocomplete';
import Barcode from './components/Barcode';

const App: React.FC = () => {
  const [isLocked, setIsLocked] = useState(true);
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [catalogs, setCatalogs] = useState<Catalogs>({ meds: [], indicaciones: [], cie10: [] });
  
  const [folio, setFolio] = useState('');
  const [patient, setPatient] = useState<Patient>({ ...INITIAL_PATIENT, glucose: '' });
  const [subjetivo, setSubjetivo] = useState('');
  const [diagnoses, setDiagnoses] = useState('');
  const [meds, setMeds] = useState<Medication[]>([{ name: '', quantity: '', frequency: '', duration: '', instructions: '' }]);
  const [exams, setExams] = useState('');
  const [appointment, setAppointment] = useState({ 
    date: new Date().toISOString().split('T')[0], 
    time: '16:00', 
    notes: 'consulta de seguimiento' 
  });
  
  const [searchPhone, setSearchPhone] = useState('');
  const [searchDx, setSearchDx] = useState('');
  const [searchExams, setSearchExams] = useState('');

  const generateFolio = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `REC${year}${month}${day}-${randomPart}`;
  };

  const calcAgeFromDob = (dob: string) => {
    if (!dob) return '';
    const birthDate = new Date(dob + 'T00:00:00');
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? String(age) : '';
  };

  useEffect(() => {
    setFolio(generateFolio());
    if (sessionStorage.getItem('session_unlocked') === '1') setIsLocked(false);
    
    const loadCatalogs = async () => {
      try {
        const data = await api.getCatalogs();
        setCatalogs(data);
      } catch (err) {
        console.error("Error cargando catálogos:", err);
      }
    };
    loadCatalogs();
  }, []);

  const handleUnlock = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (passcode === ACCESS_CODE) {
      sessionStorage.setItem('session_unlocked', '1');
      setIsLocked(false);
    } else {
      alert("Contraseña incorrecta.");
      setPasscode('');
    }
  };

  const handleFetchPatient = async () => {
    const phone = searchPhone.trim();
    if (!/^\d{10}$/.test(phone)) {
      alert("Por favor, ingrese un celular de 10 dígitos.");
      return;
    }
    
    setLoading(true);
    try {
      const res = await api.getLastByPhone(phone);
      if (res && res.data) {
        const d = res.data;
        const p = d.patient || {};
        
        const newPatient = {
          name: String(p.name || ''),
          phone: String(p.phone || phone),
          dob: String(p.dob || ''),
          age: String(p.age || calcAgeFromDob(p.dob) || ''),
          ta_sis: String(p.ta_sis || ''),
          ta_dia: String(p.ta_dia || ''),
          fc: String(p.fc || ''),
          temp: String(p.temp || ''),
          glucose: String(p.glucose || ''),
          weight: String(p.weight || ''),
          height: String(p.height || ''),
          imc: String(p.imc || ''),
          imc_class: String(p.imc_class || ''),
          oxi: String(d.oxi || p.oxi || '')
        };
        
        setPatient(newPatient);
        setSubjetivo(String(d.subjetivo || ''));
        setDiagnoses(String(d.diagnoses || ''));
        setExams(String(d.exams || ''));
        
        const loadedMeds = Array.isArray(d.meds) ? d.meds : [];
        setMeds(loadedMeds.length ? loadedMeds : [{ name: '', quantity: '', frequency: '', duration: '', instructions: '' }]);
      } else {
        // Limpiar el estado del paciente pero mantener el número de teléfono
        setPatient({ ...INITIAL_PATIENT, phone: phone, glucose: '' });
        // Limpiar también el resto de campos de la consulta para una nueva entrada limpia
        setSubjetivo('');
        setDiagnoses('');
        setExams('');
        setMeds([{ name: '', quantity: '', frequency: '', duration: '', instructions: '' }]);
        
        alert("No se encontraron registros previos para este número.");
      }
    } catch (err: any) {
      alert("No se pudieron recuperar los datos: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateBMI = useCallback(() => {
    const w = parseFloat(patient.weight);
    const h = parseFloat(patient.height);
    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      const heightInMeters = h > 3 ? h / 100 : h;
      const bmi = w / (heightInMeters * heightInMeters);
      const bmiClass = bmi < 18.5 ? '(Bajo peso)' : bmi <= 24.9 ? '(Normal)' : bmi <= 29.9 ? '(Sobrepeso)' : '(Obesidad)';
      setPatient(p => ({ ...p, imc: bmi.toFixed(1), imc_class: bmiClass }));
    }
  }, [patient.weight, patient.height]);

  useEffect(() => { calculateBMI(); }, [calculateBMI]);

  // Actualizar edad si cambia el DOB
  useEffect(() => {
    if (patient.dob) {
      const age = calcAgeFromDob(patient.dob);
      setPatient(p => ({ ...p, age }));
    }
  }, [patient.dob]);

  const updateMed = (index: number, field: keyof Medication, value: string) => {
    const newMeds = [...meds];
    newMeds[index] = { ...newMeds[index], [field]: value };
    setMeds(newMeds);
  };

  const handleSave = async () => {
    if (!patient.name || !patient.phone) {
      alert("Nombre y Celular son obligatorios.");
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        folio,
        patient,
        subjetivo,
        diagnoses,
        meds,
        exams,
        date: new Date().toLocaleDateString('es-MX'),
        date_iso: new Date().toISOString().split('T')[0]
      };
      await api.saveConsulta(payload);
      alert("✓ Consulta guardada exitosamente.");
    } catch (err: any) {
      alert("✕ Error al guardar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    window.print();
  };

  const getWhatsAppSummary = () => {
    if (!patient.phone) {
      alert("Celular del paciente es necesario.");
      return;
    }

    const medsList = meds
      .filter(m => m.name.trim() !== '')
      .map(m => `• *${m.name}*${m.trade ? ` (${m.trade})` : ''}: ${m.quantity} cada ${m.frequency} por ${m.duration}. ${m.instructions}`)
      .join('\n');

    const message = `*DR. MODESTO MORALES HOYOS*\n` +
      `*RECETA MÉDICA - FOLIO: ${folio}*\n\n` +
      `*Paciente:* ${patient.name}\n` +
      `*Fecha:* ${new Date().toLocaleDateString('es-MX')}\n\n` +
      `*Signos:* TA ${patient.ta_sis}/${patient.ta_dia} · FC ${patient.fc} · Glucosa ${patient.glucose}\n\n` +
      `*Diagnóstico:*\n${diagnoses || 'Evaluación médica'}\n\n` +
      `*Tratamiento:*\n${medsList || 'Ver indicaciones anexas'}\n\n` +
      `*Estudios/Indicaciones:*\n${exams || 'N/A'}\n\n` +
      `*Próxima Cita:* ${new Date(appointment.date + 'T' + appointment.time).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}\n\n` +
      `_Por favor llegue 10 min antes de su cita._`;

    const encoded = encodeURIComponent(message);
    const cleanPhone = patient.phone.replace(/\D/g, '');
    window.open(`https://wa.me/52${cleanPhone}?text=${encoded}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 pb-20">
      {/* Navbar Superior Fijo */}
      <nav className="sticky top-0 z-[100] bg-slate-900 text-white shadow-2xl no-print px-4 py-3">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl">
              <Stethoscope size={24} />
            </div>
            <span className="eb-garamond text-2xl font-bold tracking-tight">DR. MODESTO MORALES</span>
          </div>
          
          <div className="flex-1 max-w-md relative">
            <input 
              type="tel" 
              placeholder="Buscar por celular..." 
              className="w-full bg-slate-800 border-none rounded-full pl-12 pr-12 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFetchPatient()}
            />
            <Search className="absolute left-4 top-2 text-slate-500" size={18} />
            <button 
              onClick={handleFetchPatient}
              className="absolute right-2 top-1 bg-indigo-600 p-1 rounded-full hover:bg-indigo-700 transition-colors"
            >
              {loading ? <RefreshCcw className="animate-spin" size={18} /> : <ChevronRight size={18} />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="p-2 hover:bg-slate-800 rounded-full" title="Imprimir"><Printer size={20} /></button>
            <button onClick={() => window.location.reload()} className="p-2 hover:bg-slate-800 rounded-full" title="Nuevo"><RefreshCcw size={20} /></button>
            <button onClick={() => { sessionStorage.removeItem('session_unlocked'); setIsLocked(true); }} className="p-2 hover:text-red-400 rounded-full" title="Salir"><LogOut size={20} /></button>
          </div>
        </div>
      </nav>

      {/* Pantalla Bloqueada */}
      {isLocked && (
        <div className="fixed inset-0 bg-slate-900 z-[999] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl border-t-8 border-indigo-600">
            <div className="bg-indigo-50 text-indigo-600 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"><Lock size={40} /></div>
            <h2 className="text-2xl font-bold mb-6 text-slate-800">Acceso Seguro</h2>
            <form onSubmit={handleUnlock}>
              <input type="password" placeholder="Código PIN" className="w-full h-14 text-center text-3xl border-2 rounded-2xl mb-4 bg-slate-50 outline-none focus:border-indigo-500 transition-all font-mono tracking-widest" value={passcode} onChange={e => setPasscode(e.target.value)} autoFocus />
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-95">Desbloquear</button>
            </form>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
        {/* Receta Física */}
        <div className="recipe-card bg-white shadow-2xl rounded-sm p-8 md:p-14 min-h-[10.5in] border flex flex-col relative overflow-visible">
          
          <header className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
            <div className="flex gap-4 items-center">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https%3A%2F%2Fwa.me%2F522288370103" className="w-20 h-20 rounded-lg shadow-sm" alt="QR" />
              <div>
                <h1 className="eb-garamond text-4xl font-bold leading-none mb-1 text-slate-900">Dr. Modesto Morales Hoyos</h1>
                <h2 className="eb-garamond text-2xl text-slate-600 italic">Médico Internista</h2>
                <p className="text-[10px] font-bold uppercase text-slate-400 mt-2 tracking-widest border-t pt-1">Céd. Prof. 1219623 | Céd. Esp. 3352905 | UV</p>
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <Barcode value={folio} />
              <p className="text-[10px] font-black mt-2 text-slate-900 uppercase">Folio: {folio}</p>
              <p className="text-[11px] font-bold mt-1 uppercase text-slate-500 bg-slate-50 px-2 py-0.5 rounded border">
                {new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </header>

          {/* Datos Paciente - Vista Pantalla */}
          <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-slate-50 p-6 rounded-2xl no-print border shadow-inner">
            <div className="md:col-span-2">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1 block mb-1">Nombre del Paciente</label>
              <input type="text" className="w-full bg-white border rounded-xl px-4 py-2 font-bold focus:ring-2 focus:ring-indigo-500 outline-none" value={patient.name} onChange={e => setPatient({...patient, name: e.target.value})} placeholder="Nombre completo" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1 block mb-1">Fecha Nacimiento</label>
              <input type="date" className="w-full bg-white border rounded-xl px-4 py-2 text-center font-bold" value={patient.dob} onChange={e => setPatient({...patient, dob: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase ml-1 block mb-1">Celular de Contacto</label>
              <input type="text" className="w-full bg-white border rounded-xl px-4 py-2 font-bold" value={patient.phone} onChange={e => setPatient({...patient, phone: e.target.value})} placeholder="10 dígitos" />
            </div>
          </section>

          {/* Datos Paciente - Vista Impresión */}
          <section className="hidden print:flex mb-6 text-[11pt] border-b-2 border-slate-900 pb-3 gap-8">
            <p className="flex-1"><strong>PACIENTE:</strong> <span className="uppercase font-bold">{patient.name || '__________________________'}</span></p>
            <p><strong>EDAD:</strong> {patient.age || '___'} AÑOS</p>
            <p><strong>FECHA:</strong> {new Date().toLocaleDateString()}</p>
          </section>

          {/* Signos Vitales - Sincronizados */}
          <div className="grid grid-cols-4 md:grid-cols-8 gap-4 mb-8 border-y-2 border-slate-200 py-6 bg-white">
            {[
              { label: 'TA (mmHg)', val: patient.ta_sis, val2: patient.ta_dia, isTA: true, icon: <Activity className="text-indigo-600" size={18}/> },
              { label: 'FC (lpm)', val: patient.fc, field: 'fc', icon: <Droplet className="text-red-600" size={18}/> },
              { label: 'O2 Sat (%)', val: patient.oxi, field: 'oxi', icon: <Wind className="text-blue-500" size={18}/> },
              { label: 'Gluc (mg/dL)', val: patient.glucose, field: 'glucose', icon: <Droplet className="text-amber-500" size={18}/> },
              { label: 'Temp (°C)', val: patient.temp, field: 'temp', icon: <Thermometer className="text-amber-600" size={18}/> },
              { label: 'Peso (kg)', val: patient.weight, field: 'weight', icon: <Weight className="text-slate-600" size={18}/> },
              { label: 'Talla (m)', val: patient.height, field: 'height', icon: <Ruler className="text-slate-600" size={18}/> },
              { label: 'IMC', val: patient.imc, sub: patient.imc_class, icon: <Stethoscope className="text-indigo-600" size={18}/> }
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center border-r last:border-0 border-slate-100 px-1 text-center">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1 no-print">{s.label}</span>
                {s.isTA ? (
                  <div className="flex items-center gap-0.5 no-print">
                    <input className="w-8 text-center bg-slate-100 rounded text-xs font-bold" value={patient.ta_sis} onChange={e => setPatient({...patient, ta_sis: e.target.value})} placeholder="120" />
                    <span className="text-slate-300">/</span>
                    <input className="w-8 text-center bg-slate-100 rounded text-xs font-bold" value={patient.ta_dia} onChange={e => setPatient({...patient, ta_dia: e.target.value})} placeholder="80" />
                  </div>
                ) : s.field ? (
                  <input className="w-12 text-center bg-slate-100 rounded text-xs font-bold no-print" value={s.val} onChange={e => setPatient({...patient, [s.field!]: e.target.value})} placeholder="--" />
                ) : (
                  <span className="text-xs font-black no-print">{s.val || '--'}</span>
                )}
                <span className="hidden print:inline text-[12pt] font-black">
                  {s.isTA ? `${patient.ta_sis || '___'}/${patient.ta_dia || '___'}` : s.val || '___'}
                </span>
                <span className="text-[8px] font-black text-slate-400 uppercase mt-1 tracking-widest hidden print:inline">{s.label.split(' ')[0]}</span>
                {s.sub && <span className="text-[8px] font-bold text-indigo-600 uppercase mt-1 leading-none">{s.sub}</span>}
              </div>
            ))}
          </div>

          <div className="flex-1 space-y-10">
            {/* Notas Médicas (Solo pantalla) */}
            <section className="no-print bg-slate-50 p-5 rounded-2xl border-2 border-dashed border-indigo-100 transition-all hover:bg-indigo-50">
              <h4 className="text-xs font-black text-indigo-600 mb-3 uppercase flex items-center gap-2 tracking-widest"><ClipboardList size={16}/> S: Subjetivo / Motivo de Consulta</h4>
              <textarea className="w-full bg-transparent outline-none text-sm min-h-[100px] leading-relaxed font-medium placeholder:text-slate-300" value={subjetivo} onChange={e => setSubjetivo(e.target.value)} placeholder="Síntomas, motivo de consulta, antecedentes relevantes..." />
            </section>

            {/* Diagnóstico (Visible en impresión si no está vacío) */}
            <section className={diagnoses ? '' : 'hide-print'}>
              <h3 className="eb-garamond text-2xl font-bold border-b-2 border-slate-900 mb-4 uppercase tracking-wide">Diagnóstico Clínico</h3>
              <div className="no-print mb-3 relative">
                <input type="text" className="w-full bg-slate-100 rounded-xl px-10 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="Buscar diagnóstico CIE-10..." value={searchDx} onChange={e => setSearchDx(e.target.value)} />
                <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
                <Autocomplete items={catalogs.cie10} query={searchDx} getDisplayValue={it => it} onSelect={it => { setDiagnoses(p => p ? `${p}\n• ${it}` : `• ${it}`); setSearchDx(''); }} />
              </div>
              <textarea className="w-full bg-transparent outline-none font-bold text-[16pt] eb-garamond italic min-h-[60px] leading-tight text-slate-800" value={diagnoses} onChange={e => setDiagnoses(e.target.value)} placeholder="Describa el diagnóstico aquí..." />
            </section>

            {/* Tratamiento (Visible en impresión si no está vacío) */}
            <section className={meds.some(m => m.name) ? '' : 'hide-print'}>
              <h3 className="eb-garamond text-2xl font-bold border-b-2 border-slate-900 mb-6 uppercase tracking-wide">Plan de Tratamiento</h3>
              <div className="space-y-6">
                {meds.map((m, i) => (
                  <div key={i} className="border-l-8 border-indigo-600 pl-6 py-2 relative group transition-all hover:bg-indigo-50/50 rounded-r-xl">
                    <div className="flex items-baseline gap-2 no-print relative">
                      <input className="flex-1 font-black text-xl outline-none border-b border-transparent focus:border-indigo-200 bg-transparent" value={m.name} onChange={e => updateMed(i, 'name', e.target.value)} placeholder="Nombre del medicamento..." />
                      <Autocomplete items={catalogs.meds} query={m.name} getDisplayValue={it => it.name} onSelect={it => { const n = [...meds]; n[i] = {...it}; setMeds(n); }} />
                      <button onClick={() => setMeds(meds.filter((_, idx) => idx !== i))} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={20}/></button>
                    </div>
                    <span className="hidden print:inline text-[14pt] font-black uppercase tracking-tight">{m.name} {m.trade && `(${m.trade})`}</span>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2 text-[12pt] italic font-bold text-slate-700">
                      <p className="bg-white border px-3 py-1 rounded-lg print:p-0 print:border-none uppercase tracking-tighter">
                        <strong>{m.quantity}</strong> CADA <strong>{m.frequency}</strong> POR <strong>{m.duration}</strong>
                      </p>
                      {m.instructions && <p className="text-indigo-700">— {m.instructions}</p>}
                    </div>
                  </div>
                ))}
                <button onClick={() => setMeds([...meds, { name: '', quantity: '', frequency: '', duration: '', instructions: '' }])} className="no-print bg-slate-900 text-white text-xs font-black uppercase px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-black transition-all shadow-lg active:scale-95"><Plus size={18}/> AÑADIR MEDICAMENTO</button>
              </div>
            </section>

            {/* Estudios e Indicaciones (Visible en impresión si no está vacío) */}
            <section className={exams ? '' : 'hide-print'}>
              <h3 className="eb-garamond text-2xl font-bold border-b-2 border-slate-900 mb-4 uppercase tracking-wide">Indicaciones y Exámenes</h3>
              <div className="no-print mb-4 relative">
                <input type="text" className="w-full bg-slate-100 rounded-xl px-10 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="Buscar exámenes o indicaciones..." value={searchExams} onChange={e => setSearchExams(e.target.value)} />
                <Autocomplete items={catalogs.indicaciones} query={searchExams} getDisplayValue={it => it} onSelect={it => { setExams(p => p ? `${p}\n• ${it}` : `• ${it}`); setSearchExams(''); }} />
              </div>
              <textarea className="w-full bg-transparent outline-none italic text-[13pt] font-medium leading-relaxed min-h-[120px] text-slate-700 border-l-4 pl-4 border-slate-100" value={exams} onChange={e => setExams(e.target.value)} placeholder="Escriba aquí las indicaciones generales o exámenes solicitados..." />
            </section>
          </div>

          <footer className="mt-auto pt-16 flex flex-col items-center">
            <div className="w-72 border-t-2 border-slate-900 mb-2"></div>
            <p className="font-bold text-2xl eb-garamond uppercase tracking-tight text-slate-900">Dr. Modesto Morales Hoyos</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-1">Medicina Interna | Universidad Veracruzana</p>

            <div className="w-full grid grid-cols-3 items-end mt-16 border-t pt-6">
              <div className="flex flex-col items-center gap-1">
                <div className="bg-slate-50 p-2 rounded-xl border-2 border-indigo-50">
                   <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https%3A%2F%2Fsignos-vitales-reporte.netlify.app%2F" alt="QR" className="w-16 h-16" />
                </div>
                <span className="text-[8px] font-black text-center text-slate-400 leading-tight uppercase tracking-widest mt-1">Registra tu Presión Arterial</span>
              </div>
              <div className="text-center pb-4 flex flex-col items-center gap-2">
                <p className="text-[11pt] font-black italic text-indigo-700 border-b-2 border-indigo-100 pb-1">Cita: {new Date(appointment.date + 'T00:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short' })} • {appointment.time}</p>
                <div className="hidden print:block scale-75 opacity-70">
                   <Barcode value={folio} />
                </div>
              </div>
              <div className="text-right text-[10px] text-slate-500 font-bold leading-tight bg-slate-50 p-3 rounded-2xl border">
                <p>E. Zapata 13, Rafael Lucio, Ver.</p>
                <p>Urgencias: 228 837 0103</p>
                <p>Atención: 228 954 6865</p>
              </div>
            </div>
          </footer>
        </div>

        {/* Panel Administrativo (Solo pantalla) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 no-print pb-20">
          <div className="bg-white p-8 rounded-[2rem] shadow-xl border-2 border-slate-100 transition-all hover:border-indigo-100">
            <h3 className="text-xl font-bold mb-6 flex items-center gap-3 text-indigo-600"><CalendarIcon size={24}/> Programación de Cita</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Fecha</label>
                <input type="date" className="w-full bg-slate-50 border p-4 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-50 outline-none" value={appointment.date} onChange={e => setAppointment({...appointment, date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Hora</label>
                <input type="time" className="w-full bg-slate-50 border p-4 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-50 outline-none" value={appointment.time} onChange={e => setAppointment({...appointment, time: e.target.value})} />
              </div>
              <div className="col-span-2 space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Notas / Motivo</label>
                <input type="text" className="w-full bg-slate-50 border p-4 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-indigo-50 outline-none" placeholder="Motivo de seguimiento..." value={appointment.notes} onChange={e => setAppointment({...appointment, notes: e.target.value})} />
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-4 justify-center">
            <button onClick={handleSave} disabled={loading} className="group bg-indigo-600 hover:bg-indigo-700 text-white font-black py-6 rounded-[2rem] flex items-center justify-center gap-4 shadow-xl shadow-indigo-200 transition-all active:scale-95 text-xl uppercase tracking-widest disabled:opacity-50">
              <Save size={28} className="group-hover:scale-110 transition-transform"/> {loading ? 'Enviando Datos...' : 'Guardar Consulta'}
            </button>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={getWhatsAppSummary} className="group bg-emerald-500 hover:bg-emerald-600 text-white font-black py-5 rounded-[2rem] flex items-center justify-center gap-3 shadow-xl shadow-emerald-100 transition-all active:scale-95 uppercase tracking-tighter">
                <Send size={22} className="group-hover:translate-x-1 transition-transform"/> WhatsApp
              </button>
              <button onClick={handlePrint} className="group bg-slate-900 hover:bg-black text-white font-black py-5 rounded-[2rem] flex items-center justify-center gap-3 shadow-xl shadow-slate-200 transition-all active:scale-95 uppercase tracking-tighter">
                <Printer size={22} className="group-hover:-translate-y-1 transition-transform"/> Imprimir
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Pantalla de Carga */}
      {loading && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[200] flex flex-col items-center justify-center transition-all duration-300">
          <div className="bg-white p-12 rounded-[3rem] flex flex-col items-center gap-6 shadow-2xl border-2 border-indigo-50 animate-in zoom-in duration-300">
            <div className="relative">
              <RefreshCcw className="animate-spin text-indigo-600" size={64} />
              <Activity className="absolute inset-0 m-auto text-indigo-400 animate-pulse" size={24} />
            </div>
            <div className="text-center">
              <p className="font-black text-slate-900 uppercase tracking-[0.4em] mb-2">Sincronizando</p>
              <p className="text-slate-400 text-xs font-bold">Por favor, no cierre esta ventana...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
