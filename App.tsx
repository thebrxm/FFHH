
import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Clipboard, MapPin, Activity, Stethoscope, FileText, 
  Send, Copy, FileDown, Sparkles, AlertCircle, Clock, Trash2,
  AlertTriangle, CheckCircle, X, Moon, Sun, RefreshCw,
  Search, Calendar, History, MessageSquare, Check, Eye, Download
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
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isPrintingHistory, setIsPrintingHistory] = useState(false);
  const [savedReports, setSavedReports] = useState<IncidentReport[]>([]);
  
  const lastGeneratedPrefix = useRef('');

  const triageOptions: Record<TriageLevel, string[]> = {
    'ROJO': ['Disociación', 'Excitación psicomotriz', 'Intencionalidad suicida', 'Alteraciones sesoperceptivas', 'Ideación delirante', 'Otra'],
    'AMARILLO': ['Amnesia', 'Reexperimentación psico y/o somatoforme', 'Reacciones panicosas', 'Otra'],
    'VERDE': ['Reacciones de tristeza/irritabilidade', 'Emociones secundarias', 'Negación', 'Personalización Tipo 1', 'Personalización Tipo 2', 'Otra'],
    '': []
  };

  // Cargar Historial
  useEffect(() => {
    const history = localStorage.getItem('same_report_history');
    if (history) {
      try {
        setSavedReports(JSON.parse(history));
      } catch (e) {
        console.error("Error cargando historial", e);
      }
    }
  }, []);

  const generateReportPrefix = (r: IncidentReport) => {
    const nombre = r.apellidoNombre || '_______';
    const edad = r.edad || '___';
    const sexoDisplay = r.sexo === 'M' ? 'Masculino' : r.sexo === 'F' ? 'Femenino' : '____';
    const dni = r.dni || '_______';
    let clinica = '';
    if (r.triageClinica && r.triageClinica.length > 0) {
      const displayManifestations = r.triageClinica.map(m => m === 'Otra' ? (r.otroTriageClinicaInput || '_______') : m).join(', ');
      clinica = `\nPresenta: ${displayManifestations}.`;
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
    setReport(prev => ({ ...prev, triage: level, triageClinica: [], otroTriageClinicaInput: '' }));
  };

  const handleTriageClinicaSelect = (option: string) => {
    setReport(prev => {
      const isSelected = prev.triageClinica.includes(option);
      const updated = isSelected 
        ? prev.triageClinica.filter(o => o !== option)
        : [...prev.triageClinica, option];
      return { ...prev, triageClinica: updated };
    });
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

  const handleFinalGenerate = () => {
    // Guardar en Historial
    const newReportRecord = {
      ...report,
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      resumenTecnico: professionalSummary
    };
    const updatedHistory = [newReportRecord, ...savedReports];
    setSavedReports(updatedHistory);
    localStorage.setItem('same_report_history', JSON.stringify(updatedHistory));
    
    // Abrir Vista Previa
    setIsPreviewOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePrintHistory = () => {
    setIsPrintingHistory(true);
    setTimeout(() => {
      window.print();
      setIsPrintingHistory(false);
    }, 300);
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
Manifestaciones: ${report.triageClinica.join(', ')}
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

  const handleReset = () => {
    setReport(initialReport);
    setSignature(null);
    setProfessionalSummary('');
    setIsResetConfirmOpen(false);
    lastGeneratedPrefix.current = '';
  };

  const clearHistory = () => {
    if (confirm("¿Estás seguro de eliminar todo el historial estadístico?")) {
      setSavedReports([]);
      localStorage.removeItem('same_report_history');
    }
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

  // Vista Previa PDF Individual
  const ReportPreview = () => (
    <div className="print-modal-content bg-white w-full max-w-4xl mx-auto rounded-[40px] shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-500">
      {/* Header PDF */}
      <div className="p-10 border-b-4 border-blue-600 flex justify-between items-start bg-slate-50">
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Documento Oficial</p>
          <p className="text-sm font-bold text-slate-900">ID-REF: {report.id || '---'}</p>
          <p className="text-xs font-bold text-slate-500 mt-1">Generado: {new Date().toLocaleDateString('es-AR')} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        
        <div className="flex items-center gap-6 text-right">
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-slate-950 leading-tight">
              Factores <span className="text-blue-600">Humanos</span>
            </h1>
            <span className="inline-block mt-1 px-4 py-1 bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-full">
              Reporte de Incidente
            </span>
            <p className="mt-2 text-[10px] font-black text-slate-500 uppercase tracking-wide">
              SAME Buenos Aires · Argentina
            </p>
          </div>
          <img src="https://raw.githubusercontent.com/same-ba/assets/main/logo.jpg" alt="SAME Logo" className="w-24 h-24 object-contain rounded-full border-4 border-white bg-white shadow-xl" />
        </div>
      </div>

      <div className="p-12 space-y-12 bg-white">
        <div className="text-center border-b-2 border-slate-100 pb-6">
          <h2 className="text-2xl font-black text-slate-950 tracking-tighter uppercase">
            FACTORES HUMANOS - SAME Buenos Aires
          </h2>
        </div>

        <div className="space-y-4">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Información de Contexto (DATOS)</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 p-6 bg-slate-50 rounded-3xl border border-slate-100">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ámbito de Actuación</p>
              <p className="text-sm font-bold text-slate-950 uppercase">{report.poblacion === 'personal' ? 'Propio Personal' : 'Población General'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Función</p>
              <p className="text-sm font-bold text-slate-950">{report.funcion || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Antigüedad (Años)</p>
              <p className="text-sm font-bold text-slate-950">{report.anos || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Referente</p>
              <p className="text-sm font-bold text-slate-950">{report.referente || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="p-8 bg-blue-50 rounded-3xl border border-blue-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest border-b border-blue-200 pb-2">Identificación del Paciente</h4>
              <p className="text-xl font-black text-slate-950">{report.apellidoNombre || 'SIN NOMBRE'}</p>
              <div className="flex gap-6 text-sm">
                <p><span className="font-bold text-slate-400 uppercase text-[10px]">DNI:</span> <span className="text-slate-950 font-bold">{report.dni || '---'}</span></p>
                <p><span className="font-bold text-slate-400 uppercase text-[10px]">EDAD:</span> <span className="text-slate-950 font-bold">{report.edad || '--'}</span></p>
                <p><span className="font-bold text-slate-400 uppercase text-[10px]">SEXO:</span> <span className="text-slate-950 font-bold">{report.sexo || '-'}</span></p>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest border-b border-blue-200 pb-2">Datos del Escenario</h4>
              <p className="text-sm font-bold text-slate-950 flex items-center gap-2"><MapPin size={14} className="text-blue-600" /> {report.lugar || 'Ubicación no especificada'}</p>
              <div className="flex gap-6 text-sm text-slate-700">
                <p><span className="font-bold uppercase text-[10px] text-slate-400">Fecha:</span> <span className="font-bold">{report.fecha}</span></p>
                <p><span className="font-bold uppercase text-[10px] text-slate-400">Hora:</span> <span className="font-bold">{report.hora}</span></p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className={`px-6 py-2 rounded-full text-white text-[10px] font-black tracking-widest uppercase ${getTriageColor(report.triage)}`}>
              TRIAGE: {report.triage || 'PENDIENTE'}
            </div>
            <p className="text-sm font-black text-slate-700 uppercase tracking-wide">
              {report.triageClinica.join(', ')}
            </p>
          </div>
          <div className="p-8 border-2 border-slate-100 rounded-3xl bg-white shadow-sm">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Descripción del incidente</p>
             <p className="text-base leading-relaxed text-slate-900 font-medium whitespace-pre-wrap">{report.relato || 'Sin descripción registrada.'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-10 border-t-2 border-slate-100">
           <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Sparkles size={16} className="text-blue-600" />
              <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest">Resumen técnico profesional</h4>
            </div>
            <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 italic">
              <p className="text-sm text-slate-800 leading-relaxed font-bold">{professionalSummary || 'No se ha generado una síntesis técnica para este reporte.'}</p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center p-8 border-4 border-double border-slate-200 rounded-[40px] bg-white shadow-inner">
            {signature ? (
              <img src={signature} alt="Firma Profesional" className="max-h-28 object-contain transition-all hover:scale-105" />
            ) : (
              <div className="flex flex-col items-center gap-3 opacity-20">
                <User size={40} className="text-slate-400" />
                <p className="text-[10px] font-black text-slate-400 uppercase italic">Firma pendiente de registro</p>
              </div>
            )}
            <div className="mt-6 pt-4 border-t border-slate-200 w-full text-center">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">{report.apellidoNombre || 'PROFESIONAL SAME'}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Firma del Profesional Responsable</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-8 bg-slate-100 border-t border-slate-200 flex justify-between items-center no-print">
        <button onClick={() => setIsPreviewOpen(false)} className="px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-600 hover:text-slate-900 transition-all flex items-center gap-2">
          <X size={18} /> Cerrar Vista
        </button>
        <button onClick={handlePrint} className="px-12 py-4 bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/30 hover:bg-blue-800 transition-all flex items-center gap-3 active:scale-95">
          <FileDown size={18} /> Exportar Reporte PDF
        </button>
      </div>
    </div>
  );

  // Vista de Impresión del Historial Completo
  const HistoryPrintView = () => (
    <div className="print-history-container bg-white p-12 space-y-12">
      <div className="flex justify-between items-center border-b-4 border-blue-600 pb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-950 leading-tight">
            FACTORES <span className="text-blue-600">HUMANOS</span>
          </h1>
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Historial Estadístico Consolidado · SAME Buenos Aires</p>
        </div>
        <img src="https://raw.githubusercontent.com/same-ba/assets/main/logo.jpg" alt="Logo" className="w-20 h-20 object-contain" />
      </div>

      <div className="space-y-10">
        {savedReports.map((r, idx) => (
          <div key={r.id || idx} className="p-8 border-2 border-slate-100 rounded-[32px] bg-slate-50/30 break-inside-avoid">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ID: {r.id}</p>
                <h3 className="text-xl font-black uppercase text-slate-900">{r.apellidoNombre || 'Sin Identificar'}</h3>
              </div>
              <div className={`px-4 py-1.5 rounded-full text-[10px] font-black text-white ${getTriageColor(r.triage)}`}>
                TRIAGE: {r.triage}
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-[11px] font-bold text-slate-600 uppercase">
              <p>Fecha: <span className="text-slate-900">{r.fecha}</span></p>
              <p>Hora: <span className="text-slate-900">{r.hora}</span></p>
              <p>Ámbito: <span className="text-slate-900">{r.poblacion}</span></p>
              <p>Lugar: <span className="text-slate-900">{r.tipoLugar}</span></p>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Manifestaciones</p>
                <p className="text-sm font-bold text-slate-800 italic">{r.triageClinica.join(', ')}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Sintesis Técnica</p>
                <p className="text-sm text-slate-900 leading-relaxed font-medium line-clamp-4">{r.resumenTecnico || r.relato}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="pt-10 border-t border-slate-200 text-center text-[10px] font-bold text-slate-400 uppercase">
        Este documento es un extracto confidencial del historial estadístico del servicio de Factores Humanos del SAME Buenos Aires.
      </div>
    </div>
  );

  // Modal de Historial
  const HistoryModal = () => (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 md:p-10 no-print">
      <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl" onClick={() => setIsHistoryOpen(false)} />
      <div className={`relative w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-[48px] border flex flex-col animate-in zoom-in-95 duration-500 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="p-8 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 text-white rounded-2xl">
              <History size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tighter dark:text-white">Historial Estadístico</h2>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Base de datos de incidentes registrados</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handlePrintHistory} className="px-6 py-3 bg-blue-700 text-white rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-800 transition-all shadow-lg shadow-blue-500/20">
              <FileDown size={16} /> Exportar Historial (PDF)
            </button>
            <button onClick={clearHistory} className="px-6 py-3 bg-red-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-red-700 transition-all">
              <Trash2 size={16} /> Purgar
            </button>
            <button onClick={() => setIsHistoryOpen(false)} className="p-3 text-slate-500 hover:text-slate-950 dark:hover:text-white transition-all">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {savedReports.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20">
              <History size={80} className="mb-6" />
              <p className="text-2xl font-black uppercase tracking-tighter">No hay reportes registrados</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedReports.map((r) => (
                <div key={r.id} className={`p-6 rounded-[32px] border-2 transition-all hover:scale-[1.02] cursor-pointer group ${isDarkMode ? 'bg-slate-800/40 border-slate-700 hover:border-blue-500/50' : 'bg-slate-50 border-slate-200 hover:border-blue-600'}`}
                  onClick={() => {
                    setReport(r);
                    setProfessionalSummary(r.resumenTecnico || '');
                    setIsPreviewOpen(true);
                  }}>
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-white ${getTriageColor(r.triage)}`}>
                      {r.triage}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{r.fecha} · {r.hora}</span>
                  </div>
                  <h4 className="text-lg font-black tracking-tight mb-2 dark:text-white group-hover:text-blue-600 transition-colors uppercase truncate">{r.apellidoNombre || 'Sin nombre'}</h4>
                  <p className="text-xs font-bold text-slate-500 mb-4 line-clamp-2 italic">"{r.relato}"</p>
                  <div className="flex flex-wrap gap-1">
                    {r.triageClinica.slice(0, 3).map(m => (
                      <span key={m} className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded-md text-[9px] font-bold text-slate-600 dark:text-slate-300 uppercase truncate max-w-[100px]">{m}</span>
                    ))}
                    {r.triageClinica.length > 3 && <span className="text-[9px] font-bold text-slate-400">+{r.triageClinica.length - 3}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen transition-all duration-500`}>
      {/* Vista de impresión del historial (solo visible al imprimir si isPrintingHistory es true) */}
      {isPrintingHistory && (
        <div className="fixed inset-0 z-[9999] bg-white overflow-visible">
          <HistoryPrintView />
        </div>
      )}

      <div className="max-w-5xl mx-auto px-6 py-16 pb-48">
        <header className="relative mb-20 flex flex-col items-center">
          <div className="absolute top-0 right-0 flex gap-4 no-print">
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              className={`p-4 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center ${isDarkMode ? 'bg-slate-800 text-blue-400 border border-slate-700' : 'bg-white text-blue-700 border border-slate-300 shadow-md'}`}
              title="Ver Historial Estadístico"
            >
              <History size={24} />
            </button>
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-4 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center ${isDarkMode ? 'bg-slate-800 text-yellow-400 border border-slate-700' : 'bg-white text-slate-900 border border-slate-300 shadow-md'}`}
              title="Alternar Modo"
            >
              {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
            </button>
            <button
              type="button"
              onClick={() => setIsResetConfirmOpen(true)}
              className={`p-4 rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center ${isDarkMode ? 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-red-400' : 'bg-white text-slate-900 border border-slate-300 hover:text-red-600 shadow-md'}`}
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
                  <label className={labelClasses}>Manifestación Predominante (Múltiple)</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {triageOptions[report.triage].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleTriageClinicaSelect(opt)}
                        className={`px-6 py-4 rounded-2xl text-sm font-black text-left transition-all border-2 flex justify-between items-center ${
                          report.triageClinica.includes(opt) 
                            ? (isDarkMode ? 'bg-blue-600 text-white border-blue-500 shadow-lg' : 'bg-slate-900 text-white border-slate-950 shadow-md scale-105')
                            : (isDarkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-white text-slate-900 border-slate-300 hover:border-slate-400 shadow-sm')
                        }`}
                      >
                        <span>{opt}</span>
                        {report.triageClinica.includes(opt) && <CheckCircle size={14} className="animate-in zoom-in" />}
                      </button>
                    ))}
                  </div>
                  {report.triageClinica.includes('Otra') && (
                    <input id="otroTriageClinicaInput" value={report.otroTriageClinicaInput} onChange={handleChange} placeholder="Especifique otra manifestación..." className={`${inputClasses} mt-6 animate-in fade-in zoom-in-95`} />
                  )}
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
          <button type="button" onClick={handleFinalGenerate} className="px-12 py-5 bg-gradient-to-r from-blue-800 to-indigo-900 text-white rounded-[24px] font-black text-[11px] uppercase tracking-widest flex items-center gap-4 shadow-xl shadow-blue-500/40 transition-all hover:scale-105 active:scale-95"><FileDown size={22} /><span>GENERAR REPORTE</span></button>
        </div>

        {isPreviewOpen && (
          <div className="print-modal-backdrop fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-8 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
            <ReportPreview />
          </div>
        )}

        {isHistoryOpen && <HistoryModal />}

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
