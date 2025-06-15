import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Save, RotateCcw, Shield, Zap, Database, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { notifications } from "@/components/ui/notification-system";
import { getBrazilianPatterns, type BrazilianPattern } from "@/lib/brazilian-patterns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Detection } from "@shared/schema";

interface SystemSettings {
  enableSemanticValidation: boolean;
  maxFileSize: number;
  maxFilesPerUpload: number;
  retentionPeriodDays: number;
  enableSFTP: boolean;
  sftpPath: string;
  customPatterns: Array<{
    id: string;
    name: string;
    regex: string;
    riskLevel: 'high' | 'medium' | 'low';
    enabled: boolean;
  }>;
}

interface ReportsStats {
  totalDetections: number;
  totalFiles: number;
  totalCases: number;
  byRiskLevel: Record<string, number>;
  byType: Record<string, number>;
  byDate: Record<string, number>;
  recentDetections: Detection[];
}

export default function SettingsSection() {
  const { toast } = useToast();
  const [patterns, setPatterns] = useState(getBrazilianPatterns());
  const [settings, setSettings] = useState<SystemSettings>({
    enableSemanticValidation: false,
    maxFileSize: 50,
    maxFilesPerUpload: 10,
    retentionPeriodDays: 30,
    enableSFTP: false,
    sftpPath: '/home/datafog/uploads/sftp/incoming',
    customPatterns: []
  });

  const [newPattern, setNewPattern] = useState({
    name: '',
    regex: '',
    riskLevel: 'medium' as 'high' | 'medium' | 'low'
  });

  // System statistics
  const { data: statsData } = useQuery<ReportsStats>({
    queryKey: ['/api/reports/stats']
  });

  const togglePattern = (patternId: string) => {
    setPatterns(prev => prev.map(p => 
      p.id === patternId ? { ...p, enabled: !p.enabled } : p
    ));
  };

  const addCustomPattern = () => {
    if (!newPattern.name || !newPattern.regex) {
      notifications.error(
        "Campos Obrigatórios",
        "Nome e regex são obrigatórios para criar um padrão"
      );
      return;
    }

    try {
      new RegExp(newPattern.regex);
    } catch {
      notifications.error(
        "Regex Inválida",
        "A expressão regular fornecida não é válida"
      );
      return;
    }

    const pattern = {
      id: `custom_${Date.now()}`,
      name: newPattern.name,
      regex: newPattern.regex,
      riskLevel: newPattern.riskLevel,
      enabled: true
    };

    setSettings(prev => ({
      ...prev,
      customPatterns: [...prev.customPatterns, pattern]
    }));

    setNewPattern({ name: '', regex: '', riskLevel: 'medium' });
    
    notifications.success(
      "Padrão Adicionado",
      `Padrão personalizado "${pattern.name}" foi criado com sucesso`
    );
  };

  const removeCustomPattern = (patternId: string) => {
    setSettings(prev => ({
      ...prev,
      customPatterns: prev.customPatterns.filter(p => p.id !== patternId)
    }));
    
    toast({
      title: "Sucesso",
      description: "Padrão removido"
    });
  };

  const saveSettings = async () => {
    try {
      localStorage.setItem('pii-detector-settings', JSON.stringify(settings));
      
      notifications.success(
        "Configurações Salvas",
        "Todas as configurações foram salvas com sucesso"
      );
      
      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso"
      });
    } catch (error) {
      notifications.error(
        "Erro ao Salvar",
        "Não foi possível salvar as configurações"
      );
    }
  };

  const clearAllData = async () => {
    if (!confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const response = await fetch('/api/files', { 
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      await queryClient.invalidateQueries();
      
      toast({
        title: "Sucesso",
        description: "Todos os dados foram removidos"
      });
    } catch (error) {
      console.error('Erro ao limpar dados:', error);
      toast({
        title: "Erro",
        description: `Erro ao limpar dados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        variant: "destructive"
      });
    }
  };

  const exportData = async () => {
    try {
      const [detectionsResponse, filesResponse] = await Promise.all([
        fetch('/api/detections'),
        fetch('/api/files')
      ]);
      
      const detections = await detectionsResponse.json();
      const files = await filesResponse.json();
      
      const data = {
        detections,
        files,
        exportDate: new Date().toISOString(),
        totalDetections: statsData?.totalDetections || 0
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pii-detector-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: "Sucesso",
        description: "Dados exportados com sucesso"
      });
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      toast({
        title: "Erro",
        description: `Erro ao exportar dados: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Configurações</h2>
          <p className="text-muted-foreground">
            Configure padrões de detecção e preferências do sistema
          </p>
        </div>
        <Button onClick={saveSettings} className="bg-brand text-white hover:bg-brand/90">
          <Save className="w-4 h-4 mr-2" />
          Salvar Configurações
        </Button>
      </div>

      <Tabs defaultValue="patterns" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="patterns">Padrões</TabsTrigger>
          <TabsTrigger value="processing">Processamento</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
          <TabsTrigger value="data">Dados</TabsTrigger>
        </TabsList>

        <TabsContent value="patterns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Padrões Brasileiros</CardTitle>
              <CardDescription>
                Configure quais padrões de dados brasileiros devem ser detectados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {patterns.map((pattern) => (
                  <div key={pattern.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={pattern.enabled}
                          onCheckedChange={() => togglePattern(pattern.id)}
                        />
                        <div>
                          <Label className="text-sm font-medium">{pattern.name}</Label>
                          <p className="text-xs text-muted-foreground">{pattern.description}</p>
                        </div>
                      </div>
                    </div>
                    <Badge variant={pattern.riskLevel === 'high' ? 'destructive' : pattern.riskLevel === 'medium' ? 'default' : 'secondary'}>
                      {pattern.riskLevel === 'high' ? 'Alto' : pattern.riskLevel === 'medium' ? 'Médio' : 'Baixo'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Padrões Personalizados</CardTitle>
              <CardDescription>
                Adicione seus próprios padrões de detecção usando regex
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Nome do Padrão</Label>
                    <Input
                      value={newPattern.name}
                      onChange={(e) => setNewPattern(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Ex: Cartão de Crédito"
                    />
                  </div>
                  <div>
                    <Label>Expressão Regular</Label>
                    <Input
                      value={newPattern.regex}
                      onChange={(e) => setNewPattern(prev => ({ ...prev, regex: e.target.value }))}
                      placeholder="Ex: \d{4}\s?\d{4}\s?\d{4}\s?\d{4}"
                      className="font-mono text-sm"
                    />
                  </div>
                  <div>
                    <Label>Nível de Risco</Label>
                    <select
                      value={newPattern.riskLevel}
                      onChange={(e) => setNewPattern(prev => ({ ...prev, riskLevel: e.target.value as any }))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="low">Baixo</option>
                      <option value="medium">Médio</option>
                      <option value="high">Alto</option>
                    </select>
                  </div>
                </div>
                <Button onClick={addCustomPattern} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Padrão
                </Button>
              </div>

              {settings.customPatterns.length > 0 && (
                <div className="space-y-2">
                  <Label>Padrões Ativos</Label>
                  {settings.customPatterns.map((pattern) => (
                    <div key={pattern.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <span className="font-medium">{pattern.name}</span>
                        <code className="ml-2 text-xs bg-muted px-2 py-1 rounded">{pattern.regex}</code>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={pattern.riskLevel === 'high' ? 'destructive' : pattern.riskLevel === 'medium' ? 'default' : 'secondary'}>
                          {pattern.riskLevel === 'high' ? 'Alto' : pattern.riskLevel === 'medium' ? 'Médio' : 'Baixo'}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeCustomPattern(pattern.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="processing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Configurações de Processamento
              </CardTitle>
              <CardDescription>
                Configure como os arquivos são processados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Validação Semântica com IA</Label>
                  <p className="text-sm text-muted-foreground">
                    Use OpenAI para validar detecções regex (mais lento, mas mais preciso)
                  </p>
                </div>
                <Switch
                  checked={settings.enableSemanticValidation}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableSemanticValidation: checked }))}
                />
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Tamanho Máximo do Arquivo (MB)</Label>
                  <Input
                    type="number"
                    value={settings.maxFileSize}
                    onChange={(e) => setSettings(prev => ({ ...prev, maxFileSize: parseInt(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label>Máximo de Arquivos por Upload</Label>
                  <Input
                    type="number"
                    value={settings.maxFilesPerUpload}
                    onChange={(e) => setSettings(prev => ({ ...prev, maxFilesPerUpload: parseInt(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Monitoramento SFTP</Label>
                  <p className="text-sm text-muted-foreground">
                    Monitore automaticamente uma pasta SFTP para novos arquivos
                  </p>
                </div>
                <Switch
                  checked={settings.enableSFTP}
                  onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enableSFTP: checked }))}
                />
              </div>

              {settings.enableSFTP && (
                <div>
                  <Label>Caminho do Diretório SFTP</Label>
                  <Input
                    value={settings.sftpPath}
                    onChange={(e) => setSettings(prev => ({ ...prev, sftpPath: e.target.value }))}
                    placeholder="/home/datafog/uploads/sftp/incoming"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Configurações de Segurança
              </CardTitle>
              <CardDescription>
                Configure escaneamento de segurança e verificações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Escaneamento de Malware</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  ClamAV não está instalado. Para habilitar escaneamento de malware, instale o ClamAV no servidor.
                </p>
                <code className="text-xs bg-background p-2 rounded block">
                  sudo apt update && sudo apt install clamav clamav-daemon
                </code>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Verificações Ativas</h4>
                <ul className="text-sm space-y-1">
                  <li>✓ Verificação de extensões perigosas</li>
                  <li>✓ Detecção de zip bombs</li>
                  <li>✓ Validação de tamanho de arquivo</li>
                  <li>✓ Verificação de hash suspeito</li>
                  <li>⚠ Escaneamento de malware (ClamAV não disponível)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Gerenciamento de Dados
              </CardTitle>
              <CardDescription>
                Configure retenção de dados e faça backup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Período de Retenção (dias)</Label>
                <Input
                  type="number"
                  value={settings.retentionPeriodDays}
                  onChange={(e) => setSettings(prev => ({ ...prev, retentionPeriodDays: parseInt(e.target.value) }))}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Arquivos e detecções serão automaticamente removidos após este período
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Button onClick={exportData} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Dados
                </Button>
                <Button onClick={clearAllData} variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpar Todos os Dados
                </Button>
              </div>

              {!!statsData && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Estatísticas do Sistema</h4>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total de Detecções:</span>
                      <span className="font-medium">{statsData?.totalDetections || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total de Arquivos:</span>
                      <span className="font-medium">{statsData?.totalFiles || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total de Casos:</span>
                      <span className="font-medium">{statsData?.totalCases || 0}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}