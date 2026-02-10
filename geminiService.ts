
import { GoogleGenAI, Type } from "@google/genai";
import { OCRResult, Bill } from "./types";

export const processBillDocument = async (base64Data: string, mimeType: string = 'image/jpeg'): Promise<OCRResult> => {
  // Criar instância logo antes da chamada para garantir que use a API Key atual
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const dataParts = base64Data.split('base64,');
  const cleanData = dataParts.length > 1 ? dataParts[1] : dataParts[0];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', // Flash 3 é excelente para OCR e mais resiliente em limites de quota
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanData,
            },
          },
          {
            text: `Aja como um motor de OCR financeiro avançado para o mercado brasileiro. 
            Analise este documento (imagem ou PDF) e extraia os dados para o Contas a Pagar.
            
            DIRETRIZES:
            - BENEFICIÁRIO: Nome da empresa emissora da conta.
            - VALOR: Procure por 'Total a Pagar', 'Valor do Documento' ou somas finais. Use ponto para decimais (ex: 150.75).
            - VENCIMENTO: Data limite de pagamento no formato ISO YYYY-MM-DD.
            - CATEGORIA: Escolha entre (Energia, Água, Internet, Aluguel, Fornecedores, Impostos, Salários, Manutenção, Outros).

            Retorne estritamente um JSON.`
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
    
    // Fallback de data para evitar erros de salvamento
    if (result.dueDate && result.dueDate.includes('/')) {
      const parts = result.dueDate.split('/');
      if (parts.length === 3) result.dueDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }

    return result as OCRResult;
  } catch (error: any) {
    console.error("Erro Gemini OCR:", error);
    
    // Se o erro for de chave não encontrada, podemos alertar o usuário
    if (error.message?.includes("Requested entity was not found")) {
      throw new Error("Erro de configuração da API Key. Por favor, reinicie a sessão e selecione a chave novamente.");
    }
    
    throw new Error("Não foi possível processar o arquivo. Verifique se o documento está legível e tente novamente.");
  }
};

export const chatWithFinancialAssistant = async (query: string, bills: Bill[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const context = bills.map(b => ({ b: b.beneficiary, v: b.amount, d: b.dueDate, c: b.category, s: b.status }));

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ role: 'user', parts: [{ text: `Contas: ${JSON.stringify(context)}. Pergunta: ${query}` }] }],
    config: {
      systemInstruction: 'Você é o consultor financeiro IA da ContasPro. Seja breve, direto e use Português do Brasil.'
    }
  });

  return response.text || "Sem resposta no momento.";
};

export const getDashboardInsight = async (bills: Bill[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const pending = bills.filter(b => b.status === 'PENDING').slice(0, 5);
  if (pending.length === 0) return "Tudo em ordem por aqui!";

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Contas: ${JSON.stringify(pending)}. Dê 1 conselho rápido.`
  });

  return response.text || "Continue monitorando seus prazos.";
};
