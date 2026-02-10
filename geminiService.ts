
import { GoogleGenAI, Type } from "@google/genai";
import { OCRResult } from "./types";

/**
 * Processa a imagem de um boleto usando o Google Gemini AI para extrair informações relevantes.
 */
export const processBillImage = async (base64Image: string): Promise<OCRResult> => {
  // Inicialização obrigatória do GoogleGenAI usando process.env.API_KEY diretamente.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image.split(',')[1] || base64Image,
          },
        },
        {
          text: 'Extraia os dados deste boleto ou fatura. Identifique o beneficiário, o valor total, a data de vencimento e a categoria sugerida.'
        }
      ]
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          beneficiary: { type: Type.STRING, description: 'Nome da empresa ou pessoa que recebe o pagamento.' },
          amount: { type: Type.NUMBER, description: 'O valor numérico do boleto.' },
          dueDate: { type: Type.STRING, description: 'A data de vencimento no formato YYYY-MM-DD.' },
          category: { type: Type.STRING, description: 'Uma categoria sugerida como Energia, Água, Aluguel, etc.' }
        },
        required: ['beneficiary', 'amount', 'dueDate', 'category']
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error('Falha na resposta do Gemini');
  
  return JSON.parse(text) as OCRResult;
};
