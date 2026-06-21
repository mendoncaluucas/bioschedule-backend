# 📅 BioSchedule - API de Agendamento para Clínicas (Back-end)

![NestJS](https://img.shields.io/badge/NestJS_11-API_REST-E0234E?style=for-the-badge&logo=nestjs)
![Prisma](https://img.shields.io/badge/Prisma_ORM-Database-2D3748?style=for-the-badge&logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Persistência-4169E1?style=for-the-badge&logo=postgresql)
![JWT](https://img.shields.io/badge/Auth-JWT_Bearer-success?style=for-the-badge&logo=jsonwebtokens)

A API RESTful do sistema **BioSchedule** é o núcleo de regras e persistência de um SaaS de agendamento para clínicas de estética. Operando de forma **desacoplada** do front-end, ela entrega os dados de forma rápida e estruturada e automatiza a comunicação com o paciente — confirmações e lembretes via WhatsApp — com o objetivo de reduzir as faltas (no-show).

## 💻 Stack Tecnológica

A API foi construída sobre o ecossistema TypeScript, com foco em organização e segurança:
*   **Framework:** NestJS 11 (arquitetura modular).
*   **Persistência (ORM):** Prisma ORM com banco PostgreSQL.
*   **Autenticação:** JWT + Passport para sessões sem estado.
*   **Criptografia:** `bcrypt` para tratamento seguro de senhas.
*   **Integrações:** Baileys (WhatsApp) e Resend (e-mail transacional).

## 🔒 Destaques de Arquitetura e Segurança

A API valida tudo que recebe e protege os dados em camadas:
*   **Validação de Entrada:** DTOs com `class-validator` e um `ValidationPipe` global (modo *whitelist*) rejeitam payloads malformados e descartam campos não previstos antes de chegar ao banco.
*   **Hash de Senhas:** `bcrypt` com *salt* garante que as senhas nunca sejam armazenadas em texto puro; no login é feita apenas a comparação segura com o hash.
*   **Proteção de Rotas com Guards:** um *Guard* intercepta as requisições e valida o token JWT (formato Bearer) no cabeçalho, recusando acessos não autorizados (HTTP 401).
*   **Separação de Responsabilidades:** o código é dividido em módulos por domínio (`/auth`, `/pacientes`, `/servicos`, `/agendamento`, `/bloqueio`, `/configuracao-agenda`, `/dashboard`, `/relatorios`, `/whatsapp`), cada um com controller, service e DTOs.
*   **Automação Assíncrona:** lembretes diários (via cron) e confirmações são disparados no WhatsApp sem bloquear o fluxo principal da API.

## ⚙️ Variáveis de Ambiente

O projeto exige segredos que não devem ser versionados. Crie um arquivo `.env` na raiz da pasta com o seguinte formato:

```env
# URL de conexão do Prisma ORM (PostgreSQL)
DATABASE_URL="postgresql://usuario:senha@localhost:5432/bioschedule?schema=public"

# Chave criptográfica para assinatura dos tokens JWT
JWT_SECRET="sua-chave-super-segura-de-no-minimo-32-caracteres"

# Chave da API de e-mail transacional (Resend)
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxx"

# Porta da API (opcional - padrão: 3000)
PORT=3000
```

## 🚀 Passo a Passo de Execução

Siga as instruções abaixo para executar a API localmente:

**1. Instalar Dependências:** instale os pacotes do ecossistema:
```bash
npm install
```

**2. Configurar o Banco de Dados:** sincronize a modelagem e crie as tabelas necessárias:
```bash
npx prisma migrate dev
```
*(Alternativamente, utilize `npx prisma db push` para empurrar o schema diretamente.)*

**3. Iniciar o Servidor:** suba a API em modo de desenvolvimento (com hot-reload):
```bash
npm run start:dev
```

A API estará operante em `http://localhost:3000`, e a documentação interativa (Swagger) em `http://localhost:3000/api`.
