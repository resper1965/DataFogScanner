import { Shield, AlertTriangle, Ban, CheckCircle, FileWarning } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SecurityThreat {
  type: 'virus' | 'malware' | 'suspicious_extension' | 'zip_bomb' | 'password_protected' | 'executable' | 'script';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  details?: string;
}

interface SecurityStatusProps {
  fileName: string;
  riskLevel: 'safe' | 'suspicious' | 'dangerous';
  isClean: boolean;
  threats: SecurityThreat[];
  onRescan?: () => void;
}

export default function SecurityStatus({ 
  fileName, 
  riskLevel, 
  isClean, 
  threats, 
  onRescan 
}: SecurityStatusProps) {
  const getRiskIcon = () => {
    switch (riskLevel) {
      case 'safe':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'suspicious':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'dangerous':
        return <Ban className="h-5 w-5 text-red-600" />;
      default:
        return <Shield className="h-5 w-5 text-gray-600" />;
    }
  };

  const getRiskColor = () => {
    switch (riskLevel) {
      case 'safe':
        return 'bg-green-50 border-green-200';
      case 'suspicious':
        return 'bg-yellow-50 border-yellow-200';
      case 'dangerous':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getRiskBadge = () => {
    switch (riskLevel) {
      case 'safe':
        return <Badge variant="outline" className="text-green-700 bg-green-50">Seguro</Badge>;
      case 'suspicious':
        return <Badge variant="outline" className="text-yellow-700 bg-yellow-50">Suspeito</Badge>;
      case 'dangerous':
        return <Badge variant="destructive">Perigoso</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const getThreatIcon = (type: string) => {
    switch (type) {
      case 'virus':
      case 'malware':
        return <Ban className="h-4 w-4 text-red-500" />;
      case 'executable':
      case 'script':
        return <FileWarning className="h-4 w-4 text-orange-500" />;
      case 'zip_bomb':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'password_protected':
        return <Shield className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive" className="text-xs">Crítico</Badge>;
      case 'high':
        return <Badge variant="destructive" className="text-xs bg-orange-100 text-orange-800 border-orange-200">Alto</Badge>;
      case 'medium':
        return <Badge variant="outline" className="text-xs text-yellow-700 bg-yellow-50">Médio</Badge>;
      case 'low':
        return <Badge variant="outline" className="text-xs">Baixo</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">-</Badge>;
    }
  };

  return (
    <Card className={cn("w-full", getRiskColor())}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            {getRiskIcon()}
            <span className="font-medium">Escaneamento de Segurança</span>
          </div>
          {getRiskBadge()}
        </CardTitle>
        <p className="text-xs text-muted-foreground truncate">{fileName}</p>
      </CardHeader>

      <CardContent className="pt-0">
        {isClean && threats.length === 0 ? (
          <div className="flex items-center space-x-2 text-green-700">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">Nenhuma ameaça detectada</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-900">
              {threats.length} ameaça{threats.length !== 1 ? 's' : ''} detectada{threats.length !== 1 ? 's' : ''}:
            </div>
            
            <div className="space-y-2">
              {threats.map((threat, index) => (
                <div key={index} className="flex items-start space-x-3 p-2 bg-white rounded border">
                  {getThreatIcon(threat.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {threat.type.replace('_', ' ')}
                      </p>
                      {getSeverityBadge(threat.severity)}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{threat.description}</p>
                    {threat.details && (
                      <p className="text-xs text-gray-500 mt-1 font-mono">{threat.details}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {riskLevel === 'dangerous' && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                <div className="flex items-center space-x-2">
                  <Ban className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-800">
                    Arquivo bloqueado por segurança
                  </span>
                </div>
                <p className="text-xs text-red-600 mt-1">
                  Este arquivo foi identificado como perigoso e não será processado.
                </p>
              </div>
            )}

            {riskLevel === 'suspicious' && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">
                    Arquivo em quarentena
                  </span>
                </div>
                <p className="text-xs text-yellow-600 mt-1">
                  Verifique manualmente antes de processar dados sensíveis.
                </p>
              </div>
            )}
          </div>
        )}

        {onRescan && (
          <button
            onClick={onRescan}
            className="mt-3 text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
          >
            <Shield className="h-3 w-3" />
            <span>Reescanear arquivo</span>
          </button>
        )}
      </CardContent>
    </Card>
  );
}