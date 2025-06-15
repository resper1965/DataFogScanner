import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface SemanticDetection {
  type: string;
  value: string;
  context: string;
  position: number;
  riskLevel: 'high' | 'medium' | 'low';
  confidence: number; // 0-1 score from AI
  source: 'regex' | 'semantic' | 'hybrid';
}

export interface RegexCandidate {
  type: string;
  value: string;
  context: string;
  position: number;
  riskLevel: 'high' | 'medium' | 'low';
}

export class SemanticClassifier {
  private maxContextLength = 2000; // Limit context for API efficiency

  async classifyText(text: string, regexCandidates: RegexCandidate[]): Promise<SemanticDetection[]> {
    const results: SemanticDetection[] = [];

    // Process regex candidates first
    for (const candidate of regexCandidates) {
      // For high-confidence regex patterns (CPF, CNPJ, etc.), validate with AI
      if (this.needsValidation(candidate.type)) {
        const validation = await this.validateWithAI(candidate, text);
        if (validation.isValid) {
          results.push({
            ...candidate,
            confidence: validation.confidence,
            source: 'hybrid'
          });
        }
      } else {
        // Low-risk patterns can pass through without AI validation
        results.push({
          ...candidate,
          confidence: 0.95, // High confidence for structured patterns
          source: 'regex'
        });
      }
    }

    // Perform semantic analysis for patterns that require AI detection
    const semanticResults = await this.performSemanticAnalysis(text);
    results.push(...semanticResults);

    // Remove duplicates and merge overlapping detections
    return this.deduplicateResults(results);
  }

  private needsValidation(type: string): boolean {
    // Patterns that benefit from AI validation
    const validationTypes = [
      'nome_completo',
      'endereco', 
      'data_nascimento',
      'cnh', // Numbers can be ambiguous
      'titulo_eleitor' // Numbers can be ambiguous
    ];
    return validationTypes.includes(type);
  }

  private async validateWithAI(candidate: RegexCandidate, fullText: string): Promise<{isValid: boolean, confidence: number}> {
    try {
      const contextStart = Math.max(0, candidate.position - 100);
      const contextEnd = Math.min(fullText.length, candidate.position + candidate.value.length + 100);
      const context = fullText.slice(contextStart, contextEnd);

      const prompt = this.buildValidationPrompt(candidate, context);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Você é um especialista em proteção de dados e LGPD. Analise se o texto contém dados pessoais sensíveis genuínos ou falsos positivos. Responda apenas em JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        isValid: result.is_valid || false,
        confidence: Math.min(Math.max(result.confidence || 0, 0), 1)
      };

    } catch (error) {
      console.error('Erro na validação semântica:', error);
      // Fallback to regex-only detection with lower confidence
      return { isValid: true, confidence: 0.7 };
    }
  }

  private async performSemanticAnalysis(text: string): Promise<SemanticDetection[]> {
    try {
      // Truncate text if too long
      const analysisText = text.length > this.maxContextLength 
        ? text.slice(0, this.maxContextLength) 
        : text;

      const prompt = this.buildSemanticPrompt(analysisText);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Você é um especialista em LGPD e proteção de dados. Identifique dados pessoais sensíveis que podem não ter sido detectados por expressões regulares. Foque em nomes completos, endereços complexos e dados contextuais."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2
      });

      const result = JSON.parse(response.choices[0].message.content || '{"detections": []}');

      interface RawDetection {
        type?: string;
        value?: string;
        context?: string;
        risk_level?: string;
        confidence?: number;
      }

      return (result.detections || []).map((detection: RawDetection) => ({
        type: detection.type || 'UNKNOWN',
        value: detection.value || '',
        context: detection.context || '',
        position: this.findTextPosition(text, detection.value) || 0,
        riskLevel: detection.risk_level || 'medium',
        confidence: Math.min(Math.max(detection.confidence || 0.5, 0), 1),
        source: 'semantic' as const
      }));

    } catch (error) {
      console.error('Erro na análise semântica:', error);
      return [];
    }
  }

  private buildValidationPrompt(candidate: RegexCandidate, context: string): string {
    return `
Analise se o valor "${candidate.value}" no contexto abaixo é genuinamente um ${candidate.type}:

CONTEXTO:
"${context}"

CRITÉRIOS:
- Para nomes: deve ser nome de pessoa real, não nome de empresa/produto
- Para endereços: deve ser endereço completo e válido
- Para documentos: deve estar em contexto pessoal, não como exemplo
- Para datas: deve ser data de nascimento plausível (1900-2010)

Responda em JSON:
{
  "is_valid": boolean,
  "confidence": number (0.0-1.0),
  "reasoning": "explicação breve"
}`;
  }

  private buildSemanticPrompt(text: string): string {
    return `
Analise o texto abaixo e identifique dados pessoais sensíveis que podem ter sido perdidos por regex simples:

TEXTO:
"${text}"

PROCURE POR:
1. Nomes completos de pessoas (2+ palavras capitalizadas)
2. Endereços residenciais/comerciais complexos
3. Dados contextuais (profissão + nome, cargo + pessoa)
4. Informações familiares (filho de, casado com)
5. Dados médicos ou financeiros em linguagem natural

IGNORE:
- Nomes de empresas, produtos, lugares
- Endereços de websites
- Datas que não sejam nascimento
- Números de telefone já detectados por regex

Responda em JSON:
{
  "detections": [
    {
      "type": "nome_completo|endereco_complexo|informacao_familiar|dados_medicos|dados_financeiros",
      "value": "texto exato encontrado",
      "context": "contexto de 50 caracteres ao redor",
      "risk_level": "high|medium|low",
      "confidence": number (0.0-1.0)
    }
  ]
}`;
  }

  private findTextPosition(text: string, value: string): number {
    return text.indexOf(value);
  }

  private deduplicateResults(results: SemanticDetection[]): SemanticDetection[] {
    const deduplicated: SemanticDetection[] = [];
    
    for (const result of results) {
      // Check for overlapping detections
      const existing = deduplicated.find(d => 
        Math.abs(d.position - result.position) < 10 && 
        d.value.includes(result.value) || result.value.includes(d.value)
      );

      if (existing) {
        // Keep the one with higher confidence
        if (result.confidence > existing.confidence) {
          const index = deduplicated.indexOf(existing);
          deduplicated[index] = result;
        }
      } else {
        deduplicated.push(result);
      }
    }

    return deduplicated.sort((a, b) => a.position - b.position);
  }
}

export const semanticClassifier = new SemanticClassifier();