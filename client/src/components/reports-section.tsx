import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Download, FileText, BarChart3, PieChart, TrendingUp, Filter, Search } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
  LineChart,
  Line,
  Area,
  AreaChart
} from "recharts";
import type { Detection, File, Case } from "@shared/schema";

interface ReportFilters {
  dateFrom?: Date;
  dateTo?: Date;
  riskLevel?: string;
  detectionType?: string;
  caseId?: number;
  searchTerm?: string;
}

interface DetectionStats {
  totalDetections: number;
  byRiskLevel: { [key: string]: number };
  byType: { [key: string]: number };
  byDate: { date: string; count: number }[];
  topPatterns: { pattern: string; count: number }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const getRiskLevelColor = (level: string) => {
  switch (level) {
    case 'high': return 'destructive';
    case 'medium': return 'default';
    case 'low': return 'secondary';
    default: return 'outline';
  }
};

const getRiskLevelText = (level: string) => {
  switch (level) {
    case 'high': return 'Alto';
    case 'medium': return 'Médio';
    case 'low': return 'Baixo';
    default: return level;
  }
};

export default function ReportsSection() {
  const [filters, setFilters] = useState<ReportFilters>({});
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();

  // Fetch data from dedicated statistics endpoint
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/reports/stats"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: detections = [] } = useQuery({
    queryKey: ["/api/detections"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: files = [] } = useQuery({
    queryKey: ["/api/files"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: cases = [] } = useQuery({
    queryKey: ["/api/cases"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Filter detections based on current filters
  const filteredDetections = (detections as Detection[]).filter(detection => {
    if (filters.riskLevel && detection.riskLevel !== filters.riskLevel) return false;
    if (filters.detectionType && detection.type !== filters.detectionType) return false;
    if (filters.searchTerm && detection.context && !detection.context.toLowerCase().includes(filters.searchTerm.toLowerCase())) return false;
    
    // Date filtering
    if (dateFrom || dateTo) {
      const detectionDate = new Date(detection.createdAt || '');
      if (dateFrom && detectionDate < dateFrom) return false;
      if (dateTo && detectionDate > dateTo) return false;
    }
    
    return true;
  });

  // Use server-side statistics when no filters are applied, otherwise calculate from filtered data
  const hasFilters = Object.keys(filters).length > 0 || dateFrom || dateTo;
  
  const stats: DetectionStats = hasFilters ? {
    totalDetections: filteredDetections.length,
    byRiskLevel: filteredDetections.reduce((acc, d) => {
      acc[d.riskLevel] = (acc[d.riskLevel] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number }),
    byType: filteredDetections.reduce((acc, d) => {
      acc[d.type] = (acc[d.type] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number }),
    byDate: [],
    topPatterns: Object.entries(filteredDetections.reduce((acc, d) => {
      acc[d.type] = (acc[d.type] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number }))
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([pattern, count]) => ({ pattern, count }))
  } : statsData ? {
    totalDetections: statsData.totalDetections,
    byRiskLevel: statsData.byRiskLevel || {},
    byType: statsData.byType || {},
    byDate: Object.entries(statsData.byDate || {}).map(([date, count]) => ({
      date,
      count: count as number
    })).sort((a, b) => a.date.localeCompare(b.date)),
    topPatterns: Object.entries(statsData.byType || {})
      .map(([pattern, count]) => ({ pattern, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  } : {
    totalDetections: 0,
    byRiskLevel: {},
    byType: {},
    byDate: [],
    topPatterns: []
  };

  // Chart data
  const riskLevelChartData = Object.entries(stats.byRiskLevel).map(([level, count]) => ({
    level: getRiskLevelText(level),
    count,
    color: level === 'high' ? '#ef4444' : level === 'medium' ? '#f59e0b' : '#10b981'
  }));

  const typeChartData = Object.entries(stats.byType).map(([type, count]) => ({
    type,
    count
  }));

  const exportToCSV = () => {
    const csvData = filteredDetections.map(detection => ({
      'Data': new Date(detection.createdAt || '').toLocaleDateString('pt-BR'),
      'Tipo': detection.type,
      'Valor': detection.value,
      'Contexto': detection.context,
      'Risco': getRiskLevelText(detection.riskLevel),
      'Posição': detection.position,
      'Arquivo ID': detection.fileId
    }));

    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_pii_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const exportToPDF = async () => {
    // Generate PDF report (would need pdf generation library)
    console.log('Exportando relatório PDF...');
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Relatório
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Date From */}
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

            {/* Date To */}
            <div className="space-y-2">
              <Label>Data Final</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Risk Level */}
            <div className="space-y-2">
              <Label>Nível de Risco</Label>
              <Select onValueChange={(value) => setFilters(prev => ({ ...prev, riskLevel: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="high">Alto</SelectItem>
                  <SelectItem value="medium">Médio</SelectItem>
                  <SelectItem value="low">Baixo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Detection Type */}
            <div className="space-y-2">
              <Label>Tipo de Detecção</Label>
              <Select onValueChange={(value) => setFilters(prev => ({ ...prev, detectionType: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="cpf">CPF</SelectItem>
                  <SelectItem value="cnpj">CNPJ</SelectItem>
                  <SelectItem value="rg">RG</SelectItem>
                  <SelectItem value="cep">CEP</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="phone">Telefone</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="space-y-2">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar no contexto..."
                  className="pl-8"
                  onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={() => {
              setFilters({});
              setDateFrom(undefined);
              setDateTo(undefined);
            }} variant="outline">
              Limpar Filtros
            </Button>
            <Button onClick={exportToCSV} className="gap-2">
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
            <Button onClick={exportToPDF} variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              Exportar PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm font-medium leading-none">Total de Detecções</p>
                <p className="text-2xl font-bold">{stats.totalDetections}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm font-medium leading-none">Arquivos Processados</p>
                <p className="text-2xl font-bold">{(files as File[]).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <PieChart className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm font-medium leading-none">Casos Ativos</p>
                <p className="text-2xl font-bold">{(cases as Case[]).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <FileText className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm font-medium leading-none">Risco Alto</p>
                <p className="text-2xl font-bold text-red-500">{stats.byRiskLevel.high || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="risk-level" className="space-y-4">
        <TabsList>
          <TabsTrigger value="risk-level">Por Nível de Risco</TabsTrigger>
          <TabsTrigger value="detection-type">Por Tipo</TabsTrigger>
          <TabsTrigger value="patterns">Padrões Principais</TabsTrigger>
        </TabsList>

        <TabsContent value="risk-level">
          <Card>
            <CardHeader>
              <CardTitle>Detecções por Nível de Risco</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={riskLevelChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="level" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detection-type">
          <Card>
            <CardHeader>
              <CardTitle>Detecções por Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      dataKey="count"
                      data={typeChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={150}
                      fill="#8884d8"
                      label={({ type, count }: { type: string; count: number }) => `${type}: ${count}`}
                    >
                      {typeChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns">
          <Card>
            <CardHeader>
              <CardTitle>Padrões Mais Detectados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.topPatterns.map((pattern, index) => (
                  <div key={pattern.pattern} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">#{index + 1}</Badge>
                      <span className="font-medium">{pattern.pattern.toUpperCase()}</span>
                    </div>
                    <Badge>{pattern.count} detecções</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detecções Detalhadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Data</th>
                  <th className="text-left p-2">Tipo</th>
                  <th className="text-left p-2">Valor</th>
                  <th className="text-left p-2">Contexto</th>
                  <th className="text-left p-2">Risco</th>
                </tr>
              </thead>
              <tbody>
                {filteredDetections.slice(0, 20).map((detection) => (
                  <tr key={detection.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      {new Date(detection.createdAt || '').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-2">
                      <Badge variant="outline">{detection.type.toUpperCase()}</Badge>
                    </td>
                    <td className="p-2 font-mono text-sm">{detection.value}</td>
                    <td className="p-2 text-sm max-w-xs truncate">{detection.context}</td>
                    <td className="p-2">
                      <Badge variant={getRiskLevelColor(detection.riskLevel)}>
                        {getRiskLevelText(detection.riskLevel)}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredDetections.length > 20 && (
              <p className="text-sm text-muted-foreground mt-2">
                Mostrando 20 de {filteredDetections.length} detecções
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}