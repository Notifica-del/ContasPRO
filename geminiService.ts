
import { GoogleGenAI, Type } from "@google/genai";
import { OCRResult, Bill } from "./types";

export const processBillDocument = async (base64Data: string, mimeType: string = 'image/jpeg'): Promise<OCRResult> => {
  // Inicializa o cliente usando a variável de ambiente injetada
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Limpa o prefixo do base64 para garantir que apenas os dados binários sejam enviados
  const dataParts = base64Data.split('base64,');
  const cleanData = dataParts.length > 1 ? dataParts[1] : dataParts[0];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Modelo Pro é essencial para OCR de alta precisão em PDFs
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanData,
            },
          },
          {
            text: `Você é um sistema de OCR de alta precisão especializado em documentos financeiros brasileiros. 
            Analise este documento (que pode ser uma imagem ou um PDF) e extraia os seguintes dados:
            
            1. BENEFICIÁRIO: Nome da empresa emissora (ex: concessionária de energia, fornecedor, banco).
            2. VALOR: O valor total final do documento. Use ponto para decimais (ex: 1500.50).
            3. VENCIMENTO: A data de vencimento no formato ISO (YYYY-MM-DD).
            4. CATEGORIA: Classifique em (Energia, Água, Internet, Aluguel, Fornecedores, Impostos, Salários, Manutenção, Outros).

            INSTRUÇÕES ESPECÍFICAS PARA BOLETOS:
            - Procure por "Valor do Documento" ou "Valor Cobrado".
            - Procure por "Data de Vencimento".
            - Se for um PDF multi-página, analise todas as partes para encontrar o resumo financeiro.
            
            Responda exclusivamente em formato JSON.`
          }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            beneficiary: { type: Type.STRING, description: "Nome do beneficiário" },
            amount: { type: Type.NUMBER, description: "Valor numérico" },
            dueDate: { type: Type.STRING, description: "Data ISO YYYY-MM-DD" },
            category: { type: Type.STRING, description: "Categoria sugerida" }
          },
          required: ['beneficiary', 'amount', 'dueDate', 'category']
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    
    // Tratamento de segurança para datas caso venham fora do padrão
    if (result.dueDate && result.dueDate.includes('/')) {
      const p = result.dueDate.split('/');
      if (p.length === 3) {
        result.dueDate = `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
      }
    }

    return result as OCRResult;
  } catch (error) {
    console.error("Erro crítico no processamento Gemini:", error);
    throw new Error("A IA não conseguiu ler este documento. Tente uma foto mais clara ou o PDF original.");
  }
};

export const chatWithFinancialAssistant = async (query: string, bills: Bill[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const context = bills.map(b => ({
    b: b.beneficiary,
    v: b.amount,
    d: b.dueDate,
    s: b.status,
    c: b.category
  }));

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: [
      {
        role: 'user',
        parts: [{ text: `Contas Atuais: ${JSON.stringify(context)}. Pergunta: ${query}` }]
      }
    ],
    config: {
      systemInstruction: 'Você é um consultor financeiro corporativo. Responda de forma curta e objetiva em Português.'
    }
  });

  return response.text || "Não foi possível gerar uma resposta agora.";
};

export const getDashboardInsight = async (bills: Bill[]): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const pending = bills.filter(b => b.status === 'PENDING').slice(0, 5);
  if (pending.length === 0) return "Excelente! Todas as contas estão em dia.";

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Analise as pendências: ${JSON.stringify(pending)}. Dê um conselho financeiro de no máximo 15 palavras.`
  });

  return response.text || "Acompanhe seus vencimentos para evitar multas.";
};
