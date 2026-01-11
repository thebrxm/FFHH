
import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Clipboard, MapPin, Activity, Stethoscope, FileText, 
  Send, Copy, FileDown, Sparkles, AlertCircle, Clock, Trash2,
  AlertTriangle, CheckCircle, X, Moon, Sun, RefreshCw,
  Search, Calendar, History, MessageSquare, Check, Eye
} from 'lucide-react';
import Section from './components/Section';
import SignaturePad from './components/SignaturePad';
import { IncidentReport, initialReport, TriageLevel, Derivacion, SeguimientoTipo, TiempoUlterior } from './types';
import { analyzeNarrative, generateProfessionalSummary } from './services/geminiService';

const App: React.FC = () => {
  const [report, setReport] = useState<IncidentReport>(initialReport);
  const [signature, setSignature] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [professionalSummary, setProfessionalSummary] = useState<string>('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  const lastGeneratedPrefix = useRef('');

  const triageOptions: Record<TriageLevel, string[]> = {
    'ROJO': ['Disociación', 'Excitación psicomotriz', 'Intencionalidad suicida', 'Alteraciones sesoperceptivas', 'Ideación delirante', 'Otra'],
    'AMARILLO': ['Amnesia', 'Reexperimentación psico y/o somatoforme', 'Reacciones panicosas', 'Otra'],
    'VERDE': ['Reacciones de tristeza/irritabilidade', 'Emociones secundarias', 'Negación', 'Personalización Tipo 1', 'Personalización Tipo 2', 'Otra'],
    '': []
  };

  const generateReportPrefix = (r: IncidentReport) => {
    const nombre = r.apellidoNombre || '_______';
    const edad = r.edad || '___';
    const sexoDisplay = r.sexo === 'M' ? 'Masculino' : r.sexo === 'F' ? 'Femenino' : '____';
    const dni = r.dni || '_______';
    let clinica = '';
    if (r.triageClinica) {
      const valorClinica = r.triageClinica === 'Otra' ? (r.otroTriageClinicaInput || '_______') : r.triageClinica;
      clinica = `\nPresenta: ${valorClinica}.`;
    }
    return `${nombre}, ${edad} años, de sexo ${sexoDisplay}, DNI: ${dni}.${clinica}\n`;
  };

  useEffect(() => {
    const newPrefix = generateReportPrefix(report);
    setReport(prev => {
      const currentRelato = prev.relato;
      if (!currentRelato || currentRelato === lastGeneratedPrefix.current || currentRelato.startsWith(lastGeneratedPrefix.current)) {
        const userText = currentRelato.startsWith(lastGeneratedPrefix.current) 
          ? currentRelato.slice(lastGeneratedPrefix.current.length) 
          : '';
        const updatedRelato = newPrefix + userText;
        lastGeneratedPrefix.current = newPrefix;
        return { ...prev, relato: updatedRelato };
      }
      return prev;
    });
  }, [report.apellidoNombre, report.edad, report.sexo, report.dni, report.triageClinica, report.otroTriageClinicaInput]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { id, name, value, type } = e.target;
    const fieldId = id || name;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setReport(prev => ({ ...prev, [fieldId]: checked }));
    } else {
      setReport(prev => ({ ...prev, [fieldId]: value }));
    }
  };

  const toggleCheckbox = (field: keyof IncidentReport) => {
    setReport(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleDerivacionToggle = (val: Derivacion) => {
    setReport(prev => {
      const isSelected = prev.tipoDerivacion.includes(val);
      const updated = isSelected 
        ? prev.tipoDerivacion.filter(v => v !== val)
        : [...prev.tipoDerivacion, val];
      return { ...prev, tipoDerivacion: updated };
    });
  };

  const handleTriageChange = (level: TriageLevel) => {
    setReport(prev => ({ ...prev, triage: level, triageClinica: '', otroTriageClinicaInput: '' }));
  };

  const handleTriageClinicaSelect = (option: string) => {
    setReport(prev => ({ ...prev, triageClinica: option }));
  };

  const handleAiAnalyze = async () => {
    if (!report.relato) return;
    setIsAnalyzing(true);
    const result = await analyzeNarrative(report.relato);
    if (result) {
      setReport(prev => ({ 
        ...prev, 
        triage: (result.suggestedTriage as TriageLevel) || prev.triage,
        relato: result.refinedRelato || prev.relato
      }));
    }
    setIsAnalyzing(false);
  };

  const handleGenerateSummary = async () => {
    setIsGeneratingSummary(true);
    const summary = await generateProfessionalSummary(report);
    setProfessionalSummary(summary || '');
    setIsGeneratingSummary(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const copyToClipboard = () => {
    const textToCopy = `
REPORTE DE INCIDENTE - FACTORES HUMANOS SAME
-------------------------------------------
Fecha: ${report.fecha}
Hora: ${report.hora}
Población: ${report.poblacion === 'personal' ? 'Propio Personal' : 'Población General'}
Paciente: ${report.apellidoNombre || 'N/A'}
DNI: ${report.dni || 'N/A'}
Edad: ${report.edad || 'N/A'}
Sexo: ${report.sexo || 'N/A'}
Lugar: ${report.lugar || 'N/A'} (${report.tipoLugar})
Triage: ${report.triage}
Manifestación: ${report.triageClinica}
Relato: ${report.relato}

Resumen técnico:
${professionalSummary}
    `.trim();

    navigator.clipboard.writeText(textToCopy).then(() => {
      alert('Reporte copiado al portapapeles correctamente.');
    }).catch(err => {
      console.error('Error al copiar:', err);
    });
  };

  const handleFinalize = () => {
    setIsConfirmModalOpen(false);
    alert('Reporte enviado correctamente a la central de Factores Humanos.');
  };

  const handleReset = () => {
    setReport(initialReport);
    setSignature(null);
    setProfessionalSummary('');
    setIsResetConfirmOpen(false);
    lastGeneratedPrefix.current = '';
  };

  const getTriageColor = (level: string) => {
    switch(level) {
      case 'ROJO': return 'bg-red-600 shadow-lg shadow-red-500/30';
      case 'AMARILLO': return 'bg-amber-500 shadow-lg shadow-amber-500/30';
      case 'VERDE': return 'bg-emerald-600 shadow-lg shadow-emerald-500/30';
      default: return 'bg-slate-300';
    }
  };

  const inputClasses = `w-full px-5 py-3.5 rounded-2xl border transition-all duration-300 outline-none focus:ring-4 focus:ring-blue-500/10 ${isDarkMode ? 'bg-slate-800/60 border-slate-700 text-white focus:border-blue-500/50 placeholder-slate-500' : 'bg-slate-100 border-slate-300 text-slate-950 focus:border-blue-700 placeholder-slate-400 font-medium'}`;
  const labelClasses = `block text-[11px] font-black uppercase tracking-widest mb-2.5 ${isDarkMode ? 'text-slate-400' : 'text-black'}`;

  // Vista Previa con Colores Corregidos (Todo oscuro sobre fondo blanco)
  const ReportPreview = () => (
    <div className="print-modal-content bg-white w-full max-w-4xl mx-auto rounded-[40px] shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-500">
      {/* Header PDF */}
      <div className="p-10 border-b-4 border-blue-600 flex justify-between items-center bg-slate-50">
        <div className="flex items-center gap-6">
          <img src="https://raw.githubusercontent.com/same-ba/assets/main/logo.jpg" alt="SAME" className="w-24 h-24 rounded-full border-2 border-white shadow-md" />
          <div>
            <h2 className="text-3xl font-black text-slate-950 tracking-tighter uppercase">Factores Humanos</h2>
            <p className="text-blue-600 font-black text-sm tracking-widest uppercase">Reporte Profesional de Incidente</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Fecha de Emisión</p>
          <p className="text-lg font-bold text-slate-900">{new Date().toLocaleDateString('es-AR')}</p>
        </div>
      </div>

      {/* Body PDF */}
      <div className="p-12 space-y-12 bg-white">
        {/* Grilla de Datos Generales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Población</p>
            <p className="text-sm font-bold text-slate-950 uppercase">{report.poblacion === 'personal' ? 'Propio Personal' : 'Población General'}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Función</p>
            <p className="text-sm font-bold text-slate-950">{report.funcion || 'N/A'}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Años/Antigüedad</p>
            <p className="text-sm font-bold text-slate-950">{report.anos || 'N/A'}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Referente</p>
            <p className="text-sm font-bold text-slate-950">{report.referente || 'N/A'}</p>
          </div>
        </div>

        {/* Datos del Paciente e Incidente */}
        <div className="p-8 bg-blue-50 rounded-3xl border border-blue-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest border-b border-blue-200 pb-2">Identificación</h4>
              <p className="text-xl font-black text-slate-950">{report.apellidoNombre || 'SIN NOMBRE'}</p>
              <div className="flex gap-6 text-sm">
                <p><span className="font-bold text-slate-400">DNI:</span> <span className="text-slate-950">{report.dni || '---'}</span></p>
                <p><span className="font-bold text-slate-400">EDAD:</span> <span className="text-slate-950">{report.edad || '--'}</span></p>
                <p><span className="font-bold text-slate-400">SEXO:</span> <span className="text-slate-950">{report.sexo || '-'}</span></p>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest border-b border-blue-200 pb-2">Escenario</h4>
              <p className="text-sm font-bold text-slate-950 flex items-center gap-2"><MapPin size={14} /> {report.lugar || 'Ubicación no especificada'}</p>
              <div className="flex gap-6 text-sm text-slate-700">
                <p><span className="font-bold uppercase text-[10px] text-slate-400">Fecha:</span> {report.fecha}</p>
                <p><span className="font-bold uppercase text-[10px] text-slate-400">Hora:</span> {report.hora}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Triage y Relato */}
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className={`px-6 py-2 rounded-full text-white text-xs font-black tracking-widest ${getTriageColor(report.triage)}`}>
              TRIAGE: {report.triage || 'PENDIENTE'}
            </div>
            <p className="text-sm font-bold text-slate-700">{report.triageClinica}</p>
          </div>
          <div className="p-8 border-2 border-slate-100 rounded-3xl">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Descripción del incidente</p>
             <p className="text-base leading-relaxed text-slate-800 font-medium whitespace-pre-wrap">{report.relato || 'Sin descripción registrada.'}</p>
          </div>
        </div>

        {/* Prestación y Prosecución */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Stethoscope size={14} /> Prestación</h4>
            <div className="text-sm space-y-2">
              <p><span className="font-bold text-slate-500">Duración:</span> <span className="text-slate-950 font-bold">{report.duracion || '--'}</span></p>
              <p><span className="font-bold uppercase text-[10px] text-slate-500">Modalidad:</span> <span className="text-slate-950 font-bold">{report.entrevista}</span></p>
              <div className="flex gap-3 mt-4">
                {report.contactoTelefonico && <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-lg text-[10px] font-black uppercase">Teléfono</span>}
                {report.seguimiento && <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-lg text-[10px] font-black uppercase">Seguimiento</span>}
                {report.datosEstres && <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-lg text-[10px] font-black uppercase">Estrés</span>}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><FileText size={14} /> Prosecución</h4>
            <div className="text-sm space-y-2">
              <p><span className="font-bold text-slate-500">Derivación:</span> <span className="text-slate-950 font-bold">{report.derivacion || 'No especificada'}</span></p>
              <div className="flex flex-wrap gap-2 mt-2">
                {report.tipoDerivacion.map(d => <span key={d} className="bg-orange-100 text-orange-800 px-3 py-1 rounded-lg text-[10px] font-black uppercase">{d}</span>)}
              </div>
            </div>
          </div>
        </div>

        {/* Resumen IA y Firma */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-8 border-t border-slate-100">
           <div className="space-y-4">
            <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2"><Sparkles size={14} /> Resumen técnico</h4>
            <p className="text-sm italic text-slate-700 leading-relaxed font-medium">{professionalSummary || 'Sin resumen generado.'}</p>
          </div>
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50">
            {signature ? (
              <img src={signature} alt="Firma" className="max-h-24 object-contain" />
            ) : (
              <p className="text-xs font-black text-slate-400 uppercase italic">Firma no registrada</p>
            )}
            <p className="mt-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Firma del Profesional Responsable</p>
          </div>
        </div>
      </div>
      
      {/* Footer Modal Acciones */}
      <div className="p-8 bg-slate-50 border-t border-slate-200 flex justify-between items-center no-print">
        <button onClick={() => setIsPreviewOpen(false)} className="px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-all flex items-center gap-2">
          <X size={18} /> Cerrar Vista
        </button>
        <button onClick={handlePrint} className="px-12 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center gap-3">
          <FileDown size={18} /> Exportar Reporte PDF
        </button>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen transition-all duration-500`}>
      <div className="max-w-5xl mx-auto px-6 py-16 pb-48">
        
        {/* Modern Header */}
        <header className="relative mb-20 flex flex-col items-center">
          <div className="absolute top-0 right-0 flex gap-4 no-print">
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-4 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center ${isDarkMode ? 'bg-slate-800 text-yellow-400 border border-slate-700 ring-1 ring-white/5' : 'bg-white text-slate-900 border border-slate-300 ring-1 ring-black/5 hover:bg-slate-100 shadow-md'}`}
              title="Alternar Modo"
            >
              {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
            </button>
            <button
              type="button"
              onClick={() => setIsResetConfirmOpen(true)}
              className={`p-4 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center ${isDarkMode ? 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-red-400 ring-1 ring-white/5' : 'bg-white text-slate-900 border border-slate-300 hover:text-red-600 ring-1 ring-black/5 shadow-md'}`}
              title="Reiniciar Reporte"
            >
              <RefreshCw size={24} />
            </button>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-10 text-center md:text-left">
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition duration-1000"></div>
              <img 
                src="https://raw.githubusercontent.com/same-ba/assets/main/logo.jpg" 
                alt="SAME Logo" 
                className="relative w-32 h-32 md:w-36 md:h-36 object-contain rounded-full border-4 border-white dark:border-slate-800 bg-white shadow-xl transform transition-transform group-hover:scale-105"
                onError={(e) => { (e.target as HTMLImageElement).src = "https://api.placeholder.com/150"; }}
              />
            </div>
            
            <div>
              <h1 className={`text-5xl md:text-6xl font-black tracking-tighter mb-4 leading-tight ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                Factores <span className="text-blue-600">Humanos</span>
              </h1>
              <div className="flex flex-col md:flex-row items-center gap-4">
                <span className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest ${isDarkMode ? 'bg-blue-900/40 text-blue-300 border border-blue-800/50' : 'bg-blue-700 text-white shadow-lg'}`}>
                  Reporte de Incidente
                </span>
                <span className={`text-sm font-black tracking-wide ${isDarkMode ? 'text-slate-500' : 'text-slate-900'}`}>
                  SAME Buenos Aires · Argentina
                </span>
              </div>
            </div>
          </div>
        </header>

        <form className="space-y-10">
          <Section title="DATOS" icon={<Clipboard size={22} />} headerColor="border-blue-600" className="w-full">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              <div>
                <label className={labelClasses}>Ámbito de actuación</label>
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { value: 'general', label: 'Población General' },
                    { value: 'personal', label: 'Propio Personal' }
                  ].map((option) => (
                    <label key={option.value} className={`relative flex items-center justify-center p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      report.poblacion === option.value 
                        ? (isDarkMode ? 'bg-blue-600 text-white border-blue-500 shadow-lg' : 'bg-slate-900 text-white border-slate-950 shadow-md')
                        : (isDarkMode ? 'bg-slate-800/40 border-slate-700 text-slate-500 hover:border-slate-500' : 'bg-white border-slate-300 text-slate-900 hover:border-slate-400')
                    }`}>
                      <input type="radio" name="poblacion" value={option.value} checked={report.poblacion === option.value} onChange={handleChange} className="hidden" />
                      <span className="text-[11px] font-black uppercase tracking-widest text-center">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <label htmlFor="funcion" className={labelClasses}>Función</label>
                  <input id="funcion" type="text" value={report.funcion} onChange={handleChange} className={inputClasses} placeholder="Puesto / Cargo" />
                </div>
                <div>
                  <label htmlFor="anos" className={labelClasses}>Años</label>
                  <input id="anos" type="number" value={report.anos} onChange={handleChange} className={inputClasses} placeholder="Ej.: 21" />
                </div>
              </div>
              <div>
                <label htmlFor="referente" className={labelClasses}>Referente</label>
                <textarea id="referente" value={report.referente} onChange={handleChange} className={`${inputClasses} h-[130px] resize-none`} placeholder="Nombre del referente..." />
              </div>
            </div>
          </Section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-stretch">
            <Section title="Identificación" icon={<User size={22} />} headerColor="border-indigo-600" className="h-full">
              <div className="space-y-8">
                <div>
                  <label htmlFor="apellidoNombre" className={labelClasses}>Apellido y Nombre</label>
                  <div className="relative">
                    <Search className={`absolute left-5 top-1/2 -translate-y-1/2 ${isDarkMode ? 'text-slate-400' : 'text-slate-800'} no-print`} size={18} />
                    <input id="apellidoNombre" value={report.apellidoNombre} onChange={handleChange} className={`${inputClasses} pl-14`} placeholder="Ej: Perez, Juan" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="dni" className={labelClasses}>DNI / ID</label>
                    <input id="dni" type="text" value={report.dni} onChange={handleChange} className={inputClasses} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="edad" className={labelClasses}>Edad</label>
                      <input id="edad" type="number" value={report.edad} onChange={handleChange} className={inputClasses} />
                    </div>
                    <div>
                      <label className={labelClasses}>Sexo</label>
                      <div className="flex bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-2xl h-[58px] border border-slate-300 dark:border-slate-700 shadow-inner">
                        {['M', 'F'].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setReport(prev => ({ ...prev, sexo: val as any }))}
                            className={`flex-1 rounded-xl text-xs font-black uppercase transition-all ${
                              report.sexo === val ? 'bg-white dark:bg-slate-600 shadow-md text-blue-900 dark:text-white' : 'text-slate-500 hover:text-slate-900'
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Lugar" icon={<MapPin size={22} />} headerColor="border-purple-600" className="h-full">
              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="fecha" className={labelClasses}><Calendar size={12} className="inline mr-1" /> Fecha</label>
                    <input id="fecha" type="date" value={report.fecha} onChange={handleChange} className={inputClasses} />
                  </div>
                  <div>
                    <label htmlFor="hora" className={labelClasses}><Clock size={12} className="inline mr-1" /> Hora</label>
                    <input id="hora" type="time" value={report.hora} onChange={handleChange} className={inputClasses} />
                  </div>
                </div>
                <div>
                  <label htmlFor="tipoLugar" className={labelClasses}>Categoría</label>
                  <select id="tipoLugar" value={report.tipoLugar} onChange={handleChange} className={`${inputClasses} cursor-pointer`}>
                    <option value="">Seleccionar tipo...</option>
                    <option value="Domicilio">Domicilio</option>
                    <option value="ViaPublica">Vía Pública</option>
                    <option value="Hospital">Hospital / Centro Salud</option>
                    <option value="Incendio">Incendio</option>
                    <option value="ChoqueVehicular">Choque Vehicular</option>
                    <option value="Derrumbe">Derrumbe</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>
                {report.tipoLugar === 'Otros' && (
                  <input id="otrosLugar" value={report.otrosLugar} onChange={handleChange} placeholder="Especifique lugar manualmente..." className={`${inputClasses} animate-in fade-in zoom-in-95`} />
                )}
                <div>
                  <label htmlFor="lugar" className={labelClasses}>Dirección exacta</label>
                  <input id="lugar" value={report.lugar} onChange={handleChange} className={inputClasses} placeholder="Calle, Intersección o Referencia" />
                </div>
              </div>
            </Section>
          </div>

          <Section title="Valoración Clínica (Triage)" icon={<Activity size={24} />} headerColor="border-red-600">
            <div className="space-y-12">
              <div className="flex flex-col md:flex-row items-center gap-8 justify-center">
                {(['ROJO', 'AMARILLO', 'VERDE'] as TriageLevel[]).map((level) => {
                  const isActive = report.triage === level;
                  const TriageIcon = level === 'ROJO' ? AlertTriangle : level === 'AMARILLO' ? Clock : CheckCircle;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => handleTriageChange(level)}
                      className={`relative flex flex-col items-center justify-center p-10 rounded-[40px] w-full md:w-56 transition-all duration-500 transform ${
                        isActive ? `${getTriageColor(level)} text-white scale-105 shadow-2xl z-10 ring-4 ring-white/20` : 'bg-slate-100 dark:bg-slate-800/40 text-slate-900 dark:text-slate-400 border border-slate-300 dark:border-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <TriageIcon size={isActive ? 42 : 28} className={`mb-4 transition-all ${isActive ? 'animate-pulse' : ''}`} />
                      <span className="text-xl font-black tracking-widest">{level}</span>
                    </button>
                  );
                })}
              </div>

              {report.triage && (
                <div className={`p-10 rounded-[40px] border-2 animate-in slide-in-from-top-4 fade-in duration-500 ${isDarkMode ? 'bg-slate-900/60 border-slate-800 shadow-inner' : 'bg-slate-100 border-slate-300 shadow-inner'}`}>
                  <label className={labelClasses}>Manifestación Predominante</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {triageOptions[report.triage].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleTriageClinicaSelect(opt)}
                        className={`px-6 py-4 rounded-2xl text-sm font-black text-left transition-all border-2 ${
                          report.triageClinica === opt 
                            ? (isDarkMode ? 'bg-blue-600 text-white border-blue-500 shadow-lg' : 'bg-slate-900 text-white border-slate-950 shadow-md scale-105')
                            : (isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-white text-slate-900 border-slate-300 hover:border-slate-400 shadow-sm')
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                  <label htmlFor="relato" className={labelClasses}>Crónica detallada del incidente</label>
                  <button type="button" onClick={handleAiAnalyze} disabled={isAnalyzing || !report.relato} className={`group flex items-center gap-3 px-6 py-3.5 bg-blue-800 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-blue-500/20 active:translate-y-1 transition-all no-print ${isAnalyzing ? 'opacity-50' : 'hover:bg-blue-900'}`}>
                    <Sparkles size={18} className={isAnalyzing ? 'animate-spin' : 'group-hover:rotate-12'} />
                    {isAnalyzing ? 'REDACTANDO...' : 'OPTIMIZAR CON IA'}
                  </button>
                </div>
                <textarea id="relato" rows={10} value={report.relato} onChange={handleChange} placeholder="Escriba aquí los hechos y observaciones clínicas..." className={`w-full px-8 py-6 rounded-[32px] border-2 transition-all duration-300 outline-none focus:ring-8 focus:ring-blue-500/5 min-h-[300px] text-lg font-bold leading-relaxed ${isDarkMode ? 'bg-slate-800/40 border-slate-700 text-slate-200 focus:border-blue-500/50' : 'bg-slate-50 border-slate-300 text-slate-950 focus:border-blue-700 shadow-inner'}`} />
              </div>
            </div>
          </Section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-stretch">
            <Section title="Prestación" icon={<Stethoscope size={22} />} headerColor="border-emerald-600" className="h-full">
              <div className="space-y-8">
                <div>
                  <label htmlFor="duracion" className={labelClasses}>Tiempo de atención</label>
                  <input id="duracion" value={report.duracion} onChange={handleChange} className={inputClasses} placeholder="Ej: 30 min" />
                </div>
                <div className="space-y-6">
                  <div>
                    <label className={labelClasses}>Modalidad de abordaje</label>
                    <div className="flex bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-2xl h-[58px] border-2 border-slate-300 dark:border-slate-700 shadow-inner">
                      {['individual', 'grupal'].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setReport(prev => ({ ...prev, entrevista: val as any }))}
                          className={`flex-1 rounded-xl text-[11px] font-black uppercase transition-all ${
                            report.entrevista === val ? 'bg-white dark:bg-slate-600 shadow-md text-emerald-900 dark:text-emerald-300' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                    <label className={labelClasses}>Opciones de prestación</label>
                    {[
                      { id: 'contactoTelefonico', label: 'Contacto telefónico' },
                      { id: 'seguimiento', label: 'Seguimiento' },
                      { id: 'datosEstres', label: 'Datos estrés traumático' }
                    ].map((opt) => {
                      const isChecked = report[opt.id as keyof IncidentReport] === true;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => toggleCheckbox(opt.id as keyof IncidentReport)}
                          className={`flex items-center gap-4 px-6 py-4 rounded-2xl border-2 transition-all ${
                            isChecked 
                              ? (isDarkMode ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-emerald-50 border-emerald-600 text-emerald-950 shadow-md')
                              : (isDarkMode ? 'bg-slate-800/40 border-slate-700 text-slate-500' : 'bg-white border-slate-200 text-slate-900 hover:border-slate-400')
                          }`}
                        >
                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                            isChecked ? 'bg-white border-white' : 'border-slate-300 bg-slate-50'
                          }`}>
                            {isChecked && <Check size={14} className="text-emerald-600" />}
                          </div>
                          <span className="text-sm font-black uppercase tracking-widest">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Prosecución" icon={<FileText size={22} />} headerColor="border-orange-600" className="h-full">
              <div className="space-y-8">
                <div>
                  <label htmlFor="derivacion" className={labelClasses}>Derivación</label>
                  <input id="derivacion" value={report.derivacion} onChange={handleChange} placeholder="Hospital, centro o profesional de derivación" className={inputClasses} />
                </div>
                <div>
                  <label className={labelClasses}>Tipo de Derivación Sugerida</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['Psicoterapia', 'Psiquiatria', 'Internacion', 'Otro'] as Derivacion[]).map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleDerivacionToggle(val)}
                        className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                          report.tipoDerivacion.includes(val) 
                            ? (isDarkMode ? 'bg-orange-600 text-white border-orange-500 shadow-lg' : 'bg-slate-900 text-white border-slate-950 shadow-md scale-105')
                            : (isDarkMode ? 'bg-slate-800/40 border-slate-700 text-slate-500' : 'bg-white border-slate-300 text-slate-900 shadow-sm font-black')
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Section>
          </div>

          <Section title="Seguimientos Post-Incidente" icon={<History size={22} />} headerColor="border-cyan-600" className="w-full">
            <div className="space-y-10">
              <div className="no-print">
                <label className={labelClasses}>Frecuencia de Seguimiento</label>
                <div className="grid grid-cols-2 gap-6">
                  {(['Primera vez', 'Ulteriores'] as SeguimientoTipo[]).map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setReport(prev => ({ ...prev, seguimientoPostIncidente: val }))}
                      className={`p-5 rounded-[24px] border-2 font-black text-xs uppercase tracking-widest transition-all ${
                        report.seguimientoPostIncidente === val 
                          ? (isDarkMode ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-slate-900 text-white border-slate-950 shadow-md scale-105')
                          : (isDarkMode ? 'bg-slate-800/40 border-slate-700 text-slate-500' : 'bg-white border-slate-300 text-slate-900 shadow-sm font-black')
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {report.seguimientoPostIncidente !== '' && (
                <div className="space-y-10 animate-in fade-in slide-in-from-top-6 duration-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div>
                      <label htmlFor="fechaSeguimiento" className={labelClasses}><Calendar size={12} className="inline mr-1" /> Fecha de valoración</label>
                      <input 
                        id="fechaSeguimiento" 
                        type="date" 
                        value={report.fechaSeguimiento} 
                        onChange={handleChange} 
                        className={inputClasses} 
                      />
                    </div>
                    <div>
                      <label htmlFor="observacionSeguimiento" className={labelClasses}><MessageSquare size={12} className="inline mr-1" /> Observación Evolutiva</label>
                      <textarea 
                        id="observacionSeguimiento" 
                        rows={4} 
                        value={report.observacionSeguimiento} 
                        onChange={handleChange} 
                        placeholder="Registro de cambios o persistencia de síntomas..." 
                        className={`${inputClasses} resize-none min-h-[140px] leading-relaxed font-bold`} 
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <Section title="Inteligencia Analítica" icon={<Sparkles size={22} />} headerColor="border-blue-600">
              <div className="space-y-6">
                <button type="button" onClick={handleGenerateSummary} disabled={isGeneratingSummary} className="w-full flex items-center justify-center gap-4 py-5 bg-gradient-to-r from-blue-800 to-indigo-900 text-white rounded-[28px] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 no-print">
                  {isGeneratingSummary ? <RefreshCw className="animate-spin" /> : <FileText size={20} />} GENERAR RESUMEN PROFESIONAL
                </button>
                <div className={`p-8 border-2 rounded-[32px] text-base font-bold leading-relaxed italic ${isDarkMode ? 'bg-slate-900/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-300 text-slate-950 shadow-inner'}`}>
                  {professionalSummary || "El sistema consolidará la narrativa y los datos clínicos en una síntesis técnica para derivación."}
                </div>
              </div>
            </Section>

            <Section title="Firma" icon={<User size={22} />} headerColor="border-slate-800">
              <div className="rounded-[32px] p-3 bg-white dark:bg-slate-950/80 ring-2 ring-slate-300 dark:ring-slate-800 overflow-hidden shadow-inner">
                <SignaturePad onSave={(data) => setSignature(data)} onClear={() => setSignature(null)} />
              </div>
              {signature && (
                <div className="flex items-center justify-center gap-3 mt-6 py-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-200 dark:border-emerald-700/30 shadow-sm">
                  <CheckCircle size={16} className="text-emerald-900 dark:text-emerald-500" />
                  <span className="text-[11px] font-black text-emerald-950 dark:text-emerald-400 uppercase tracking-widest">Identidad validada digitalmente</span>
                </div>
              )}
            </Section>
          </div>
        </form>

        <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 w-[94%] max-w-4xl border-2 shadow-2xl rounded-[40px] p-6 flex justify-between items-center z-50 transition-all no-print ${isDarkMode ? 'bg-slate-900/80 border-slate-800 backdrop-blur-3xl shadow-black/50' : 'bg-white border-slate-300 backdrop-blur-3xl shadow-slate-500/40'}`}>
          <div className="flex gap-4">
            <button type="button" onClick={copyToClipboard} className={`p-5 rounded-2xl transition-all flex items-center gap-4 font-black text-[11px] uppercase tracking-widest ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-950 hover:bg-slate-300 border border-slate-300 shadow-sm font-black'}`}><Copy size={22} /><span className="hidden sm:inline">Copiar texto</span></button>
            <button type="button" onClick={() => setIsPreviewOpen(true)} className={`p-5 rounded-2xl transition-all flex items-center gap-4 font-black text-[11px] uppercase tracking-widest ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-950 hover:bg-slate-300 border border-slate-300 shadow-sm font-black'}`}><Eye size={22} /><span className="hidden sm:inline">Vista Previa</span></button>
          </div>
          <button type="button" onClick={() => setIsConfirmModalOpen(true)} className="px-12 py-5 bg-gradient-to-r from-blue-800 to-indigo-900 text-white rounded-[24px] font-black text-[11px] uppercase tracking-widest flex items-center gap-4 shadow-xl shadow-blue-500/40 transition-all hover:scale-105 active:scale-95"><Send size={22} /><span>FINALIZAR REPORTE</span></button>
        </div>

        {/* Modal de Vista Previa */}
        {isPreviewOpen && (
          <div className="print-modal-backdrop fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
            <ReportPreview />
          </div>
        )}

        {isConfirmModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 no-print">
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setIsConfirmModalOpen(false)} />
            <div className={`relative rounded-[48px] shadow-3xl w-full max-w-lg p-12 animate-in zoom-in-95 duration-500 ${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white border-4 border-slate-200'}`}>
              <div className="flex flex-col items-center text-center">
                <div className={`w-20 h-20 rounded-[24px] flex items-center justify-center mb-10 rotate-12 ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-900 shadow-sm'}`}><AlertCircle size={40} /></div>
                <h2 className={`text-4xl font-black mb-6 tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>¿Finalizar Proceso?</h2>
                <p className={`mb-12 text-lg font-bold leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-900'}`}>Este reporte será enviado al servidor central de Factores Humanos para su registro permanente.</p>
                <div className="flex flex-col w-full gap-4">
                  <button type="button" onClick={handleFinalize} className="w-full py-5 bg-blue-800 text-white rounded-[24px] font-black text-xs uppercase tracking-widest hover:bg-blue-900 shadow-xl shadow-blue-500/20 transition-all">Confirmar Envío</button>
                  <button type="button" onClick={() => setIsConfirmModalOpen(false)} className={`w-full py-5 rounded-[24px] font-black text-xs uppercase tracking-widest transition-all ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-950 border border-slate-300'}`}>Cancelar</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isResetConfirmOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 no-print">
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setIsResetConfirmOpen(false)} />
            <div className={`relative rounded-[48px] shadow-3xl w-full max-w-lg p-12 animate-in zoom-in-95 duration-500 ${isDarkMode ? 'bg-slate-900 border border-slate-800' : 'bg-white border-4 border-slate-200'}`}>
              <div className="flex flex-col items-center text-center">
                <div className={`w-20 h-20 rounded-[24px] flex items-center justify-center mb-10 -rotate-12 ${isDarkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700 shadow-sm'}`}><Trash2 size={40} /></div>
                <h2 className={`text-4xl font-black mb-6 tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>¿Purgar Datos?</h2>
                <p className={`mb-12 text-lg font-bold leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-900'}`}>Se eliminará toda la información temporal de este reporte de forma irreversible.</p>
                <div className="flex flex-col w-full gap-4">
                  <button type="button" onClick={handleReset} className="w-full py-5 bg-red-700 text-white rounded-[24px] font-black text-xs uppercase tracking-widest hover:bg-red-800 shadow-xl shadow-red-500/20 transition-all">Borrar todo</button>
                  <button type="button" onClick={() => setIsResetConfirmOpen(false)} className={`w-full py-5 rounded-[24px] font-black text-xs uppercase tracking-widest transition-all ${isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-950 border border-slate-300'}`}>Mantener datos</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
