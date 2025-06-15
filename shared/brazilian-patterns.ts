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
    // Dados de Identidade (Alto Risco - LGPD)
    {
      id: 'nome_completo',
      name: 'Nome Completo',
      description: 'Nomes completos de pessoas físicas',
      regex: '\\b([A-ZÀ-Ú][a-zà-ú]+(?:\\s[A-ZÀ-Ú][a-zà-ú]+)+)\\b',
      riskLevel: 'high',
      enabled: false // Requer validação semântica para evitar falsos positivos
    },
    {
      id: 'cpf',
      name: 'CPF',
      description: 'Cadastro de Pessoas Físicas - formato XXX.XXX.XXX-XX',
      regex: '\\b\\d{3}\\.?\\d{3}\\.?\\d{3}-?\\d{2}\\b',
      riskLevel: 'high',
      enabled: true
    },
    {
      id: 'cnpj',
      name: 'CNPJ',
      description: 'Cadastro Nacional de Pessoa Jurídica - formato XX.XXX.XXX/XXXX-XX',
      regex: '\\b\\d{2}\\.?\\d{3}\\.?\\d{3}/?\\d{4}-?\\d{2}\\b',
      riskLevel: 'high',
      enabled: true
    },
    {
      id: 'rg',
      name: 'RG',
      description: 'Registro Geral - diversos formatos estaduais',
      regex: '\\b\\d{1,2}\\.?\\d{3}\\.?\\d{3}-?[0-9Xx]\\b',
      riskLevel: 'high',
      enabled: true
    },
    {
      id: 'cnh',
      name: 'CNH',
      description: 'Carteira Nacional de Habilitação - 11 dígitos',
      regex: '\\b\\d{11}\\b',
      riskLevel: 'high',
      enabled: false
    },
    {
      id: 'titulo_eleitor',
      name: 'Título de Eleitor',
      description: 'Título de Eleitor brasileiro - 12 dígitos',
      regex: '\\b\\d{12}\\b',
      riskLevel: 'high',
      enabled: false
    },
    {
      id: 'nis_pis_pasep',
      name: 'NIS/PIS/PASEP',
      description: 'Número de Identificação Social - formato XXX.XXXXX.XX-X',
      regex: '\\b\\d{3}\\.\\d{5}\\.\\d{2}-\\d{1}\\b',
      riskLevel: 'high',
      enabled: false
    },
    {
      id: 'cartao_sus',
      name: 'Cartão SUS',
      description: 'Cartão Nacional de Saúde - 15 dígitos',
      regex: '\\b\\d{3}\\s?\\d{4}\\s?\\d{4}\\s?\\d{4}\\b',
      riskLevel: 'high',
      enabled: false
    },

    // Dados de Contato (Médio/Baixo Risco)
    {
      id: 'email',
      name: 'Email',
      description: 'Endereços de email válidos',
      regex: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b',
      riskLevel: 'low',
      enabled: true
    },
    {
      id: 'telefone',
      name: 'Telefone',
      description: 'Telefones brasileiros com DDD - celular e fixo',
      regex: '\\b(?:\\(?\\d{2}\\)?\\s?)?(?:9\\d{4}-?\\d{4}|\\d{4}-?\\d{4})\\b',
      riskLevel: 'medium',
      enabled: true
    },

    // Dados de Localização
    {
      id: 'cep',
      name: 'CEP',
      description: 'Código de Endereçamento Postal - formato XXXXX-XXX',
      regex: '\\b\\d{5}-?\\d{3}\\b',
      riskLevel: 'medium',
      enabled: true
    },
    {
      id: 'endereco',
      name: 'Endereço',
      description: 'Endereços residenciais e comerciais (heurístico)',
      regex: '\\d{1,5}\\s[\\w\\s]{1,20}(?:Rua|Av|Avenida|Alameda|Travessa|Praça|Estrada|Rod|Rodovia)',
      riskLevel: 'medium',
      enabled: false // Requer validação semântica
    },
    {
      id: 'coordenadas',
      name: 'Coordenadas Geográficas',
      description: 'Latitude e longitude em formato decimal',
      regex: '\\b-?\\d{1,3}\\.\\d+,\\s*-?\\d{1,3}\\.\\d+\\b',
      riskLevel: 'medium',
      enabled: false
    },

    // Dados Temporais
    {
      id: 'data_nascimento',
      name: 'Data de Nascimento',
      description: 'Datas em formato brasileiro DD/MM/AAAA',
      regex: '\\b(?:0?[1-9]|[12]\\d|3[01])[/-](?:0?[1-9]|1[0-2])[/-](?:19|20)\\d{2}\\b',
      riskLevel: 'high',
      enabled: false
    },

    // Dados Veiculares
    {
      id: 'placa_veiculo',
      name: 'Placa de Veículo',
      description: 'Placas Mercosul e antigas - formato ABC1234 ou ABC1A23',
      regex: '\\b[A-Z]{3}[0-9][A-Z0-9][0-9]{2}\\b',
      riskLevel: 'medium',
      enabled: false
    },

    // Dados Técnicos
    {
      id: 'ip_address',
      name: 'Endereço IP',
      description: 'Endereços IPv4 - formato XXX.XXX.XXX.XXX',
      regex: '\\b(?:[0-9]{1,3}\\.){3}[0-9]{1,3}\\b',
      riskLevel: 'low',
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
