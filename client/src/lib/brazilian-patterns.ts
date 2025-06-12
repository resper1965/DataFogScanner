export interface BrazilianPattern {
  id: string;
  name: string;
  description: string;
  regex: string;
  riskLevel: 'high' | 'medium' | 'low';
  enabled: boolean;
}

export function getBrazilianPatterns(): BrazilianPattern[] {
  return [
    {
      id: 'cpf',
      name: 'CPF',
      description: 'Cadastro de Pessoas Físicas',
      regex: '\\b\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}\\b',
      riskLevel: 'high',
      enabled: true
    },
    {
      id: 'cnpj',
      name: 'CNPJ',
      description: 'Cadastro Nacional de Pessoa Jurídica',
      regex: '\\b\\d{2}\\.\\d{3}\\.\\d{3}/\\d{4}-\\d{2}\\b',
      riskLevel: 'high',
      enabled: true
    },
    {
      id: 'cep',
      name: 'CEP',
      description: 'Código de Endereçamento Postal',
      regex: '\\b\\d{5}-\\d{3}\\b',
      riskLevel: 'medium',
      enabled: true
    },
    {
      id: 'rg',
      name: 'RG',
      description: 'Registro Geral',
      regex: '\\b\\d{1,2}\\.\\d{3}\\.\\d{3}-\\d{1}\\b',
      riskLevel: 'high',
      enabled: false
    },
    {
      id: 'telefone',
      name: 'Telefone',
      description: 'Números de telefone brasileiros',
      regex: '\\b\\(?\\d{2}\\)?\\s?\\d{4,5}-?\\d{4}\\b',
      riskLevel: 'medium',
      enabled: true
    },
    {
      id: 'email',
      name: 'Email',
      description: 'Endereços de email',
      regex: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
      riskLevel: 'low',
      enabled: true
    }
  ];
}

export function getRiskLevelColor(riskLevel: 'high' | 'medium' | 'low'): string {
  switch (riskLevel) {
    case 'high':
      return 'border-red-500 bg-red-50';
    case 'medium':
      return 'border-yellow-500 bg-yellow-50';
    case 'low':
      return 'border-blue-500 bg-blue-50';
    default:
      return 'border-gray-500 bg-gray-50';
  }
}

export function getRiskLevelBadgeColor(riskLevel: 'high' | 'medium' | 'low'): string {
  switch (riskLevel) {
    case 'high':
      return 'bg-red-500 text-white';
    case 'medium':
      return 'bg-yellow-500 text-white';
    case 'low':
      return 'bg-blue-500 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
}

export function getRiskLevelText(riskLevel: 'high' | 'medium' | 'low'): string {
  switch (riskLevel) {
    case 'high':
      return 'Alto Risco';
    case 'medium':
      return 'Médio Risco';
    case 'low':
      return 'Baixo Risco';
    default:
      return 'Risco Desconhecido';
  }
}
