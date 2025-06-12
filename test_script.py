#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re
import json
import sys
import os
from pathlib import Path

def extract_text_from_pdf(file_path):
    """Extrai texto de arquivo PDF"""
    try:
        import PyPDF2
        with open(file_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            for page in reader.pages:
                text += page.extract_text()
        return text
    except Exception as e:
        return ""

def scan_with_regex(content, enabled_patterns):
    """Escaneamento com regex brasileiro"""
    detections = []
    
    patterns = {
        'cpf': r'\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b',
        'cnpj': r'\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b',
        'rg': r'\b\d{1,2}\.?\d{3}\.?\d{3}-?[\dX]\b',
        'cep': r'\b\d{5}-?\d{3}\b',
        'email': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        'telefone': r'\(?(?:\+55\s?)?\(?(\d{2})\)?\s?(\d{4,5})-?(\d{4})\b',
        'pis': r'\b\d{3}\.?\d{5}\.?\d{2}-?\d{1}\b',
        'cartao': r'\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b'
    }
    
    for pattern_name, regex in patterns.items():
        if pattern_name in enabled_patterns:
            matches = re.finditer(regex, content, re.IGNORECASE)
            for match in matches:
                start = max(0, match.start() - 50)
                end = min(len(content), match.end() + 50)
                context = content[start:end].strip()
                
                detections.append({
                    'type': pattern_name.upper(),
                    'value': match.group(),
                    'context': context,
                    'position': match.start(),
                    'riskLevel': 'high' if pattern_name in ['cpf', 'cnpj', 'cartao'] else 'medium',
                    'confidence': 0.9,
                    'source': 'regex'
                })
    
    return detections

def main():
    try:
        if len(sys.argv) < 2:
            print("Erro: Caminho do arquivo não fornecido")
            sys.exit(1)
            
        file_path = sys.argv[1]
        
        if not os.path.exists(file_path):
            print(f"Erro: Arquivo não encontrado: {file_path}")
            sys.exit(1)
        
        # Ler conteúdo do arquivo
        try:
            if file_path.lower().endswith('.pdf'):
                content = extract_text_from_pdf(file_path)
            else:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
        except UnicodeDecodeError:
            try:
                with open(file_path, 'r', encoding='latin-1') as f:
                    content = f.read()
            except Exception as e:
                print(f"Erro ao ler arquivo: {e}")
                sys.exit(1)
        
        if not content.strip():
            print("Arquivo vazio ou não foi possível extrair texto")
            sys.exit(0)
        
        # Padrões a serem detectados
        enabled_patterns = ['cpf', 'cnpj', 'rg', 'cep', 'email', 'telefone', 'pis', 'cartao']
        
        # Executar detecção
        detections = scan_with_regex(content, enabled_patterns)
        
        # Saída em JSON
        result = {
            'detections': detections,
            'file_processed': file_path,
            'total_detections': len(detections)
        }
        
        print(json.dumps(result, ensure_ascii=False, indent=2))
        
    except Exception as e:
        print(f"Erro no processamento: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()