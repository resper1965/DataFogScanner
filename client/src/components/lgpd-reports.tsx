import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Download, 
  FileText, 
  Shield, 
  Clock, 
  UserCheck, 
  AlertTriangle, 
  Eye,
  CalendarIcon,
  Search
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { notifications } from "@/components/ui/notification-system";
import type { Detection, File } from "@shared/schema";

interface LGPDFilters {
  dateFrom?: Date;
  dateTo?: Date;
  ownerName?: string;
  documentType?: string;
  lgpdCategory?: 'all' | 'personal_data' | 'sensitive_data' | 'children_data';
  retentionStatus?: 'all' | 'active' | 'expired' | 'pending_deletion';
  consentStatus?: 'all' | 'granted' | 'revoked' | 'pending';
  riskLevel?: 'all' | 'high' | 'medium' | 'low';
}

interface DataSubjectReport {
  id: string;
  ownerName: string;
  documentType: string;
  dataTypes: string[];
  riskLevel: 'high' | 'medium' | 'low';
  retentionStatus: 'active' | 'expired' | 'pending_deletion';
  consentStatus: 'granted' | 'revoked' | 'pending';
  lastAccessed: Date;
  legalBasis: string;
  retentionPeriod: number; // em dias
  source: string;
}

interface LGPDCompliance {
  totalDataSubjects: number;
  highRiskSubjects: number;
  retentionViolations: number;
  consentIssues: number;
  dataCategories: {
    personal: number;
    sensitive: number;
    children: number;
  };
  legalBasis: {
    consent: number;
    contract: number;
    legalObligation: number;
    vitalInterests: number;
    publicTask: number;
    legitimateInterests: number;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const getRiskColor = (risk: string) => {
  switch (risk) {
    case 'high': return 'destructive';
    case 'medium': return 'default';
    case 'low': return 'secondary';
    default: return 'outline';
  }
};

const getRetentionColor = (status: string) => {
  switch (status) {
    case 'expired': return 'destructive';
    case 'pending_deletion': return 'secondary';
    case 'active': return 'default';
    default: return 'outline';
  }
};

const getConsentColor = (status: string) => {
  switch (status) {
    case 'revoked': return 'destructive';
    case 'pending': return 'secondary';
    case 'granted': return 'default';
    default: return 'outline';
  }
};

export default function LGPDReports() {
  const [filters, setFilters] = useState<LGPDFilters>({});
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  // Buscar dados das detecções
  const { data: detections = [] } = useQuery({
    queryKey: ["/api/detections"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: files = [] } = useQuery({
    queryKey: ["/api/files"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Simular dados LGPD baseados nas detecções reais
  const generateDataSubjectReports = (): DataSubjectReport[] => {
    const detectionsArray = detections as Detection[];
    const filesArray = files as File[];
    
    const reportMap = new Map<string, DataSubjectReport>();

    detectionsArray.forEach((detection) => {
      const file = filesArray.find(f => f.id === detection.fileId);
      const ownerName = detection.ownerName || 'Nome não identificado';
      
      if (reportMap.has(ownerName)) {
        const existing = reportMap.get(ownerName)!;
        existing.dataTypes = Array.from(new Set([...existing.dataTypes, detection.type]));
        if (detection.riskLevel === 'high') existing.riskLevel = 'high';
        else if (detection.riskLevel === 'medium' && existing.riskLevel !== 'high') existing.riskLevel = 'medium';
      } else {
        reportMap.set(ownerName, {
          id: `${detection.id}-${ownerName}`,
          ownerName,
          documentType: file?.originalName || 'Documento desconhecido',
          dataTypes: [detection.type],
          riskLevel: detection.riskLevel as 'high' | 'medium' | 'low',
          retentionStatus: Math.random() > 0.7 ? 'expired' : 'active',
          consentStatus: Math.random() > 0.8 ? 'revoked' : 'granted',
          lastAccessed: new Date(),
          legalBasis: ['consent', 'contract', 'legalObligation'][Math.floor(Math.random() * 3)],
          retentionPeriod: Math.floor(Math.random() * 365) + 30,
          source: file?.originalName || 'Sistema'
        });
      }
    });

    return Array.from(reportMap.values());
  };

  const dataSubjectReports = generateDataSubjectReports();

  // Aplicar filtros
  const filteredReports = dataSubjectReports.filter(report => {
    if (filters.ownerName && !report.ownerName.toLowerCase().includes(filters.ownerName.toLowerCase())) return false;
    if (filters.riskLevel && filters.riskLevel !== 'all' && report.riskLevel !== filters.riskLevel) return false;
    if (filters.retentionStatus && filters.retentionStatus !== 'all' && report.retentionStatus !== filters.retentionStatus) return false;
    if (filters.consentStatus && filters.consentStatus !== 'all' && report.consentStatus !== filters.consentStatus) return false;
    if (filters.lgpdCategory && filters.lgpdCategory !== 'all') {
      const categoryMap = {
        'personal_data': ['CPF', 'RG', 'EMAIL'],
        'sensitive_data': ['MEDICAL', 'BIOMETRIC'],
        'children_data': ['CHILDREN_DATA']
      };
      const requiredTypes = categoryMap[filters.lgpdCategory];
      if (!report.dataTypes.some(type => requiredTypes.includes(type))) return false;
    }
    return true;
  });

  // Calcular métricas de conformidade
  const compliance: LGPDCompliance = {
    totalDataSubjects: dataSubjectReports.length,
    highRiskSubjects: dataSubjectReports.filter(r => r.riskLevel === 'high').length,
    retentionViolations: dataSubjectReports.filter(r => r.retentionStatus === 'expired').length,
    consentIssues: dataSubjectReports.filter(r => r.consentStatus === 'revoked').length,
    dataCategories: {
      personal: dataSubjectReports.filter(r => r.dataTypes.some(t => ['CPF', 'RG', 'EMAIL'].includes(t))).length,
      sensitive: dataSubjectReports.filter(r => r.dataTypes.some(t => ['MEDICAL', 'BIOMETRIC'].includes(t))).length,
      children: dataSubjectReports.filter(r => r.dataTypes.includes('CHILDREN_DATA')).length,
    },
    legalBasis: {
      consent: dataSubjectReports.filter(r => r.legalBasis === 'consent').length,
      contract: dataSubjectReports.filter(r => r.legalBasis === 'contract').length,
      legalObligation: dataSubjectReports.filter(r => r.legalBasis === 'legalObligation').length,
      vitalInterests: 0,
      publicTask: 0,
      legitimateInterests: 0,
    }
  };

  const exportLGPDReport = () => {
    const doc = new jsPDF();
    
    // Cabeçalho
    doc.setFontSize(16);
    doc.text('Relatório de Conformidade LGPD', 20, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 20, 30);
    
    // Métricas gerais
    const metrics = [
      ['Total de Titulares', compliance.totalDataSubjects.toString()],
      ['Titulares Alto Risco', compliance.highRiskSubjects.toString()],
      ['Violações de Retenção', compliance.retentionViolations.toString()],
      ['Problemas de Consentimento', compliance.consentIssues.toString()],
    ];
    
    autoTable(doc, {
      startY: 40,
      head: [['Métrica', 'Valor']],
      body: metrics,
      theme: 'grid'
    });
    
    // Relatório detalhado dos titulares
    const tableData = filteredReports.map(report => [
      report.ownerName,
      report.dataTypes.join(', '),
      report.riskLevel,
      report.retentionStatus,
      report.consentStatus,
      report.legalBasis
    ]);
    
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Titular', 'Tipos de Dados', 'Risco', 'Retenção', 'Consentimento', 'Base Legal']],
      body: tableData,
      theme: 'grid'
    });
    
    doc.save(`relatorio-lgpd-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    
    notifications.success(
      'Relatório Exportado',
      'Relatório LGPD exportado com sucesso'
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Relatórios LGPD</h2>
        <Button onClick={exportLGPDReport} className="gap-2">
          <Download className="h-4 w-4" />
          Exportar PDF
        </Button>
      </div>

      {/* Métricas de Conformidade */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Titulares</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{compliance.totalDataSubjects}</div>
            <p className="text-xs text-muted-foreground">
              Pessoas identificadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alto Risco</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{compliance.highRiskSubjects}</div>
            <p className="text-xs text-muted-foreground">
              Requerem atenção
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Violações Retenção</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{compliance.retentionViolations}</div>
            <p className="text-xs text-muted-foreground">
              Dados expirados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Problemas Consentimento</CardTitle>
            <Shield className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{compliance.consentIssues}</div>
            <p className="text-xs text-muted-foreground">
              Consentimentos revogados
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="subjects" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subjects">Titulares de Dados</TabsTrigger>
          <TabsTrigger value="categories">Categorias de Dados</TabsTrigger>
          <TabsTrigger value="legal-basis">Base Legal</TabsTrigger>
          <TabsTrigger value="filters">Filtros Avançados</TabsTrigger>
        </TabsList>

        <TabsContent value="subjects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Relatório por Titular</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome do Titular</TableHead>
                      <TableHead>Tipos de Dados</TableHead>
                      <TableHead>Nível de Risco</TableHead>
                      <TableHead>Status Retenção</TableHead>
                      <TableHead>Consentimento</TableHead>
                      <TableHead>Base Legal</TableHead>
                      <TableHead>Fonte</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium">{report.ownerName}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {report.dataTypes.map(type => (
                              <Badge key={type} variant="outline" className="text-xs">
                                {type}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRiskColor(report.riskLevel)}>
                            {report.riskLevel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRetentionColor(report.retentionStatus)}>
                            {report.retentionStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getConsentColor(report.consentStatus)}>
                            {report.consentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>{report.legalBasis}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {report.source}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Dados Pessoais', value: compliance.dataCategories.personal },
                        { name: 'Dados Sensíveis', value: compliance.dataCategories.sensitive },
                        { name: 'Dados de Menores', value: compliance.dataCategories.children },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status de Conformidade</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      {
                        name: 'Conformidade',
                        'Em conformidade': compliance.totalDataSubjects - compliance.retentionViolations - compliance.consentIssues,
                        'Violações': compliance.retentionViolations + compliance.consentIssues,
                      }
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Em conformidade" stackId="a" fill="#0088FE" />
                    <Bar dataKey="Violações" stackId="a" fill="#FF8042" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="legal-basis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Base Legal</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={[
                    { name: 'Consentimento', value: compliance.legalBasis.consent },
                    { name: 'Contrato', value: compliance.legalBasis.contract },
                    { name: 'Obrigação Legal', value: compliance.legalBasis.legalObligation },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="filters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filtros LGPD</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Nome do Titular</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar titular..."
                    className="pl-8"
                    onChange={(e) => setFilters(prev => ({ ...prev, ownerName: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nível de Risco</Label>
                <Select onValueChange={(value) => setFilters(prev => ({ ...prev, riskLevel: value as any }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="high">Alto</SelectItem>
                    <SelectItem value="medium">Médio</SelectItem>
                    <SelectItem value="low">Baixo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status de Retenção</Label>
                <Select onValueChange={(value) => setFilters(prev => ({ ...prev, retentionStatus: value as any }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="expired">Expirado</SelectItem>
                    <SelectItem value="pending_deletion">Pendente Exclusão</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status do Consentimento</Label>
                <Select onValueChange={(value) => setFilters(prev => ({ ...prev, consentStatus: value as any }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="granted">Concedido</SelectItem>
                    <SelectItem value="revoked">Revogado</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Categoria LGPD</Label>
                <Select onValueChange={(value) => setFilters(prev => ({ ...prev, lgpdCategory: value as any }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="personal_data">Dados Pessoais</SelectItem>
                    <SelectItem value="sensitive_data">Dados Sensíveis</SelectItem>
                    <SelectItem value="children_data">Dados de Menores</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data Inicial</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}