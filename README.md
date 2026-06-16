#  Bioschedule: Sistema Inteligente de Agendamento Full Stack

O **Bioschedule** é uma solução completa para gestão de clínicas e profissionais liberais, desenvolvida para automatizar o fluxo de agendamentos e melhorar a comunicação com pacientes. O projeto integra uma interface administrativa robusta, um portal público de autoatendimento e notificações automatizadas via WhatsApp.

---

##  Arquitetura do Sistema

O sistema foi concebido sob uma arquitetura de **Microserviços Desacoplados**, garantindo que o frontend e o backend possam evoluir de forma independente, comunicando-se através de uma API RESTful segura.

###  Ecossistema Tecnológico (The Stack)

| Camada | Tecnologia | Propósito |
| :--- | :--- | :--- |
| **Frontend** | React 19 + Vite | Interface de alta performance com renderização otimizada. |
| **Backend** | NestJS (Node.js) | Arquitetura modular com injeção de dependência para a API. |
| **Banco de Dados** | PostgreSQL + Prisma | Persistência relacional com tipagem estática e migrações seguras. |
| **Estilização** | Tailwind CSS | Design responsivo baseado em tokens de utilidade. |
| **Notificações** | Baileys + Resend | Automação de mensagens via WhatsApp e e-mails transacionais. |
| **Segurança** | JWT + Bcrypt | Autenticação baseada em tokens e criptografia de credenciais. |

---

##  Funcionalidades Principais

###  Visão Administrativa (Profissional/Clínica)
O painel administrativo oferece controle total sobre a operação:
- **Dashboard Analítico:** Visualização em tempo real de agendamentos, métricas de atendimento e faturamento.
- **Agenda Inteligente:** Controle visual de horários com bloqueios manuais e validação automática de conflitos.
- **Prontuário de Pacientes:** Gestão de dados cadastrais, histórico de consultas e anexos de fotos/exames.
- **Gestão de Equipe e Serviços:** Configuração de múltiplos profissionais, serviços personalizados com valores e durações específicas.

###  Visão do Paciente (Portal Público)
Uma interface simplificada focada na conversão e facilidade:
- **Autoatendimento:** O paciente pode escolher o serviço, o profissional e o horário disponível sem precisar de login.
- **Validação por CPF:** Identificação automática de pacientes já cadastrados para agilizar o processo.
- **Confirmação Instantânea:** Após o agendamento, o sistema dispara notificações de confirmação automaticamente.

---

##  Como o Projeto Funciona?

1.  **O Backend (API):** Desenvolvido em NestJS, ele expõe endpoints protegidos por JWT. Utiliza o Prisma para garantir que as consultas ao banco sejam rápidas e seguras. A lógica de "conflito de horários" é processada aqui, garantindo que nenhum profissional tenha dois agendamentos no mesmo minuto.
2.  **O Frontend (Web):** Uma SPA (Single Page Application) que consome a API. Utiliza o React Router para navegação e o Tailwind para garantir que o sistema funcione perfeitamente em computadores, tablets e celulares.
3.  **A Integração WhatsApp:** Através da biblioteca Baileys, o sistema mantém uma sessão ativa do WhatsApp Web, permitindo o envio de mensagens de confirmação e lembretes sem custos de APIs pagas de terceiros.

---

##  Como Rodar o Projeto

O projeto está dividido em dois repositórios principais:

1.  [**Bioschedule Backend**](https://github.com/mendoncaluucas/bioschedule-backend ): Contém a lógica de negócio, banco de dados e integrações.
2.  [**Bioschedule Frontend**](https://github.com/mendoncaluucas/bioschedule-frontend ): Contém a interface do usuário e portal de agendamento.

---

##  Contexto Acadêmico
Este projeto foi desenvolvido como trabalho final da disciplina de **Programação Web**. O objetivo foi aplicar conceitos avançados de desenvolvimento Full Stack, integração de APIs de terceiros, modelagem de dados relacional e experiência do usuário (UX).


