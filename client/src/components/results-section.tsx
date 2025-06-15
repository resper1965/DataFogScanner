import { useQuery } from "@tanstack/react-query";
import type { Detection, File } from "@shared/schema";
import { AlertTriangle, PieChart, Download, ExternalLink, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getRiskLevelColor, getRiskLevelBadgeColor, getRiskLevelText } from "@/lib/brazilian-patterns";
import { apiRequest } from "@/lib/queryClient";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProcessingStats {
  totalFiles: number;
  queuedFiles: number;
  processingFiles: number;
  completedFiles: number;
  errorFiles: number;
  totalDetections: number;
  highRiskDetections: number;
  mediumRiskDetections: number;
  lowRiskDetections: number;
}

export default function ResultsSection() {
  const { data: detections = [] } = useQuery<Detection[]>({
    queryKey: ["/api/detections"],
    refetchInterval: 2000,
  });

  const { data: stats = {} as ProcessingStats } = useQuery<ProcessingStats>({
    queryKey: ["/api/processing/stats"],
    refetchInterval: 2000,
  });

  const { data: files = [] } = useQuery<File[]>({
    queryKey: ["/api/files"],
    refetchInterval: 2000,
  });

  const handleExportReport = async () => {
    try {
      const response = await apiRequest("GET", "/api/reports/export");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'relatorio-datafog.json';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
    }
  };

  const exportToPDF = async () => {
    try {
      const doc = new jsPDF();
      
      // Cabeçalho
      doc.setFont('helvetica');
      doc.setFontSize(18);
      doc.text('Relatório de Detecções - PII Detector', 20, 20);
      
      doc.setFontSize(12);
      doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 20, 30);
      
      // Estatísticas
      let yPos = 50;
      doc.setFontSize(14);
      doc.text('Resumo das Detecções', 20, yPos);
      yPos += 15;
      
      doc.setFontSize(10);
      doc.text(`Total de Detecções: ${detections.length}`, 20, yPos);
      yPos += 8;
      doc.text(`Alto Risco: ${highRiskCount}`, 20, yPos);
      yPos += 8;
      doc.text(`Médio Risco: ${mediumRiskCount}`, 20, yPos);
      yPos += 8;
      doc.text(`Baixo Risco: ${lowRiskCount}`, 20, yPos);
      yPos += 15;
      
      // Tabela de detecções
      const tableData = recentDetections.slice(0, 20).map((detection) => [
        format(new Date(detection.createdAt || ''), 'dd/MM/yyyy'),
        detection.type,
        detection.value.length > 20 ? detection.value.substring(0, 20) + '...' : detection.value,
        detection.ownerName || 'Não identificado',
        getRiskLevelText(detection.riskLevel as 'high' | 'medium' | 'low'),
        detection.context && detection.context.length > 25 
          ? detection.context.substring(0, 25) + '...' 
          : detection.context || ''
      ]);
      
      autoTable(doc, {
        head: [['Data', 'Tipo', 'Valor', 'Titular', 'Risco', 'Contexto']],
        body: tableData,
        startY: yPos,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 15 },
          2: { cellWidth: 25 },
          3: { cellWidth: 30 },
          4: { cellWidth: 15 },
          5: { cellWidth: 75 }
        }
      });
      
      // Rodapé
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Página ${i} de ${pageCount}`, 170, 285);
        doc.text('PII Detector DataFog', 20, 285);
      }
      
      const fileName = `deteccoes_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    }
  };

  const recentDetections = detections.slice(-10); // Mostrar as 10 mais recentes
  const totalDetections = detections.length;
  
  // Calculate risk counts from actual detections
  const highRiskCount = detections.filter((d) => d.riskLevel === 'high').length;
  const mediumRiskCount = detections.filter((d) => d.riskLevel === 'medium').length;
  const lowRiskCount = detections.filter((d) => d.riskLevel === 'low').length;

  const documentTypes = [
    { name: 'PDF', count: files.filter((f) => f.originalName?.toLowerCase().endsWith('.pdf')).length, icon: 'fa-file-pdf', color: 'text-red-500' },
    { name: 'DOC', count: files.filter((f) => f.originalName?.toLowerCase().match(/\.(doc|docx)$/)).length, icon: 'fa-file-word', color: 'text-blue-500' },
    { name: 'ZIP', count: files.filter((f) => f.originalName?.toLowerCase().endsWith('.zip')).length, icon: 'fa-file-archive', color: 'text-yellow-500' },
    { name: 'TXT', count: files.filter((f) => f.originalName?.toLowerCase().endsWith('.txt')).length, icon: 'fa-file-alt', color: 'text-gray-500' },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Detection Results */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="text-yellow-600 mr-2" />
            Dados Sensíveis Detectados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recentDetections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma detecção encontrada
            </div>
          ) : (
            recentDetections.map((detection) => {
              const file = files?.find((f) => f.id === detection.fileId);
              const riskColorClass = getRiskLevelColor(
                detection.riskLevel as 'high' | 'medium' | 'low'
              );
              const badgeColorClass = getRiskLevelBadgeColor(
                detection.riskLevel as 'high' | 'medium' | 'low'
              );
              
              return (
                <div key={detection.id} className={`border-l-4 p-4 rounded-r-lg ${riskColorClass}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        {detection.type} Detectado
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Em: {file?.originalName || 'Arquivo desconhecido'}
                      </p>
                      {detection.context && (
                        <p className="text-xs text-muted-foreground mt-1 font-mono bg-muted p-1 rounded">
                          Contexto: "{detection.context}"
                        </p>
                      )}
                    </div>
                    <Badge className={`ml-2 ${badgeColorClass}`}>
                      {getRiskLevelText(detection.riskLevel as 'high' | 'medium' | 'low')}
                    </Badge>
                  </div>
                </div>
              );
            })
          )}
          
          {totalDetections > 5 && (
            <div className="pt-4 border-t border-border">
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-1 h-4 w-4" />
                Ver Todas as Detecções ({totalDetections})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center">
            <PieChart className="text-primary mr-2" />
            Estatísticas Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Risk Level Distribution */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Alto Risco</span>
                <span className="text-sm text-muted-foreground">{highRiskCount} ocorrências</span>
              </div>
              <Progress 
                value={totalDetections > 0 ? (highRiskCount / totalDetections) * 100 : 0} 
                className="w-full h-2" 
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Médio Risco</span>
                <span className="text-sm text-muted-foreground">{mediumRiskCount} ocorrências</span>
              </div>
              <Progress 
                value={totalDetections > 0 ? (mediumRiskCount / totalDetections) * 100 : 0} 
                className="w-full h-2" 
              />
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Baixo Risco</span>
                <span className="text-sm text-muted-foreground">{lowRiskCount} ocorrências</span>
              </div>
              <Progress 
                value={totalDetections > 0 ? (lowRiskCount / totalDetections) * 100 : 0} 
                className="w-full h-2" 
              />
            </div>
          </div>
          
          {/* Document Type Distribution */}
          <div className="pt-4 border-t border-border">
            <h4 className="font-medium text-foreground mb-3">Tipos de Documento</h4>
            <div className="grid grid-cols-2 gap-3">
              {documentTypes.map((type) => (
                <div key={type.name} className="text-center p-3 bg-muted rounded-lg">
                  <div className={`text-lg mb-1 ${type.color}`}>📄</div>
                  <p className="text-xs text-muted-foreground">{type.name}</p>
                  <p className="text-sm font-medium text-foreground">{type.count}</p>
                </div>
              ))}
            </div>
          </div>
          
          {/* Export Options */}
          <div className="pt-4 border-t border-border space-y-2">
            <Button 
              onClick={handleExportReport}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white"
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar JSON
            </Button>
            <Button 
              onClick={async () => {
                try {
                  const response = await apiRequest("GET", "/api/reports/export/csv");
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.style.display = 'none';
                  a.href = url;
                  a.download = 'relatorio-datafog.csv';
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                } catch (error) {
                  console.error('Erro ao exportar CSV:', error);
                }
              }}
              variant="outline"
              className="w-full"
            >
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
            <Button 
              onClick={exportToPDF}
              variant="outline" 
              className="w-full"
            >
              <FileText className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
