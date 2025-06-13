# Overview

This is a comprehensive Brazilian PII (Personally Identifiable Information) detection system built with React/TypeScript frontend and Node.js backend. The application specializes in detecting Brazilian document types (CPF, CNPJ, RG, CEP, etc.) from uploaded files using a hybrid approach combining regex patterns and semantic analysis via OpenAI integration.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with Radix UI components
- **State Management**: TanStack Query for server state
- **Routing**: React Router for client-side navigation
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts for data visualization

## Backend Architecture
- **Runtime**: Node.js with Express framework
- **Language**: TypeScript with ESM modules
- **Database ORM**: Drizzle ORM
- **Session Management**: Express-session with connect-pg-simple
- **File Processing**: Multer for uploads, Python integration for DataFog processing
- **Authentication**: bcrypt for password hashing

## Data Storage
- **Primary Database**: PostgreSQL 15+ (configurable via DATABASE_URL)
- **Session Store**: Redis for session management and caching
- **File Storage**: Local filesystem with configurable upload directories
- **SFTP Integration**: Automated file monitoring and processing

# Key Components

## PII Detection Engine
- **Brazilian Document Patterns**: CPF, CNPJ, RG, CEP, phone numbers, email addresses
- **Hybrid Processing**: Regex-based detection combined with OpenAI semantic validation
- **Risk Assessment**: Three-tier risk classification (high, medium, low)
- **Context Extraction**: Surrounding text capture for better analysis
- **Batch Processing**: Concurrent job processing with timeout protection

## Security Features
- **Malware Scanning**: Multi-layer security verification including file extension checks, ZIP bomb detection, and optional ClamAV integration
- **Authentication**: Session-based authentication with bcrypt password hashing
- **Rate Limiting**: Configurable request throttling
- **Input Validation**: Comprehensive Zod schema validation
- **File Size Limits**: Configurable upload restrictions

## File Processing Pipeline
- **Multi-format Support**: PDF, DOC/DOCX, XLS/XLSX, TXT, CSV, XML
- **Text Extraction**: Python-based extraction using libraries like PyPDF2, python-docx
- **Queue Management**: Processing job system with status tracking
- **Error Handling**: Robust error recovery and logging

## Reporting and Analytics
- **Real-time Dashboard**: Live statistics and charts
- **Advanced Filtering**: Domain-specific filters (e.g., @ness.com.br)
- **Export Capabilities**: CSV and PDF report generation
- **Case Management**: Incident tracking and audit trails

# Data Flow

1. **File Upload**: Users upload files via web interface or SFTP
2. **Security Scanning**: Files undergo multi-layer security verification
3. **Queue Processing**: Files are queued for processing with job status tracking
4. **Text Extraction**: Content is extracted using appropriate parsers
5. **PII Detection**: Regex patterns scan for Brazilian document types
6. **Semantic Validation**: OpenAI API validates context and reduces false positives
7. **Risk Assessment**: Detections are classified by risk level
8. **Storage**: Results are stored in PostgreSQL with full context
9. **Reporting**: Dashboard displays real-time analytics and allows export

# External Dependencies

## Required Services
- **PostgreSQL**: Primary database (configurable version 15+)
- **Redis**: Session storage and caching
- **OpenAI API**: Semantic validation (optional but recommended)

## Python Dependencies
- **DataFog**: Core PII detection library (v4.2.0+)
- **Document Parsers**: PyPDF2, python-docx, openpyxl for file processing
- **Text Processing**: regex library for pattern matching

## Optional Integrations
- **ClamAV**: Antivirus scanning
- **SMTP**: Email notifications
- **Sentry**: Error monitoring and logging
- **SFTP**: Automated file monitoring

# Deployment Strategy

## Docker-based Deployment
- **Multi-stage Build**: Optimized production images
- **Service Orchestration**: Docker Compose with PostgreSQL, Redis, and application containers
- **Health Checks**: Comprehensive service monitoring
- **Volume Management**: Persistent data and upload storage

## VPS Deployment
- **Automated Scripts**: Complete installation scripts for Ubuntu/Debian
- **System Services**: PM2 process management with auto-restart
- **Reverse Proxy**: Nginx configuration with SSL support
- **Security Hardening**: UFW firewall and fail2ban protection

## Environment Configuration
- **Development**: In-memory database options for local development
- **Production**: Full PostgreSQL setup with Redis caching
- **Scaling**: Configurable concurrent processing limits
- **Monitoring**: Comprehensive logging and health check endpoints

# Changelog

- June 13, 2025. Initial setup
- June 13, 2025. Created comprehensive advanced installation guide with complete directory structure, user consistency fixes, and enterprise-grade configuration options

# User Preferences

Preferred communication style: Simple, everyday language.