
import { GoogleGenAI, Type } from "@google/genai";
import { OCRResult, Bill } from "./types";

export const processBillDocument = async (base64Data: string, mimeType: string = 'image/jpeg'): Promise<OCRResult> => {
  // Inicialização direta conforme diretrizes
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Limpa o prefixo data:mime/type;base64, se existir
  const cleanBase64 = base64Data.includes('base64,') 
    ? base64Data.split('base64,')[1] 
    : base64Data;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview', // Upgrade para Pro para maior precisão em OCR/PDF
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: cleanBase64,
          },
        },
        {
          text: `Aja como um motor de OCR financeiro de alta precisão. Analise este documento (imagem ou PDF) e extraia os dados necessários para o contas a pagar.

Regras de Extração:
1. BENEFICIÁRIO: Identifique o nome da empresa, fornecedor ou pessoa que deve receber o pagamento. Procure por termos como "Beneficiário", "Cedente" ou "Emissor".
2. VALOR: Extraia o valor total final a ser pago. Ignore juros ou multas se houver um "Valor do Documento" claro. Retorne apenas o número (ex: 1250.50).
3. VENCIMENTO: Localize a data de vencimento. Se houver múltiplas parcelas no mesmo PDF, extraia a data da primeira ou da principal. Retorne sempre no formato ISO YYYY-MM-DD.
4. CATEGORIA: Classifique o gasto entre: Energia, Água, Internet, Aluguel, Fornecedores, Impostos, Salários, Manutenção ou Outros.

Documentos Brasileiros:
Fique atento a campos como "Vencimento", "Valor Cobrado", "Nosso Número" e nomes de bancos. Se for uma fatura de cartão, pegue o "Valor Total da Fatura".`
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
  if (!text) throw new Error('Não foi possível extrair texto do documento.');
  
  try {
    const result = JSON.parse(text) as OCRResult;
    
    // Normalização extra de segurança para a data caso venha em formato BR
    if (result.dueDate && result.dueDate.includes('/')) {
      const parts = result.dueDate.split('/');
      if (parts.length === 3) {
        result.dueDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    
    return result;
  } catch (e) {
    console.error("Erro no parse do JSON do Gemini:", text);
    throw new Error('Erro na interpretação dos dados do documento.');
  }
};

export const chatWithFinancialAssistant = async (query: string, bills: Bill[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const context = bills.map(b => ({
    empresa: b.beneficiary,
    valor: b.amount,
    vencimento: b.dueDate,
    status: b.status,
    categoria: b.category
  }));

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: [
      {
        role: 'user',
        parts: [{ text: `Contexto Financeiro: ${JSON.stringify(context)}. Pergunta: ${query}` }]
      }
    ],
    config: {
      systemInstruction: 'Você é o analista financeiro sênior da ContasPro. Responda de forma executiva, precisa e em português do Brasil.'
    }
  });

  return response.text || "Sem resposta do assistente.";
};

export const getDashboardInsight = async (bills: Bill[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const pending = bills.filter(b => b.status === 'PENDING');
  if (pending.length === 0) return "Fluxo de caixa saudável. Nenhuma pendência imediata.";

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analise rapidamente: ${JSON.stringify(pending.slice(0, 5))}. Gere um insight de 15 palavras sobre o que priorizar.`
  });

  return response.text || "Mantenha o acompanhamento de suas contas.";
};
