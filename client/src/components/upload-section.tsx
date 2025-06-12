import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { CloudUpload, File, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { getBrazilianPatterns } from "@/lib/brazilian-patterns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function UploadSection() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [selectedPatterns, setSelectedPatterns] = useState<string[]>(['cpf', 'cnpj', 'email']);
  const [customRegex, setCustomRegex] = useState("");
  const { toast } = useToast();

  const patterns = getBrazilianPatterns();

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiRequest("POST", "/api/files/upload", formData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Upload realizado com sucesso",
        description: `${data.files.length} arquivo(s) enviado(s)`,
      });
      setSelectedFiles([]);
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
    },
    onError: (error) => {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const processingMutation = useMutation({
    mutationFn: async ({ fileIds, patterns, customRegex }: { 
      fileIds: number[]; 
      patterns: string[]; 
      customRegex: string; 
    }) => {
      const response = await apiRequest("POST", "/api/processing/start", {
        fileIds,
        patterns,
        customRegex,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Processamento iniciado",
        description: "Os arquivos estão sendo processados",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/processing/jobs"] });
    },
    onError: (error) => {
      toast({
        title: "Erro no processamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setSelectedFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
      'application/zip': ['.zip'],
      'text/csv': ['.csv'],
    },
    multiple: true,
  });

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });

    uploadMutation.mutate(formData);
  };

  const handleStartProcessing = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Faça upload de arquivos primeiro",
        variant: "destructive",
      });
      return;
    }

    // First upload files, then start processing
    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      const uploadResponse = await apiRequest("POST", "/api/files/upload", formData);
      const uploadData = await uploadResponse.json();
      
      const fileIds = uploadData.files.map((file: any) => file.id);
      
      processingMutation.mutate({
        fileIds,
        patterns: selectedPatterns,
        customRegex,
      });
      
      setSelectedFiles([]);
    } catch (error) {
      toast({
        title: "Erro no upload",
        description: "Erro ao enviar arquivos",
        variant: "destructive",
      });
    }
  };

  const togglePattern = (patternId: string) => {
    setSelectedPatterns(prev => 
      prev.includes(patternId) 
        ? prev.filter(id => id !== patternId)
        : [...prev, patternId]
    );
  };

  const supportedFormats = ['PDF', 'DOC/DOCX', 'TXT', 'ZIP', 'CSV'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Upload Zone */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center">
            <CloudUpload className="text-primary mr-2" />
            Upload de Arquivos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={cn(
              "upload-zone rounded-lg p-8 text-center cursor-pointer",
              isDragActive && "dragover"
            )}
          >
            <input {...getInputProps()} />
            <CloudUpload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground mb-2">
              Arraste arquivos aqui ou clique para selecionar
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Suporte para PDF, DOC, DOCX, TXT, ZIP e mais
            </p>
            <Button type="button">Selecionar Arquivos</Button>
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <Label>Arquivos Selecionados:</Label>
              {selectedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div className="flex items-center space-x-2">
                    <File className="h-4 w-4" />
                    <span className="text-sm">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Upload Button */}
          <Button 
            onClick={handleUpload} 
            disabled={selectedFiles.length === 0 || uploadMutation.isPending}
            className="w-full"
          >
            {uploadMutation.isPending ? "Enviando..." : "Enviar Arquivos"}
          </Button>

          {/* File Format Support */}
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium text-foreground mb-2">Formatos Suportados:</p>
            <div className="flex flex-wrap gap-2">
              {supportedFormats.map((format) => (
                <span key={format} className="px-2 py-1 bg-surface text-xs text-muted-foreground rounded border">
                  {format}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detection Patterns */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="text-primary mr-2" />
            Padrões de Detecção
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Brazilian Document Patterns */}
          <div className="border border-border rounded-lg p-4">
            <h4 className="font-medium text-foreground mb-3">Documentos Brasileiros</h4>
            <div className="grid grid-cols-2 gap-3">
              {patterns.map((pattern) => (
                <div key={pattern.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={pattern.id}
                    checked={selectedPatterns.includes(pattern.id)}
                    onCheckedChange={() => togglePattern(pattern.id)}
                  />
                  <Label htmlFor={pattern.id} className="text-sm">
                    {pattern.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Regex */}
          <div className="border border-border rounded-lg p-4">
            <Label htmlFor="custom-regex" className="font-medium text-foreground mb-3 block">
              Regex Personalizado
            </Label>
            <Textarea
              id="custom-regex"
              value={customRegex}
              onChange={(e) => setCustomRegex(e.target.value)}
              placeholder="Digite seus padrões regex personalizados..."
              className="resize-none"
              rows={3}
            />
          </div>

          {/* Process Button */}
          <Button 
            onClick={handleStartProcessing}
            disabled={selectedFiles.length === 0 || processingMutation.isPending}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {processingMutation.isPending ? "Iniciando..." : "Iniciar Processamento"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
