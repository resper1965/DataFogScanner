import { Shield, Upload, BarChart3, Search, FileText, Settings, User, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const navigationItems = [
  { id: "upload", label: "Upload de Arquivos", icon: Upload },
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "search", label: "Buscar Dados", icon: Search },
  { id: "reports", label: "Relatórios", icon: FileText },
  { id: "lgpd", label: "Conformidade LGPD", icon: Scale },
  { id: "settings", label: "Configurações", icon: Settings },
];

export default function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  return (
    <div className="w-64 bg-surface shadow-lg flex flex-col border-r border-border">
      {/* Logo Section */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Shield className="text-primary-foreground text-lg" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              ness<span style={{ color: '#00ade0' }}>.</span>
            </h1>
            <p className="text-sm text-muted-foreground">Proteção de Dados</p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <Button
                  variant={activeSection === item.id ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    activeSection === item.id 
                      ? "bg-primary text-primary-foreground" 
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                  onClick={() => onSectionChange(item.id)}
                >
                  <Icon className="mr-3 h-4 w-4" />
                  {item.label}
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>
      
      {/* User Section */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Usuário</p>
            <p className="text-xs text-muted-foreground">Administrador</p>
          </div>
        </div>
      </div>
    </div>
  );
}
