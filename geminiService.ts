
import { GoogleGenAI, Type } from "@google/genai";
import { OCRResult, Bill } from "./types";

// Função para obter o cliente AI de forma segura
const getAIClient = () => {
  const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : undefined;
  
  if (!apiKey) {
    console.warn("Atenção: API_KEY não configurada. Funcionalidades de IA podem falhar.");
  }
  
  return new GoogleGenAI({ apiKey: apiKey || 'missing-api-key' });
};

export const processBillDocument = async (base64Data: string, mimeType: string = 'image/jpeg'): Promise<OCRResult> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data.split(',')[1] || base64Data,
          },
        },
        {
          text: `Você é um especialista em processamento de documentos financeiros brasileiros (boletos, faturas, recibos, PDFs de cobrança). 
          Sua tarefa é extrair dados precisos deste documento.
          
          Instruções:
          1. Localize o Beneficiário (nome da empresa ou pessoa que recebe o pagamento).
          2. Localize o Valor Total (apenas o número, ignore o símbolo R$).
          3. Localize a Data de Vencimento. Tente converter para o formato ISO (YYYY-MM-DD).
          4. Sugira uma categoria baseada no emissor (Energia, Água, Internet, Aluguel, Fornecedores, Impostos, Salários, Manutenção, Outros).

          Se o documento for um PDF com várias páginas, analise todas para encontrar os dados finais de fechamento.
          Se não tiver certeza absoluta de um campo, forneça sua melhor estimativa ou deixe uma string vazia ("") em vez de falhar.`
        }
      ]
    },
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          beneficiary: { 
            type: Type.STRING,
            description: "Nome do beneficiário ou empresa emissora"
          },
          amount: { 
            type: Type.NUMBER,
            description: "Valor numérico total do documento"
          },
          dueDate: { 
            type: Type.STRING,
            description: "Data de vencimento no formato YYYY-MM-DD"
          },
          category: { 
            type: Type.STRING,
            description: "Categoria sugerida para o gasto"
          }
        },
        required: ['beneficiary', 'amount', 'dueDate', 'category']
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error('O modelo não retornou dados para este documento.');
  
  try {
    return JSON.parse(text) as OCRResult;
  } catch (e) {
    console.error("Erro ao parsear JSON da IA:", text);
    throw new Error('Erro ao processar os dados extraídos pela IA.');
  }
};

export const chatWithFinancialAssistant = async (query: string, bills: Bill[]): Promise<string> => {
  const ai = getAIClient();
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
  const ai = getAIClient();
  const pending = bills.filter(b => b.status === 'PENDING');
  if (pending.length === 0) return "Tudo em dia! Nenhuma conta pendente no momento.";

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Com base nestas contas pendentes: ${JSON.stringify(pending.slice(0, 10))}, gere um insight rápido de uma frase para o dashboard. Foque em urgências ou economia.`
  });

  return response.text || "Analise suas contas pendentes para evitar juros.";
};
