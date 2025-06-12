import { useQuery } from "@tanstack/react-query";
import { BarChart3, RefreshCw, FileText, Archive, FileImage, File } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export default function ProcessingDashboard() {
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["/api/processing/stats"],
    refetchInterval: 2000, // Refresh every 2 seconds for real-time updates
  });

  const { data: jobs, refetch: refetchJobs } = useQuery({
    queryKey: ["/api/processing/jobs"],
    refetchInterval: 2000,
  });

  const { data: files } = useQuery({
    queryKey: ["/api/files"],
    refetchInterval: 2000,
  });

  const handleRefresh = () => {
    refetchStats();
    refetchJobs();
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.toLowerCase().split('.').pop();
    switch (ext) {
      case 'pdf':
        return <FileText className="text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="text-blue-500" />;
      case 'zip':
        return <Archive className="text-yellow-500" />;
      case 'txt':
        return <File className="text-gray-500" />;
      default:
        return <File className="text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-600">Concluído</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-600">Processando</Badge>;
      case 'queued':
        return <Badge className="bg-blue-600">Na Fila</Badge>;
      case 'failed':
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const processingFiles = jobs || [];
  const isProcessing = processingFiles.some((job: any) => job.status === 'processing');

  return (
    <Card className="card-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <BarChart3 className="text-primary mr-2" />
            Dashboard de Processamento
          </CardTitle>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
              <span className="text-sm text-muted-foreground">
                {isProcessing ? 'Processando...' : 'Aguardando'}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="mr-1 h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Processing Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-primary">
              {stats?.queuedFiles || 0}
            </div>
            <div className="text-sm text-muted-foreground">Arquivos na Fila</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {stats?.completedFiles || 0}
            </div>
            <div className="text-sm text-muted-foreground">Processados</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">
              {stats?.processingFiles || 0}
            </div>
            <div className="text-sm text-muted-foreground">Em Processamento</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-red-600">
              {stats?.errorFiles || 0}
            </div>
            <div className="text-sm text-muted-foreground">Com Erro</div>
          </div>
        </div>

        {/* File Processing List */}
        <div className="space-y-3">
          <h4 className="font-medium text-foreground">Arquivos em Processamento</h4>
          
          {processingFiles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum arquivo em processamento
            </div>
          ) : (
            processingFiles.map((job: any) => {
              const file = files?.find((f: any) => f.id === job.fileId);
              if (!file) return null;

              return (
                <div key={job.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {getFileIcon(file.originalName)}
                      <div>
                        <p className="font-medium text-foreground">{file.originalName}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(job.status)}
                      <span className="text-sm text-muted-foreground">
                        {job.progress || 0}%
                      </span>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <Progress value={job.progress || 0} className="w-full" />
                  {job.errorMessage && (
                    <p className="text-sm text-red-600 mt-2">{job.errorMessage}</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
