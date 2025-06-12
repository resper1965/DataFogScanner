import { useState } from "react";
import Sidebar from "@/components/sidebar";
import UploadSection from "@/components/upload-section";
import ProcessingDashboard from "@/components/processing-dashboard";
import ResultsSection from "@/components/results-section";
import CaseConfiguration from "@/components/case-configuration";
import ReportsSection from "@/components/reports-section";
import type { Case } from "@shared/schema";
import { Bell, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState("upload");
  const [currentCase, setCurrentCase] = useState<Case | null>(null);

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
                {activeSection === "settings" && "Configurações"}
              </h2>
              <p className="text-muted-foreground mt-1">
                {activeSection === "upload" && "Faça upload de arquivos para detectar dados sensíveis"}
                {activeSection === "dashboard" && "Acompanhe o processamento em tempo real"}
                {activeSection === "search" && "Busque e analise dados sensíveis detectados"}
                {activeSection === "reports" && "Visualize relatórios de detecção de dados"}
                {activeSection === "settings" && "Configure padrões e preferências"}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Notification Bell */}
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-xs text-destructive-foreground flex items-center justify-center">
                  3
                </span>
              </Button>
              
              {/* Status Indicator */}
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-muted-foreground">Sistema Online</span>
              </div>
            </div>
          </div>
        </header>
        
        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {activeSection === "upload" && (
              <div className="space-y-6">
                {/* Step 1: Case Configuration */}
                <div className="bg-surface rounded-lg card-shadow border-l-4 border-l-blue-500">
                  <div className="p-6">
                    <div className="flex items-center mb-4">
                      <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                        1
                      </div>
                      <h3 className="text-lg font-semibold">Configurar Caso</h3>
                    </div>
                    <CaseConfiguration 
                      currentCase={currentCase}
                      onCaseCreated={setCurrentCase}
                    />
                  </div>
                </div>

                {/* Step 2: Upload Files - Only show if case is configured */}
                {currentCase && (
                  <div className="bg-surface rounded-lg card-shadow border-l-4 border-l-green-500">
                    <div className="p-6">
                      <div className="flex items-center mb-4">
                        <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                          2
                        </div>
                        <h3 className="text-lg font-semibold">Upload de Arquivos</h3>
                      </div>
                      <UploadSection />
                    </div>
                  </div>
                )}

                {/* Step 3: Processing Dashboard - Only show if files uploaded */}
                {currentCase && (
                  <div className="bg-surface rounded-lg card-shadow border-l-4 border-l-yellow-500">
                    <div className="p-6">
                      <div className="flex items-center mb-4">
                        <div className="w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                          3
                        </div>
                        <h3 className="text-lg font-semibold">Processamento</h3>
                      </div>
                      <ProcessingDashboard />
                    </div>
                  </div>
                )}

                {/* Step 4: Results - Only show if processing started */}
                {currentCase && (
                  <div className="bg-surface rounded-lg card-shadow border-l-4 border-l-purple-500">
                    <div className="p-6">
                      <div className="flex items-center mb-4">
                        <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-semibold mr-3">
                          4
                        </div>
                        <h3 className="text-lg font-semibold">Resultados</h3>
                      </div>
                      <ResultsSection />
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeSection === "dashboard" && <ProcessingDashboard />}
            {activeSection === "search" && <ResultsSection />}
            {activeSection === "reports" && (
              <div className="bg-surface rounded-lg card-shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Relatórios</h3>
                <p className="text-muted-foreground">
                  Seção de relatórios em desenvolvimento. Aqui você poderá visualizar 
                  relatórios detalhados sobre os dados sensíveis detectados.
                </p>
              </div>
            )}
            {activeSection === "settings" && (
              <div className="bg-surface rounded-lg card-shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Configurações</h3>
                <p className="text-muted-foreground">
                  Seção de configurações em desenvolvimento. Aqui você poderá 
                  configurar padrões de detecção e preferências do sistema.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
