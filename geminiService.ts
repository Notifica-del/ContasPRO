
import { GoogleGenAI, Type } from "@google/genai";
import { OCRResult, Bill } from "./types";

/**
 * Utility to get a fresh AI instance using the current API Key.
 */
const getAIInstance = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found. Please select your key in the configuration screen.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Global error handler for AI requests.
 * Specifically handles the "Requested entity was not found" case by signaling a re-prompt.
 */
const handleAIError = (error: any) => {
  const errorMessage = error?.message || "";
  console.error("Gemini API Error:", error);

  if (errorMessage.includes("Requested entity was not found")) {
    // Dispatch a custom event to App.tsx to trigger the re-selection flow
    window.dispatchEvent(new CustomEvent('AISTUDIO_API_KEY_ERROR'));
    throw new Error("Sua chave de API parece estar incorreta ou expirada. Por favor, selecione-a novamente.");
  }

  throw new Error(errorMessage || "Ocorreu um erro ao processar sua solicitação de IA.");
};

export const processBillDocument = async (base64Data: string, mimeType: string = 'image/jpeg'): Promise<OCRResult> => {
  try {
    const ai = getAIInstance();
    const dataParts = base64Data.split('base64,');
    const cleanData = dataParts.length > 1 ? dataParts[1] : dataParts[0];

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanData,
            },
          },
          {
            text: `Extraia dados deste documento financeiro brasileiro.
            - BENEFICIÁRIO: Nome da empresa.
            - VALOR: Total final. Use ponto para decimais.
            - VENCIMENTO: Data ISO YYYY-MM-DD.
            - CATEGORIA: Escolha entre (Energia, Água, Internet, Aluguel, Fornecedores, Impostos, Salários, Manutenção, Outros).
            
            Retorne apenas JSON.`
          }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            beneficiary: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            dueDate: { type: Type.STRING },
            category: { type: Type.STRING }
          },
          required: ['beneficiary', 'amount', 'dueDate', 'category']
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    
    // Basic date normalization
    if (result.dueDate && result.dueDate.includes('/')) {
      const parts = result.dueDate.split('/');
      if (parts.length === 3) result.dueDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }

    return result as OCRResult;
  } catch (error: any) {
    return handleAIError(error);
  }
};

export const chatWithFinancialAssistant = async (query: string, bills: Bill[]): Promise<string> => {
  try {
    const ai = getAIInstance();
    const context = bills.map(b => ({ b: b.beneficiary, v: b.amount, d: b.dueDate, c: b.category, s: b.status }));

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [{ text: `Contas: ${JSON.stringify(context)}. Pergunta: ${query}` }]
      },
      config: {
        systemInstruction: 'Você é o consultor financeiro IA da ContasPro. Seja breve e responda em Português do Brasil de forma clara e profissional.'
      }
    });

    return response.text || "Não foi possível gerar uma resposta no momento.";
  } catch (error: any) {
    // Note: Assistant errors are usually caught by the UI component, 
    // but we still trigger the re-prompt if it's an entity error.
    try {
      handleAIError(error);
    } catch (e: any) {
      return e.message;
    }
    return "Ocorreu um erro na comunicação com a IA.";
  }
};

export const getDashboardInsight = async (bills: Bill[]): Promise<string> => {
  try {
    const ai = getAIInstance();
    const pending = bills.filter(b => b.status === 'PENDING').slice(0, 5);
    if (pending.length === 0) return "Tudo em ordem por aqui! Não há contas pendentes imediatas.";

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Contas: ${JSON.stringify(pending)}. Dê 1 conselho financeiro rápido e acionável em uma frase curta.`
    });
    return response.text || "Continue monitorando seus prazos para evitar multas.";
  } catch (e) {
    // Silently fail for dashboard insights to not block the UI
    return "Acompanhe seus vencimentos para manter o fluxo de caixa saudável.";
  }
};
