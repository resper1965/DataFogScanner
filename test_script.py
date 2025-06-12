#!/usr/bin/env python3
import sys
import json
import re
from pathlib import Path

try:
    import PyPDF2
except ImportError as e:
    print(f'PyPDF2 not available: {e}', file=sys.stderr)
    sys.exit(1)

def extract_text_from_pdf(file_path):
    try:
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text = ''
            for page in pdf_reader.pages:
                text += page.extract_text() + '
'
            return text
    except Exception as e:
        print(f'Error reading PDF: {e}', file=sys.stderr)
        return ''

def scan_with_regex(content, enabled_patterns):
    results = []
    
    brazilian_patterns = {
        'cpf': r'\d{3}\.\d{3}\.\d{3}-\d{2}',
        'cnpj': r'\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}',
        'email': r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}',
        'telefone': r'\(?\d{2}\)?\s?\d{4,5}-?\d{4}',
        'cep': r'\d{5}-?\d{3}',
        'rg': r'\d{1,2}\.\d{3}\.\d{3}-\d{1}'
    }
    
    for pattern_name in enabled_patterns:
        if pattern_name in brazilian_patterns:
            matches = re.finditer(brazilian_patterns[pattern_name], content, re.IGNORECASE)
            for match in matches:
                context_start = max(0, match.start() - 30)
                context_end = min(len(content), match.end() + 30)
                context = content[context_start:context_end].strip()
                
                results.append({
                    'type': pattern_name.upper(),
                    'value': match.group(),
                    'context': context,
                    'position': match.start(),
                    'riskLevel': 'high'
                })
    
    return results

def main():
    try:
        file_path = 'uploads/3a4a86c4a477e7ecaf52cf93a69ce7dc'
        enabled_patterns = ['cpf', 'cnpj', 'cep', 'rg']
        
        content = extract_text_from_pdf(file_path)
        
        if not content.strip():
            print('[]')
            return
            
        results = scan_with_regex(content, enabled_patterns)
        print(json.dumps(results, ensure_ascii=False, indent=2))
        
    except Exception as e:
        print(f'Error: {e}', file=sys.stderr)
        print('[]')

if __name__ == '__main__':
    main()
