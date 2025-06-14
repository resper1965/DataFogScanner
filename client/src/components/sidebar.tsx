import { Shield, Upload, BarChart3, Search, FileText, Settings, User, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
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
    <div className="w-80 surface shadow-soft flex flex-col border-r border-border">
      {/* Logo Section */}
      <div className="header-generous border-b border-border">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 bg-primary flex items-center justify-center" style={{borderRadius: '1rem'}}>
            <Shield className="text-primary-foreground text-xl" />
          </div>
          <div>
            <BrandLogo size="lg" className="mb-2" />
            <p className="text-base text-muted-foreground">Proteção de Dados</p>
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
