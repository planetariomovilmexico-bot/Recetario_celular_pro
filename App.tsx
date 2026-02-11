import React, { useState, useEffect, useCallback } from 'react';
import { 
  Phone, Search, Plus, Trash2, Printer, 
  Save, Calendar as CalendarIcon, Send, 
  Lock, Activity, Weight, Ruler, Thermometer, Droplet,
  User, ClipboardList, Stethoscope, RefreshCcw, LogOut
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
  const [patient, setPatient] = useState<Patient>(INITIAL_PATIENT);
  const [subjetivo, setSubjetivo] = useState('');
  const [diagnoses, setDiagnoses] = useState('');
  const [meds, setMeds] = useState<Medication[]>([{ name: '', quantity: '', frequency: '', duration: '', instructions: '' }]);
  const [exams, setExams] = useState('');
  const [appointment, setAppointment] = useState({ date: '', time: '16:00', notes: 'consulta de seguimiento' });
  
  const [searchPhone, setSearchPhone] = useState('');
  const [searchDx, setSearchDx] = useState('');
  const [searchExams, setSearchExams] = useState('');
  const [lastConsultDate, setLastConsultDate] = useState('');

  useEffect(() => {
    const genFolio = () => {
      const now = new Date();
      const random = Math.floor(Math.random() * 9000 + 1000);
      return `MOR-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${random}`;
    };
    setFolio(genFolio());
    
    if (sessionStorage.getItem('session_unlocked') === '1') setIsLocked(false);
    
    const loadCatalogs = async () => {
      try {
        const data = await api.getCatalogs();
        setCatalogs(data);
      } catch (err) {
        console.error("Error catálogos:", err);
      }
    };
    loadCatalogs();
  }, []);

  const handleUnlock = () => {
    if (passcode === ACCESS_CODE) {
      sessionStorage.setItem('session_unlocked', '1');
      setIsLocked(false);
    } else {
      alert("Acceso denegado");
      setPasscode('');
    }
  };

  const handleFetchPatient = async () => {
    const phone = searchPhone.trim();
    if (!/^\d{10}$/.test(phone)) return alert("El celular debe tener 10 dígitos");
    
    setLoading(true);
    try {
      const res = await api.getLastByPhone(phone);
      if (res && res.data) {
        const d = res.data;
        // Mapear datos del paciente desde el objeto retornado por Apps Script
        const loadedPatient: Patient = {
          ...INITIAL_PATIENT,
          ...d.patient,
          phone: phone // Mantener el teléfono buscado
        };
        
        setPatient(loadedPatient);
        setSubjetivo(d.subjetivo || '');
        setDiagnoses(d.diagnoses || '');
        // Asegurar que meds sea un array
        const loadedMeds = Array.isArray(d.meds) ? d.meds : [];
        setMeds(loadedMeds.length ? loadedMeds : [{ name: '', quantity: '', frequency: '', duration: '', instructions: '' }]);
        setExams(d.exams || '');
        setLastConsultDate(d.last_date || '');
        
        console.log("Paciente cargado:", d.patient.name);
      } else {
        alert("Paciente no encontrado. Iniciando consulta nueva.");
        setPatient({ ...INITIAL_PATIENT, phone: phone });
        setLastConsultDate('');
        setDiagnoses('');
        setMeds([{ name: '', quantity: '', frequency: '', duration: '', instructions: '' }]);
      }
    } catch (err) {
      console.error(err);
      alert("Error al conectar con la base de datos.");
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
      const bmiClass = bmi < 18.5 ? 'Bajo peso' : bmi <= 24.9 ? 'Normal' : bmi <= 29.9 ? 'Sobrepeso' : 'Obesidad';
      setPatient(p => ({ ...p, imc: bmi.toFixed(1), imc_class: bmiClass }));
    } else {
      setPatient(p => ({ ...p, imc: '', imc_class: '' }));
    }
  }, [patient.weight, patient.height]);

  useEffect(() => { calculateBMI(); }, [patient.weight, patient.height, calculateBMI]);

  const updateMed = (idx: number, field: keyof Medication, val: string) => {
    const newMeds = [...meds];
    newMeds[idx] = { ...newMeds[idx], [field]: val };
    setMeds(newMeds);
  };

  const addMed = () => setMeds([...meds, { name: '', quantity: '', frequency: '', duration: '', instructions: '' }]);
  const removeMed = (idx: number) => setMeds(meds.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!patient.name || !patient.phone) return alert("Nombre y celular son obligatorios");
    
    setLoading(true);
    try {
      await api.saveConsulta({
        folio,
        patient,
        subjetivo,
        diagnoses,
        meds,
        exams,
        date: new Date().toLocaleDateString('es-MX')
      });
      alert("✓ Consulta guardada correctamente en Google Sheets");
    } catch (err) {
      alert("Error al guardar: " + err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    // Usar un pequeño timeout para asegurar que el DOM esté listo antes de imprimir
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const getWhatsAppSummary = () => {
    const name = patient.name.split(' ')[0] || 'Paciente';
    const medsText = meds.map(m => `• *${m.name}* ${m.trade || m.commercial ? `(${m.trade || m.commercial})` : ''}: ${m.quantity} cada ${m.frequency} por ${m.duration}`).join('\n');
    const text = `Hola *${name}*, resumen de tu consulta:\n*Folio:* ${folio}\n*Signos:* TA ${patient.ta_sis}/${patient.ta_dia} mmHg, FC ${patient.fc} lpm\n*Tratamiento:*\n${medsText}\n${exams ? `\n*Exámenes:* ${exams}` : ''}`;
    window.open(`https://wa.me/52${patient.phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const resetForm = () => {
    setPatient(INITIAL_PATIENT);
    setSearchPhone('');
    setSubjetivo('');
    setDiagnoses('');
    setMeds([{ name: '', quantity: '', frequency: '', duration: '', instructions: '' }]);
    setExams('');
    setLastConsultDate('');
  };

  if (isLocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md text-center border border-slate-700">
          <div className="bg-slate-50 text-slate-900 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <Lock size={40} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 eb-garamond mb-2">Acceso Médico</h1>
          <p className="text-slate-500 mb-8">Dr. Modesto Morales Hoyos</p>
          <input
            type="password"
            className="w-full h-16 text-center text-4xl tracking-[0.5em] border-2 border-slate-100 rounded-2xl focus:border-blue-600 outline-none transition-all mb-6 bg-slate-50 font-mono"
            placeholder="••••••"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
          />
          <button
            onClick={handleUnlock}
            className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-2xl transition-all shadow-lg"
          >
            Autenticar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Navbar & Search */}
      <nav className="sticky top-0 z-50 bg-slate-900 text-white shadow-lg no-print">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Stethoscope className="text-blue-400" size={24} />
            <span className="eb-garamond text-xl font-bold hidden sm:inline">Dr. Modesto Morales</span>
          </div>
          
          <div className="flex-1 max-w-lg relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Phone size={18} className="text-slate-400" />
            </div>
            <input 
              type="tel" 
              placeholder="Buscar paciente por 10 dígitos..." 
              className="w-full bg-slate-800 border-none rounded-full px-12 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFetchPatient()}
            />
            <button 
              onClick={handleFetchPatient}
              className="absolute right-1 top-1 bg-blue-600 p-1.5 rounded-full hover:bg-blue-700 transition-colors"
            >
              <Search size={18} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={resetForm} title="Nueva consulta" className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-all">
              <RefreshCcw size={20} />
            </button>
            <button onClick={() => { sessionStorage.removeItem('session_unlocked'); setIsLocked(true); }} className="p-2 hover:bg-red-900/20 rounded-full text-slate-400 hover:text-red-400 transition-all">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
        {/* Prescription Sheet */}
        <div className="recipe-card bg-white shadow-2xl rounded-sm p-8 md:p-14 min-h-[10.5in] border border-slate-200 flex flex-col">
          {/* Header Print */}
          <header className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
            <div className="flex gap-6 items-center">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https%3A%2F%2Fwa.me%2F522288370103" className="w-20 h-20" alt="Consultorio QR" />
              <div>
                <h1 className="eb-garamond text-4xl font-bold text-slate-900 tracking-tight">Dr. Modesto Morales Hoyos</h1>
                <h2 className="eb-garamond text-2xl text-slate-700">Médico Internista</h2>
                <div className="text-[11px] text-slate-500 mt-1 uppercase font-semibold space-y-0.5">
                  <p>Universidad Veracruzana | Céd. Prof. 1219623 | Céd. Esp. 3352905</p>
                  <p>Especialista en Diagnóstico y Control de Enfermedades Crónicas</p>
                </div>
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="mb-2">
                <Barcode value={folio} />
              </div>
              <p className="text-xs font-bold text-slate-900 uppercase">Folio: {folio}</p>
              <p className="text-xs text-slate-400 mt-1">{new Date().toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</p>
            </div>
          </header>

          {/* Patient Data Grid */}
          <section className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8 bg-slate-50 p-6 rounded-xl border border-slate-100 no-print">
            <div className="md:col-span-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Nombre del Paciente</label>
              <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 focus-within:border-blue-500 transition-all">
                <User size={18} className="text-slate-400" />
                <input 
                  type="text" 
                  className="w-full outline-none font-bold text-slate-800"
                  placeholder="Ej. Juan Pérez García"
                  value={patient.name}
                  onChange={(e) => setPatient({...patient, name: e.target.value})}
                />
              </div>
            </div>
            <div className="md:col-span-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Edad</label>
              <input 
                type="text" 
                className="w-full bg-white p-3 rounded-lg border border-slate-200 outline-none text-center font-semibold"
                value={patient.age}
                onChange={(e) => setPatient({...patient, age: e.target.value})}
                placeholder="--"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Celular de Contacto</label>
              <input 
                type="text" 
                className="w-full bg-white p-3 rounded-lg border border-slate-200 outline-none font-semibold"
                value={patient.phone}
                onChange={(e) => setPatient({...patient, phone: e.target.value})}
                placeholder="10 dígitos"
              />
            </div>
          </section>

          {/* Print version of patient data */}
          <section className="print-only mb-8 text-sm border-b border-slate-200 pb-4">
            <div className="flex gap-8">
              <p><strong>PACIENTE:</strong> <span className="uppercase">{patient.name || '___________________________'}</span></p>
              <p><strong>EDAD:</strong> {patient.age || '___'} Años</p>
              <p><strong>TEL:</strong> {patient.phone || '__________'}</p>
            </div>
          </section>

          {/* Vital Signs */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-10 border-y border-slate-100 py-6">
            <div className="flex flex-col items-center group">
              <Activity size={16} className="text-blue-500 mb-2" />
              <span className="text-[10px] font-bold text-slate-400 uppercase">Presión</span>
              <div className="flex items-center gap-1 font-black text-slate-800">
                 <input type="text" className="w-10 text-center bg-transparent border-b border-transparent group-hover:border-slate-300 outline-none" value={patient.ta_sis} onChange={(e) => setPatient({...patient, ta_sis: e.target.value})} placeholder="120" />
                 <span className="text-slate-300">/</span>
                 <input type="text" className="w-10 text-center bg-transparent border-b border-transparent group-hover:border-slate-300 outline-none" value={patient.ta_dia} onChange={(e) => setPatient({...patient, ta_dia: e.target.value})} placeholder="80" />
              </div>
            </div>
            <div className="flex flex-col items-center group">
              <Droplet size={16} className="text-red-500 mb-2" />
              <span className="text-[10px] font-bold text-slate-400 uppercase">F. Cardíaca</span>
              <input type="text" className="w-16 text-center bg-transparent border-b border-transparent group-hover:border-slate-300 outline-none font-black text-slate-800" value={patient.fc} onChange={(e) => setPatient({...patient, fc: e.target.value})} placeholder="72" />
            </div>
            <div className="flex flex-col items-center group">
              <Thermometer size={16} className="text-amber-500 mb-2" />
              <span className="text-[10px] font-bold text-slate-400 uppercase">Temp</span>
              <input type="text" className="w-16 text-center bg-transparent border-b border-transparent group-hover:border-slate-300 outline-none font-black text-slate-800" value={patient.temp} onChange={(e) => setPatient({...patient, temp: e.target.value})} placeholder="36.5" />
            </div>
            <div className="flex flex-col items-center group">
              <Weight size={16} className="text-slate-600 mb-2" />
              <span className="text-[10px] font-bold text-slate-400 uppercase">Peso</span>
              <input type="text" className="w-16 text-center bg-transparent border-b border-transparent group-hover:border-slate-300 outline-none font-black text-slate-800" value={patient.weight} onChange={(e) => setPatient({...patient, weight: e.target.value})} placeholder="70" />
            </div>
            <div className="flex flex-col items-center group">
              <Ruler size={16} className="text-slate-600 mb-2" />
              <span className="text-[10px] font-bold text-slate-400 uppercase">Talla</span>
              <input type="text" className="w-16 text-center bg-transparent border-b border-transparent group-hover:border-slate-300 outline-none font-black text-slate-800" value={patient.height} onChange={(e) => setPatient({...patient, height: e.target.value})} placeholder="1.70" />
            </div>
            <div className="flex flex-col items-center bg-slate-50 rounded-lg p-2 border border-slate-100">
              <span className="text-[10px] font-black text-blue-600 uppercase">IMC</span>
              <div className="text-lg font-black text-slate-900">{patient.imc || '--'}</div>
              <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{patient.imc_class || '...'}</div>
            </div>
          </div>

          {/* Diagnosis & Treatment */}
          <div className="flex-1 flex flex-col gap-8">
            {/* Subjetivo no se imprime */}
            <section className="no-print bg-amber-50/30 p-4 rounded-xl border border-amber-100">
               <div className="flex items-center gap-2 mb-3 text-amber-800 font-bold text-sm">
                  <ClipboardList size={18} /> Notas Subjetivas (Interno)
               </div>
               <textarea 
                 className="w-full bg-transparent outline-none min-h-[80px] text-sm text-slate-700 placeholder:text-amber-300" 
                 placeholder="Sintomatología, motivo de consulta..."
                 value={subjetivo}
                 onChange={(e) => setSubjetivo(e.target.value)}
               />
            </section>

            {/* Diagnóstico CIE-10 */}
            <section>
               <h3 className="eb-garamond text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">Diagnóstico</h3>
               <div className="relative no-print mb-4">
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Buscar diagnóstico..."
                    value={searchDx}
                    onChange={(e) => setSearchDx(e.target.value)}
                  />
                  <Autocomplete<string> 
                    items={catalogs.cie10} 
                    query={searchDx} 
                    getDisplayValue={(it) => it}
                    onSelect={(it) => {
                      setDiagnoses(prev => prev ? `${prev}\n• ${it}` : `• ${it}`);
                      setSearchDx('');
                    }}
                  />
               </div>
               <textarea 
                 className="w-full bg-transparent outline-none font-bold text-slate-800 text-lg eb-garamond min-h-[60px]" 
                 value={diagnoses}
                 onChange={(e) => setDiagnoses(e.target.value)}
                 placeholder="Especifique diagnósticos..."
               />
            </section>

            {/* Prescripción Médica */}
            <section>
              <h3 className="eb-garamond text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-6">Prescripción Médica</h3>
              <div className="space-y-6">
                {meds.map((med, idx) => (
                  <div key={idx} className="group relative border-l-2 border-slate-900 pl-5 py-1">
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="flex-1 min-w-[250px] relative">
                        <input 
                          type="text" 
                          className="w-full font-bold text-xl text-slate-900 outline-none bg-transparent"
                          placeholder="Medicamento"
                          value={med.name}
                          onChange={(e) => updateMed(idx, 'name', e.target.value)}
                        />
                        <Autocomplete<Medication>
                          items={catalogs.meds}
                          query={med.name}
                          getDisplayValue={(it) => it.name}
                          onSelect={(it) => {
                             const newMeds = [...meds];
                             newMeds[idx] = { ...it };
                             setMeds(newMeds);
                          }}
                        />
                      </div>
                      <div className="w-32 no-print">
                        <input 
                          type="text" 
                          className="w-full text-xs font-bold text-slate-400 border-b border-slate-100 outline-none pb-1"
                          placeholder="Cantidad"
                          value={med.quantity}
                          onChange={(e) => updateMed(idx, 'quantity', e.target.value)}
                        />
                      </div>
                      <button onClick={() => removeMed(idx)} className="no-print p-2 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="mt-2">
                       <p className="text-slate-800 text-base font-semibold italic">
                         {med.quantity} {med.frequency} {med.duration}
                       </p>
                       {med.instructions && (
                         <p className="text-slate-600 text-sm font-medium border-l-2 border-slate-200 pl-4 mt-1">— {med.instructions}</p>
                       )}
                    </div>
                  </div>
                ))}
                <button 
                  onClick={addMed} 
                  className="no-print flex items-center gap-2 text-slate-400 font-bold text-xs hover:text-slate-900 transition-all uppercase tracking-widest mt-4"
                >
                  <Plus size={14} /> Añadir Fármaco
                </button>
              </div>
            </section>

            {/* Estudios e Indicaciones */}
            <section>
              <h3 className="eb-garamond text-2xl font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">Indicaciones y Exámenes</h3>
              <div className="relative no-print mb-4">
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Sugerencias..."
                    value={searchExams}
                    onChange={(e) => setSearchExams(e.target.value)}
                  />
                  <Autocomplete<string> 
                    items={catalogs.indicaciones} 
                    query={searchExams} 
                    getDisplayValue={(it) => it}
                    onSelect={(it) => {
                      setExams(prev => prev ? `${prev}\n• ${it}` : `• ${it}`);
                      setSearchExams('');
                    }}
                  />
              </div>
              <textarea 
                className="w-full bg-transparent outline-none min-h-[100px] text-slate-700 font-medium leading-relaxed italic" 
                value={exams}
                onChange={(e) => setExams(e.target.value)}
                placeholder="Indique recomendaciones higiénico-dietéticas o estudios..."
              />
            </section>
          </div>

          {/* Footer Receta */}
          <footer className="mt-auto pt-16 flex flex-col items-center">
            <div className="w-64 border-t-2 border-slate-900 mb-2"></div>
            <p className="font-bold text-slate-900 text-lg eb-garamond">Dr. Modesto Morales Hoyos</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold">Firma y Sello del Médico</p>

            <div className="w-full flex justify-between items-end mt-12 border-t border-slate-100 pt-6">
               <div className="flex items-center gap-4">
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=https%3A%2F%2Fsignos-vitales-reporte.netlify.app%2F" alt="Vitals QR" className="w-16 h-16 opacity-80" />
                  <p className="text-[9px] leading-tight text-slate-500 font-bold uppercase max-w-[150px]">
                    Registre su presión arterial aquí para seguimiento médico remoto.
                  </p>
               </div>
               <div className="text-[10px] text-slate-400 text-right font-medium">
                  <p>Emiliano Zapata 13, Rafael Lucio, Ver.</p>
                  <p>Citas: 228 837 0103 / 228 954 6865</p>
               </div>
            </div>
          </footer>
        </div>

        {/* Sidebar Actions & Appointment */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 no-print pb-10">
          {/* Cita Section */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-lg border border-slate-200 p-8">
            <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
              <CalendarIcon size={24} className="text-blue-600" /> Próxima Cita
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
               <div className="space-y-2">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha</label>
                 <input 
                   type="date" 
                   className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                   value={appointment.date}
                   onChange={(e) => setAppointment({...appointment, date: e.target.value})}
                 />
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hora</label>
                 <input 
                   type="time" 
                   className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                   value={appointment.time}
                   onChange={(e) => setAppointment({...appointment, time: e.target.value})}
                 />
               </div>
               <div className="sm:col-span-2 space-y-2">
                 <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Observaciones de la Cita</label>
                 <input 
                   type="text" 
                   className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                   placeholder="Ej. Ayuno, traer laboratorios..."
                   value={appointment.notes}
                   onChange={(e) => setAppointment({...appointment, notes: e.target.value})}
                 />
               </div>
            </div>
            <div className="flex gap-4 mt-8">
               <button 
                 onClick={async () => {
                   setLoading(true);
                   try {
                     await api.saveAppointment({
                       phone: patient.phone,
                       name: patient.name,
                       date: appointment.date,
                       time: appointment.time,
                       notes: appointment.notes
                     });
                     alert("Cita guardada correctamente");
                   } catch (err) { alert("Error al agendar"); }
                   finally { setLoading(false); }
                 }}
                 disabled={loading}
                 className="flex-1 bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all disabled:opacity-50"
               >
                 <Save size={20} /> Guardar Cita
               </button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <button 
              onClick={handleSave}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-3xl flex items-center justify-center gap-3 shadow-xl shadow-blue-200 transition-all disabled:opacity-50"
            >
              <Save size={24} /> Guardar Consulta
            </button>
            <button 
              onClick={getWhatsAppSummary}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-5 rounded-3xl flex items-center justify-center gap-3 shadow-xl shadow-emerald-200 transition-all"
            >
              <Send size={24} /> WhatsApp
            </button>
            <button 
              onClick={handlePrint}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold py-5 rounded-3xl flex items-center justify-center gap-3 transition-all border border-slate-200"
            >
              <Printer size={24} /> Imprimir Receta
            </button>
          </div>
        </div>
      </main>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center no-print">
          <div className="bg-white p-10 rounded-[2rem] shadow-2xl flex flex-col items-center gap-4">
            <div className="w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="font-bold text-slate-900 text-xl tracking-tight">Procesando solicitud...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;