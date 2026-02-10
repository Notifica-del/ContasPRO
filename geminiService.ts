
import { GoogleGenAI, Type } from "@google/genai";
import { OCRResult, Bill } from "./types";

/**
 * Função utilitária para obter a instância do SDK com a chave atualizada.
 */
const getAIInstance = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Chave de API não encontrada. Por favor, clique no botão de configuração para selecionar sua chave.");
  }
  return new GoogleGenAI({ apiKey });
};

export const processBillDocument = async (base64Data: string, mimeType: string = 'image/jpeg'): Promise<OCRResult> => {
  const ai = getAIInstance();
  
  const dataParts = base64Data.split('base64,');
  const cleanData = dataParts.length > 1 ? dataParts[1] : dataParts[0];

  try {
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
    
    // Normalização básica de data
    if (result.dueDate && result.dueDate.includes('/')) {
      const parts = result.dueDate.split('/');
      if (parts.length === 3) result.dueDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }

    return result as OCRResult;
  } catch (error: any) {
    console.error("Erro Gemini OCR:", error);
    if (error.message?.includes("entity was not found")) {
      throw new Error("Sua chave de API parece inválida ou não pertence a um projeto com faturamento. Tente selecionar novamente.");
    }
    throw new Error(error.message || "Erro ao processar documento.");
  }
};

export const chatWithFinancialAssistant = async (query: string, bills: Bill[]): Promise<string> => {
  try {
    const ai = getAIInstance();
    const context = bills.map(b => ({ b: b.beneficiary, v: b.amount, d: b.dueDate, c: b.category, s: b.status }));

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ role: 'user', parts: [{ text: `Contas: ${JSON.stringify(context)}. Pergunta: ${query}` }] }],
      config: {
        systemInstruction: 'Você é o consultor financeiro IA da ContasPro. Seja breve e responda em Português.'
      }
    });

    return response.text || "Sem resposta.";
  } catch (e: any) {
    return e.message || "Erro ao consultar assistente.";
  }
};

export const getDashboardInsight = async (bills: Bill[]): Promise<string> => {
  try {
    const ai = getAIInstance();
    const pending = bills.filter(b => b.status === 'PENDING').slice(0, 5);
    if (pending.length === 0) return "Tudo em ordem por aqui!";

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Contas: ${JSON.stringify(pending)}. Dê 1 conselho rápido.`
    });
    return response.text || "Continue monitorando seus prazos.";
  } catch (e) {
    return "Acompanhe seus vencimentos para evitar multas.";
  }
};
