
import { GoogleGenAI, Type } from "@google/genai";
import { OCRResult, Bill } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const processBillImage = async (base64Image: string): Promise<OCRResult> => {
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
          text: 'Extraia os dados deste boleto ou fatura. Identifique o beneficiário, o valor total, a data de vencimento e a categoria sugerida entre (Energia, Água, Internet, Aluguel, Fornecedores, Impostos, Salários, Manutenção, Outros).'
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

  const text = response.text;
  if (!text) throw new Error('Falha na resposta do Gemini');
  return JSON.parse(text) as OCRResult;
};

export const chatWithFinancialAssistant = async (query: string, bills: Bill[]): Promise<string> => {
  // Criamos um contexto simplificado das contas para o modelo
  const context = bills.map(b => ({
    empresa: b.beneficiary,
    valor: b.amount,
    vencimento: b.dueDate,
    status: b.status,
    categoria: b.category
  }));

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        role: 'user',
        parts: [{ text: `Você é o consultor financeiro do ContasPro. Abaixo estão as contas atuais da empresa: ${JSON.stringify(context)}. Responda de forma curta e profissional à pergunta: ${query}` }]
      }
    ],
    config: {
      systemInstruction: 'Seja direto, profissional e ajude o usuário a entender sua saúde financeira. Use português do Brasil.'
    }
  });

  return response.text || "Desculpe, não consegui analisar as informações agora.";
};

export const getDashboardInsight = async (bills: Bill[]): Promise<string> => {
  const pending = bills.filter(b => b.status === 'PENDING');
  if (pending.length === 0) return "Tudo em dia! Nenhuma conta pendente no momento.";

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Com base nestas contas pendentes: ${JSON.stringify(pending.slice(0, 10))}, gere um insight rápido de uma frase para o dashboard. Foque em urgências ou economia.`
  });

  return response.text || "Analise suas contas pendentes para evitar juros.";
};
