
import { GoogleGenAI, Type } from "@google/genai";
import { IncidentReport } from "../types";

// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeNarrative = async (relato: string) => {
  if (!relato || relato.length < 10) return null;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analiza el siguiente relato de un incidente psicológico prehospitalario y determina el nivel de Triage (ROJO para crisis aguda/riesgo de vida, AMARILLO para afectación moderada/necesidad de contención pronta, VERDE para afectación leve/estabilizado). Además, mejora la redacción para que sea más profesional y concisa.
      
      Relato: "${relato}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedTriage: {
              type: Type.STRING,
              description: 'Nivel sugerido: ROJO, AMARILLO o VERDE',
            },
            refinedRelato: {
              type: Type.STRING,
              description: 'El relato redactado de forma profesional.',
            },
            reasoning: {
              type: Type.STRING,
              description: 'Breve explicación de la sugerencia.',
            }
          },
          required: ["suggestedTriage", "refinedRelato"],
        },
      },
    });

    // Access the .text property directly (do not call as a method)
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
};

export const generateProfessionalSummary = async (report: IncidentReport) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Genera un resumen ejecutivo profesional basado en este reporte de incidente de factores humanos. 
      
      INSTRUCCIÓN OBLIGATORIA: Inicia el resumen con el título "FACTORES HUMANOS - SAME Buenos Aires" centrado o destacado.
      
      Es FUNDAMENTAL que integres contextualmente la información de la sección DATOS:
      - Ámbito de actuación: ${report.poblacion === 'personal' ? 'Propio Personal' : 'Población General'}
      - Función del interviniente: ${report.funcion || 'No especificada'}
      - Antigüedad/Años: ${report.anos || 'No especificados'}
      - Referente: ${report.referente || 'No especificado'}
      
      Luego, sintetiza los datos clínicos del paciente, el escenario y el triage. 
      Usa un tono formal, técnico, médico/psicológico orientado a derivación profesional.
      Datos completos: ${JSON.stringify(report)}`,
    });
    // Access the .text property directly
    return response.text;
  } catch (error) {
    console.error("Summary Error:", error);
    return "No se pudo generar el resumen automático.";
  }
};
