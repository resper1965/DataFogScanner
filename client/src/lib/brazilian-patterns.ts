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
      description: 'Cadastro de Pessoas Físicas - formato XXX.XXX.XXX-XX',
      regex: '\\b\\d{3}\\.\\d{3}\\.\\d{3}-\\d{2}\\b|\\b\\d{11}\\b',
      riskLevel: 'high',
      enabled: true
    },
    {
      id: 'cnpj',
      name: 'CNPJ',
      description: 'Cadastro Nacional de Pessoa Jurídica - formato XX.XXX.XXX/XXXX-XX',
      regex: '\\b\\d{2}\\.\\d{3}\\.\\d{3}/\\d{4}-\\d{2}\\b|\\b\\d{14}\\b',
      riskLevel: 'high',
      enabled: true
    },
    {
      id: 'cep',
      name: 'CEP',
      description: 'Código de Endereçamento Postal - formato XXXXX-XXX',
      regex: '\\b\\d{5}-\\d{3}\\b|\\b\\d{8}\\b',
      riskLevel: 'medium',
      enabled: true
    },
    {
      id: 'rg',
      name: 'RG',
      description: 'Registro Geral - diversos formatos estaduais',
      regex: '\\b\\d{1,2}\\.\\d{3}\\.\\d{3}-?\\d{1,2}\\b|\\b\\d{7,9}\\b',
      riskLevel: 'high',
      enabled: true
    },
    {
      id: 'telefone',
      name: 'Telefone',
      description: 'Números de telefone brasileiros - celular e fixo',
      regex: '\\b\\(?\\d{2}\\)?\\s?9?\\d{4}-?\\d{4}\\b|\\b\\d{10,11}\\b',
      riskLevel: 'medium',
      enabled: true
    },
    {
      id: 'email',
      name: 'Email',
      description: 'Endereços de email válidos',
      regex: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
      riskLevel: 'low',
      enabled: true
    },
    {
      id: 'pis',
      name: 'PIS/PASEP',
      description: 'Programa de Integração Social - formato XXX.XXXXX.XX-X',
      regex: '\\b\\d{3}\\.\\d{5}\\.\\d{2}-\\d{1}\\b|\\b\\d{11}\\b',
      riskLevel: 'high',
      enabled: false
    },
    {
      id: 'titulo_eleitor',
      name: 'Título de Eleitor',
      description: 'Título de Eleitor brasileiro - 12 dígitos',
      regex: '\\b\\d{4}\\s?\\d{4}\\s?\\d{4}\\b|\\b\\d{12}\\b',
      riskLevel: 'high',
      enabled: false
    },
    {
      id: 'cartao_sus',
      name: 'Cartão SUS',
      description: 'Cartão Nacional de Saúde - 15 dígitos',
      regex: '\\b\\d{3}\\s?\\d{4}\\s?\\d{4}\\s?\\d{4}\\b|\\b\\d{15}\\b',
      riskLevel: 'high',
      enabled: false
    },
    {
      id: 'conta_bancaria',
      name: 'Conta Bancária',
      description: 'Números de conta bancária brasileira',
      regex: '\\b\\d{4,6}-?\\d{1}\\b|Conta:?\\s*\\d{4,10}',
      riskLevel: 'high',
      enabled: false
    },
    {
      id: 'agencia_bancaria',
      name: 'Agência Bancária',
      description: 'Códigos de agência bancária',
      regex: '\\bAg[êe]ncia:?\\s*\\d{4}-?\\d?\\b|\\b\\d{4}-?\\d\\b',
      riskLevel: 'medium',
      enabled: false
    },
    {
      id: 'cartao_credito',
      name: 'Cartão de Crédito',
      description: 'Números de cartão de crédito',
      regex: '\\b\\d{4}\\s?\\d{4}\\s?\\d{4}\\s?\\d{4}\\b',
      riskLevel: 'high',
      enabled: false
    },
    {
      id: 'cnh',
      name: 'CNH',
      description: 'Carteira Nacional de Habilitação',
      regex: '\\b\\d{11}\\b|CNH:?\\s*\\d{11}',
      riskLevel: 'high',
      enabled: false
    },
    {
      id: 'placa_veiculo',
      name: 'Placa de Veículo',
      description: 'Placas de veículos brasileiros - Mercosul e antigas',
      regex: '\\b[A-Z]{3}\\d{4}\\b|\\b[A-Z]{3}\\d[A-Z]\\d{2}\\b',
      riskLevel: 'medium',
      enabled: false
    },
    {
      id: 'renavam',
      name: 'RENAVAM',
      description: 'Registro Nacional de Veículos Automotores',
      regex: '\\b\\d{11}\\b|RENAVAM:?\\s*\\d{11}',
      riskLevel: 'medium',
      enabled: false
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
