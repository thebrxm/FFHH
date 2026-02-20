
export type Poblacion = 'general' | 'personal' | '';
export type Sexo = 'M' | 'F' | '';
export type TriageLevel = 'ROJO' | 'AMARILLO' | 'VERDE' | '';
export type Entrevista = 'individual' | 'grupal' | '';
export type Derivacion = 'Psicoterapia' | 'Psiquiatria' | 'Internacion' | 'Otro' | '';
export type SeguimientoTipo = 'Primera vez' | 'Ulteriores' | '';
export type TiempoUlterior = '1 semana' | '1 mes' | '3 meses' | 'Otro' | '';

export interface IncidentReport {
  // Datos Iniciales
  poblacion: Poblacion;
  funcion: string;
  anos: string;
  
  // Información General
  apellidoNombre: string;
  edad: string;
  dni: string;
  sexo: Sexo;
  referente: string;
  
  // Datos del Incidente
  fecha: string;
  hora: string;
  lugar: string;
  tipoLugar: string;
  otrosLugar: string;
  companeroChofer: string;
  companeroEquipo: string;
  jefeGuardia: string;
  agresor: 'Si' | 'No' | '';
  
  // Triage
  triage: TriageLevel;
  triageClinica: string[]; // Actualizado a Array para selección múltiple
  otroTriageClinicaInput: string;
  relato: string;
  
  // Prestación
  duracion: string;
  entrevista: Entrevista;
  contactoTelefonico: boolean;
  seguimiento: boolean;
  datosEstres: boolean;
  
  // Prosecución
  derivacion: string;
  tipoDerivacion: Derivacion[];
  otroDerivacionInput: string;

  // Seguimientos postincidente
  seguimientoPostIncidente: SeguimientoTipo;
  tiempoUlterior: TiempoUlterior;
  otroTiempoUlterior: string;
  observacionSeguimiento: string;
  fechaSeguimiento: string;
  
  // Metadatos para historial
  id?: string;
  resumenTecnico?: string;
}

export const initialReport: IncidentReport = {
  poblacion: '',
  funcion: '',
  anos: '',
  apellidoNombre: '',
  edad: '',
  dni: '',
  sexo: '',
  referente: '',
  fecha: new Date().toISOString().split('T')[0],
  hora: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
  lugar: '',
  tipoLugar: '',
  otrosLugar: '',
  companeroChofer: '',
  companeroEquipo: '',
  jefeGuardia: '',
  agresor: '',
  triage: '',
  triageClinica: [],
  otroTriageClinicaInput: '',
  relato: '',
  duracion: '',
  entrevista: '',
  contactoTelefonico: false,
  seguimiento: false,
  datosEstres: false,
  derivacion: '',
  tipoDerivacion: [],
  otroDerivacionInput: '',
  seguimientoPostIncidente: '',
  tiempoUlterior: '',
  otroTiempoUlterior: '',
  observacionSeguimiento: '',
  fechaSeguimiento: new Date().toISOString().split('T')[0],
};
