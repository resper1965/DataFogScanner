import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Save, Settings, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Case, InsertCase } from "@shared/schema";

const caseSchema = z.object({
  clientName: z.string().min(1, "Nome do cliente é obrigatório"),
  incidentDate: z.date({
    required_error: "Data do incidente é obrigatória",
  }),
  incidentType: z.string().min(1, "Tipo de incidente é obrigatório"),
  description: z.string().optional(),
  observations: z.string().optional(),
});

type CaseFormData = z.infer<typeof caseSchema>;

interface CaseConfigurationProps {
  onCaseCreated?: (caseData: Case) => void;
  currentCase?: Case | null;
}

export default function CaseConfiguration({ onCaseCreated, currentCase }: CaseConfigurationProps) {
  const [showForm, setShowForm] = useState(!currentCase);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: cases = [] } = useQuery<Case[]>({
    queryKey: ['/api/cases'],
    enabled: !showForm
  });

  const form = useForm<CaseFormData>({
    resolver: zodResolver(caseSchema),
    defaultValues: {
      clientName: currentCase?.clientName || "",
      incidentDate: currentCase?.incidentDate ? new Date(currentCase.incidentDate) : new Date(),
      incidentType: currentCase?.incidentType || "",
      description: currentCase?.description || "",
      observations: currentCase?.observations || "",
    },
  });

  const createCaseMutation = useMutation({
    mutationFn: async (data: InsertCase) => {
      const response = await fetch("/api/cases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          incidentDate: data.incidentDate.toISOString(),
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to create case");
      }
      return response.json();
    },
    onSuccess: (newCase: Case) => {
      toast({
        title: "Caso criado com sucesso",
        description: `Caso "${newCase.clientName}" foi configurado`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/cases'] });
      onCaseCreated?.(newCase);
      setShowForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar caso",
        description: error.message || "Erro interno do servidor",
        variant: "destructive",
      });
    },
  });

  const updateCaseMutation = useMutation({
    mutationFn: async (data: InsertCase) => {
      if (!currentCase) throw new Error("Nenhum caso selecionado");
      return apiRequest(`/api/cases/${currentCase.id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...data,
          incidentDate: data.incidentDate.toISOString(),
        }),
      });
    },
    onSuccess: (updatedCase: Case) => {
      toast({
        title: "Caso atualizado com sucesso",
        description: `Caso "${updatedCase.clientName}" foi atualizado`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/cases'] });
      onCaseCreated?.(updatedCase);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar caso",
        description: error.message || "Erro interno do servidor",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CaseFormData) => {
    const caseData: InsertCase = {
      clientName: data.clientName,
      incidentDate: data.incidentDate,
      incidentType: data.incidentType,
      description: data.description || null,
      observations: data.observations || null,
    };

    if (currentCase) {
      updateCaseMutation.mutate(caseData);
    } else {
      createCaseMutation.mutate(caseData);
    }
  };

  const incidentTypes = [
    "Vazamento de Dados",
    "Ataque Cibernético",
    "Fraude",
    "Investigação Forense",
    "Auditoria de Compliance",
    "Análise de Segurança",
    "Outros"
  ];

  if (!showForm && currentCase) {
    return (
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <div>
              <CardTitle className="text-lg">Caso Configurado</CardTitle>
              <CardDescription>Informações do caso atual</CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">Cliente</Label>
              <p className="mt-1 font-medium">{currentCase.clientName}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Data do Incidente</Label>
              <p className="mt-1 font-medium">
                {format(new Date(currentCase.incidentDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Tipo de Incidente</Label>
              <p className="mt-1 font-medium">{currentCase.incidentType}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Criado em</Label>
              <p className="mt-1 font-medium">
                {format(new Date(currentCase.createdAt!), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>
          {currentCase.description && (
            <div>
              <Label className="text-sm font-medium text-gray-600">Descrição</Label>
              <p className="mt-1 text-sm text-gray-700">{currentCase.description}</p>
            </div>
          )}
          {currentCase.observations && (
            <div>
              <Label className="text-sm font-medium text-gray-600">Observações</Label>
              <p className="mt-1 text-sm text-gray-700">{currentCase.observations}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Settings className="h-5 w-5 text-blue-600" />
          <div>
            <CardTitle className="text-lg">
              {currentCase ? "Editar Caso" : "Configurar Novo Caso"}
            </CardTitle>
            <CardDescription>
              Configure as informações do caso antes de iniciar o processamento
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Nome do Cliente *</Label>
              <Input
                id="clientName"
                placeholder="Ex: Empresa ABC Ltda"
                {...form.register("clientName")}
              />
              {form.formState.errors.clientName && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.clientName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Data do Incidente *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.watch("incidentDate") ? (
                      format(form.watch("incidentDate"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                    ) : (
                      <span>Selecione uma data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={form.watch("incidentDate")}
                    onSelect={(date) => {
                      if (date) {
                        form.setValue("incidentDate", date);
                      }
                    }}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
              {form.formState.errors.incidentDate && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.incidentDate.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="incidentType">Tipo de Incidente *</Label>
            <Select
              value={form.watch("incidentType")}
              onValueChange={(value) => form.setValue("incidentType", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de incidente" />
              </SelectTrigger>
              <SelectContent>
                {incidentTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.incidentType && (
              <p className="text-sm text-red-600">
                {form.formState.errors.incidentType.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição do Caso</Label>
            <Textarea
              id="description"
              placeholder="Descreva brevemente o caso ou incidente..."
              rows={3}
              {...form.register("description")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="observations">Observações</Label>
            <Textarea
              id="observations"
              placeholder="Adicione observações importantes sobre o caso..."
              rows={3}
              {...form.register("observations")}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            {!currentCase && cases.length > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
              >
                Cancelar
              </Button>
            )}
            <Button
              type="submit"
              disabled={createCaseMutation.isPending || updateCaseMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {createCaseMutation.isPending || updateCaseMutation.isPending
                ? "Salvando..."
                : currentCase
                ? "Atualizar Caso"
                : "Criar Caso"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}