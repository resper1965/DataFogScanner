import { useState, useEffect } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { Button } from "./button";

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  actions?: NotificationAction[];
  category?: 'detection' | 'security' | 'system' | 'lgpd';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

export interface NotificationAction {
  label: string;
  variant?: 'default' | 'destructive' | 'outline';
  onClick: () => void;
}

interface NotificationItemProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

function NotificationItem({ notification, onDismiss }: NotificationItemProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    
    if (!notification.persistent && notification.duration !== 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onDismiss(notification.id), 300);
      }, notification.duration || 5000);
      
      return () => clearTimeout(timer);
    }
  }, [notification, onDismiss]);

  const getIcon = () => {
    switch (notification.type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info': return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (notification.type) {
      case 'success': return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
      case 'error': return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
      case 'warning': return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800';
      case 'info': return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
    }
  };

  return (
    <div 
      className={`
        ${getBackgroundColor()} 
        border rounded-lg p-4 shadow-lg transition-all duration-300 ease-in-out transform
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        max-w-sm w-full
      `}
    >
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {notification.title}
            </h4>
            {notification.priority && (
              <span className={`
                px-2 py-1 text-xs rounded-full font-medium
                ${notification.priority === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : ''}
                ${notification.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' : ''}
                ${notification.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : ''}
                ${notification.priority === 'low' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' : ''}
              `}>
                {notification.priority}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            {notification.message}
          </p>
          {notification.actions && notification.actions.length > 0 && (
            <div className="flex gap-2 mt-3">
              {notification.actions.map((action, index) => (
                <Button
                  key={index}
                  size="sm"
                  variant={action.variant || 'outline'}
                  onClick={action.onClick}
                  className="text-xs"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="p-1 h-auto"
          onClick={() => onDismiss(notification.id)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

let notificationId = 0;

export class NotificationManager {
  private static instance: NotificationManager;
  private listeners: Array<(notifications: Notification[]) => void> = [];
  private notifications: Notification[] = [];

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  subscribe(listener: (notifications: Notification[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit() {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  add(notification: Omit<Notification, 'id'>): string {
    const id = `notification-${++notificationId}`;
    const newNotification: Notification = { ...notification, id };
    
    this.notifications.push(newNotification);
    this.emit();
    
    return id;
  }

  remove(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.emit();
  }

  clear() {
    this.notifications = [];
    this.emit();
  }

  success(title: string, message: string, options?: Partial<Notification>) {
    return this.add({ type: 'success', title, message, ...options });
  }

  error(title: string, message: string, options?: Partial<Notification>) {
    return this.add({ type: 'error', title, message, ...options });
  }

  warning(title: string, message: string, options?: Partial<Notification>) {
    return this.add({ type: 'warning', title, message, ...options });
  }

  info(title: string, message: string, options?: Partial<Notification>) {
    return this.add({ type: 'info', title, message, ...options });
  }

  // Notificações específicas para detecção PII/LGPD
  piiDetected(count: number, riskLevel: 'high' | 'medium' | 'low', fileName: string, onViewReport?: () => void) {
    const actions = onViewReport ? [
      { label: 'Ver Relatório', variant: 'default' as const, onClick: onViewReport }
    ] : undefined;

    return this.add({
      type: riskLevel === 'high' ? 'error' : riskLevel === 'medium' ? 'warning' : 'info',
      title: `${count} dado${count > 1 ? 's' : ''} PII detectado${count > 1 ? 's' : ''}`,
      message: `Arquivo: ${fileName} - Nível de risco: ${riskLevel}`,
      category: 'detection',
      priority: riskLevel === 'high' ? 'critical' : riskLevel === 'medium' ? 'high' : 'medium',
      actions,
      persistent: riskLevel === 'high',
      duration: riskLevel === 'high' ? 0 : 8000
    });
  }

  lgpdCompliance(type: 'data_subject_request' | 'retention_warning' | 'consent_required', details: string, onAction?: () => void) {
    const titles = {
      data_subject_request: 'Solicitação do Titular',
      retention_warning: 'Aviso de Retenção',
      consent_required: 'Consentimento Necessário'
    };

    const actions = onAction ? [
      { label: 'Ação Necessária', variant: 'default' as const, onClick: onAction }
    ] : undefined;

    return this.add({
      type: 'warning',
      title: titles[type],
      message: details,
      category: 'lgpd',
      priority: 'high',
      actions,
      persistent: true,
      duration: 0
    });
  }

  securityAlert(threat: string, severity: 'critical' | 'high' | 'medium', onQuarantine?: () => void) {
    const actions = onQuarantine ? [
      { label: 'Quarentena', variant: 'destructive' as const, onClick: onQuarantine }
    ] : undefined;

    return this.add({
      type: 'error',
      title: 'Alerta de Segurança',
      message: `Ameaça detectada: ${threat}`,
      category: 'security',
      priority: severity,
      actions,
      persistent: true,
      duration: 0
    });
  }
}

export function NotificationContainer() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const manager = NotificationManager.getInstance();
    const unsubscribe = manager.subscribe(setNotifications);
    return unsubscribe;
  }, []);

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={(id) => NotificationManager.getInstance().remove(id)}
        />
      ))}
    </div>
  );
}

export const notifications = NotificationManager.getInstance();