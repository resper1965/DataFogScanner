import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, PieChart, Download, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getRiskLevelColor, getRiskLevelBadgeColor, getRiskLevelText } from "@/lib/brazilian-patterns";
import { apiRequest } from "@/lib/queryClient";

export default function ResultsSection() {
  const { data: detections } = useQuery({
    queryKey: ["/api/detections"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/processing/stats"],
  });

  const { data: files } = useQuery({
    queryKey: ["/api/files"],
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

  const recentDetections = (detections || []).slice(0, 5);
  const totalDetections = detections?.length || 0;
  const highRiskCount = stats?.highRiskDetections || 0;
  const mediumRiskCount = stats?.mediumRiskDetections || 0;
  const lowRiskCount = stats?.lowRiskDetections || 0;

  const documentTypes = [
    { name: 'PDF', count: files?.filter((f: any) => f.originalName.toLowerCase().endsWith('.pdf')).length || 0, icon: 'fa-file-pdf', color: 'text-red-500' },
    { name: 'DOC', count: files?.filter((f: any) => f.originalName.toLowerCase().match(/\.(doc|docx)$/)).length || 0, icon: 'fa-file-word', color: 'text-blue-500' },
    { name: 'ZIP', count: files?.filter((f: any) => f.originalName.toLowerCase().endsWith('.zip')).length || 0, icon: 'fa-file-archive', color: 'text-yellow-500' },
    { name: 'TXT', count: files?.filter((f: any) => f.originalName.toLowerCase().endsWith('.txt')).length || 0, icon: 'fa-file-alt', color: 'text-gray-500' },
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
            recentDetections.map((detection: any) => {
              const file = files?.find((f: any) => f.id === detection.fileId);
              const riskColorClass = getRiskLevelColor(detection.riskLevel);
              const badgeColorClass = getRiskLevelBadgeColor(detection.riskLevel);
              
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
                      {getRiskLevelText(detection.riskLevel)}
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
