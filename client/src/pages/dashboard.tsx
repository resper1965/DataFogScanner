import { useState, useMemo } from "react";
import Sidebar from "@/components/sidebar";
import UploadSection from "@/components/upload-section";
import ProcessingDashboard from "@/components/processing-dashboard";
import ResultsSection from "@/components/results-section";
import CaseConfiguration from "@/components/case-configuration";
import ReportsSection from "@/components/reports-section";
import LGPDReports from "@/components/lgpd-reports";
import SettingsSection from "@/components/settings-section";
import type { Case } from "@shared/schema";
import { Bell, Wifi, AlertTriangle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ThemeToggle } from "@/components/theme-toggle";
import { notifications } from "@/components/ui/notification-system";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState("upload");
  const [currentCase, setCurrentCase] = useState<Case | null>(null);

  // Buscar dados para notificações LGPD
  const { data: detections = [] } = useQuery({
    queryKey: ["/api/detections"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Calcular notificações baseadas em dados reais
  const lgpdNotifications = useMemo(() => {
    const detectionsArray = detections as any[];
    const highRiskDetections = detectionsArray.filter(d => d.riskLevel === 'high').length;
    const totalDetections = detectionsArray.length;
    
    const notifications = [];
    
    if (highRiskDetections > 0) {
      notifications.push({
        id: 'high-risk',
        type: 'error' as const,
        title: `${highRiskDetections} dados de alto risco`,
        description: 'Requerem ação imediata para conformidade LGPD',
        action: () => setActiveSection('lgpd')
      });
    }
    
    if (totalDetections > 50) {
      notifications.push({
        id: 'volume-alert',
        type: 'warning' as const,
        title: 'Alto volume de dados detectados',
        description: 'Revisar política de retenção',
        action: () => setActiveSection('lgpd')
      });
    }

    return notifications;
  }, [detections]);

  // Demonstrar notificações funcionais
  const handleTestNotifications = () => {
    // Notificação de detecção PII
    notifications.piiDetected(
      5, 
      'high', 
      'documento-confidencial.pdf',
      () => setActiveSection('search')
    );

    // Notificação LGPD
    setTimeout(() => {
      notifications.lgpdCompliance(
        'retention_warning',
        'Dados pessoais próximos ao vencimento de retenção',
        () => setActiveSection('lgpd')
      );
    }, 2000);

    // Alerta de segurança
    setTimeout(() => {
      notifications.securityAlert(
        'Arquivo suspeito detectado',
        'high',
        () => setActiveSection('settings')
      );
    }, 4000);
  };

  return (
    <div className="flex h-screen bg-background-app">
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-surface shadow-sm border-b border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {activeSection === "upload" && "Upload de Arquivos"}
                {activeSection === "dashboard" && "Dashboard"}
                {activeSection === "search" && "Buscar Dados"}
                {activeSection === "reports" && "Relatórios"}
                {activeSection === "lgpd" && "Conformidade LGPD"}
                {activeSection === "settings" && "Configurações"}
              </h2>
              <p className="text-muted-foreground mt-1">
                {activeSection === "upload" && "Faça upload de arquivos para detectar dados sensíveis"}
                {activeSection === "dashboard" && "Acompanhe o processamento em tempo real"}
                {activeSection === "search" && "Busque e analise dados sensíveis detectados"}
                {activeSection === "reports" && "Visualize relatórios de detecção de dados"}
                {activeSection === "lgpd" && "Relatórios e gestão de conformidade LGPD"}
                {activeSection === "settings" && "Configure padrões e preferências"}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Notification Bell with Functional Dropdown */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {lgpdNotifications.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-xs text-destructive-foreground flex items-center justify-center">
                        {lgpdNotifications.length}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="p-4 border-b">
                    <h4 className="font-semibold text-sm">Notificações LGPD</h4>
                    <p className="text-xs text-muted-foreground">Alertas de conformidade</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {lgpdNotifications.length > 0 ? (
                      lgpdNotifications.map((notif) => (
                        <div key={notif.id} className="p-4 border-b hover:bg-muted/50 cursor-pointer" onClick={notif.action}>
                          <div className="flex items-start space-x-3">
                            {notif.type === 'error' ? (
                              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                            ) : (
                              <Shield className="h-4 w-4 text-yellow-500 mt-0.5" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{notif.title}</p>
                              <p className="text-xs text-muted-foreground">{notif.description}</p>
                              <Badge variant={notif.type === 'error' ? 'destructive' : 'secondary'} className="text-xs mt-2">
                                {notif.type === 'error' ? 'Crítico' : 'Atenção'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Nenhuma notificação pendente
                      </div>
                    )}
                  </div>
                  <div className="p-3 border-t">
                    <Button size="sm" variant="outline" onClick={handleTestNotifications} className="w-full">
                      Testar Notificações
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              
              {/* Theme Toggle */}
              <ThemeToggle />
              
              {/* Status Indicator */}
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-muted-foreground">Sistema Online</span>
              </div>
            </div>
          </div>
        </header>
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-auto container-generous">
          <div className="max-w-7xl mx-auto layout-breathe">
            {activeSection === "upload" && (
              <div className="grid-generous">
                {/* Step 1: Case Configuration */}
                <div className="card-modern border-l-4 border-l-primary">
                  <div className="flex items-center mb-8">
                    <div className="w-12 h-12 bg-primary text-primary-foreground flex items-center justify-center text-lg font-semibold mr-6" style={{borderRadius: '1rem'}}>
                      1
                    </div>
                    <h3 className="text-2xl font-semibold text-clean">Configurar Caso</h3>
                  </div>
                  <CaseConfiguration 
                    currentCase={currentCase}
                    onCaseCreated={setCurrentCase}
                  />
                </div>

                {/* Step 2: Upload Files - Only show if case is configured */}
                {currentCase && (
                  <div className="card-modern border-l-4 border-l-green-500">
                    <div className="flex items-center mb-8">
                      <div className="w-12 h-12 bg-green-500 text-white flex items-center justify-center text-lg font-semibold mr-6" style={{borderRadius: '1rem'}}>
                        2
                      </div>
                      <h3 className="text-2xl font-semibold text-clean">Upload de Arquivos</h3>
                    </div>
                    <UploadSection />
                  </div>
                )}

                {/* Step 3: Processing Dashboard - Only show if files uploaded */}
                {currentCase && (
                  <div className="card-modern border-l-4 border-l-yellow-500">
                    <div className="flex items-center mb-8">
                      <div className="w-12 h-12 bg-yellow-500 text-white flex items-center justify-center text-lg font-semibold mr-6" style={{borderRadius: '1rem'}}>
                        3
                      </div>
                      <h3 className="text-2xl font-semibold text-clean">Processamento</h3>
                    </div>
                    <ProcessingDashboard />
                  </div>
                )}

                {/* Step 4: Results - Only show if processing started */}
                {currentCase && (
                  <div className="card-modern border-l-4 border-l-purple-500">
                    <div className="flex items-center mb-8">
                      <div className="w-12 h-12 bg-purple-500 text-white flex items-center justify-center text-lg font-semibold mr-6" style={{borderRadius: '1rem'}}>
                        4
                      </div>
                      <h3 className="text-2xl font-semibold text-clean">Resultados</h3>
                    </div>
                    <ResultsSection />
                  </div>
                )}
              </div>
            )}
            {activeSection === "dashboard" && <ProcessingDashboard />}
            {activeSection === "search" && <ResultsSection />}
            {activeSection === "reports" && <ReportsSection />}
            {activeSection === "lgpd" && <LGPDReports />}
            {activeSection === "settings" && <SettingsSection />}
          </div>
        </main>
      </div>
    </div>
  );
}
