# Configuração SFTP - Ness DataFog

## Diretório de Upload SFTP

Para facilitar o upload externo de arquivos via SFTP, configure o seguinte diretório:

```
/home/datafog/uploads/sftp/
```

### Estrutura de Diretórios

```
/home/datafog/
├── uploads/
│   ├── sftp/           # Diretório para uploads via SFTP
│   │   ├── incoming/   # Arquivos recém-chegados
│   │   ├── processing/ # Arquivos em processamento
│   │   └── processed/  # Arquivos já processados
│   └── web/            # Uploads via interface web
└── exports/
    ├── csv/            # Relatórios em CSV
    └── json/           # Relatórios em JSON
```

## Configuração do Servidor SFTP

### 1. Criar usuário dedicado

```bash
sudo useradd -m -s /bin/bash datafog-sftp
sudo passwd datafog-sftp
```

### 2. Configurar diretórios

```bash
sudo mkdir -p /home/datafog/uploads/sftp/{incoming,processing,processed}
sudo mkdir -p /home/datafog/exports/{csv,json}
sudo chown -R datafog-sftp:datafog-sftp /home/datafog/
sudo chmod 755 /home/datafog/uploads/sftp/
```

### 3. Configurar SSH/SFTP

Adicionar ao `/etc/ssh/sshd_config`:

```
Match User datafog-sftp
    ChrootDirectory /home/datafog
    ForceCommand internal-sftp
    AllowTcpForwarding no
    X11Forwarding no
```

### 4. Reiniciar SSH

```bash
sudo systemctl restart ssh
```

## Monitoramento Automático

A aplicação monitora automaticamente o diretório `/home/datafog/uploads/sftp/incoming/` para novos arquivos ZIP.

### Processo de Monitoramento

1. **Detecção**: Sistema verifica novos arquivos a cada 30 segundos
2. **Validação**: Confirma se é um arquivo ZIP válido
3. **Movimentação**: Move arquivo para diretório de processamento
4. **Processamento**: Inicia análise automaticamente
5. **Arquivo**: Move arquivo processado para diretório final

## Formatos Suportados

- **ZIP**: Arquivos compactados contendo documentos
- **PDF**: Documentos em formato PDF
- **DOC/DOCX**: Documentos Microsoft Word
- **TXT**: Arquivos de texto simples
- **CSV**: Arquivos de dados estruturados

## Credenciais SFTP

**Host**: servidor-datafog.ness.com.br
**Porta**: 22
**Usuário**: datafog-sftp
**Senha**: [Configurada pelo administrador]
**Diretório**: /uploads/sftp/incoming/

## Logs e Monitoramento

Os logs de processamento SFTP são armazenados em:
- `/var/log/datafog/sftp-monitor.log`
- `/var/log/datafog/processing.log`

## Exportação de Resultados

Os resultados podem ser exportados automaticamente via SFTP:

### CSV
```
/exports/csv/relatorio-YYYY-MM-DD-HHMMSS.csv
```

### JSON
```
/exports/json/relatorio-YYYY-MM-DD-HHMMSS.json
```

## Segurança

- Acesso SFTP isolado (chroot)
- Usuário com permissões limitadas
- Monitoramento de logs em tempo real
- Criptografia de arquivos sensíveis