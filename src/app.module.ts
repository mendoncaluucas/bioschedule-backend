import { Module } from '@nestjs/common';
import { join } from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule'; 
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ServicoModule } from './servico/servico.module';
import { PacienteModule } from './paciente/paciente.module';
import { AgendamentoModule } from './agendamento/agendamento.module';
import { UsuarioModule } from './usuario/usuario.module';
import { AuthModule } from './auth/auth.module';
import { BloqueioModule } from './bloqueio/bloqueio.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { LembreteModule } from './lembrete/lembrete.module';
import { ConfiguracaoAgendaModule } from './configuracao-agenda/configuracao-agenda.module';
import { RelatoriosModule } from './relatorios/relatorios.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), 
    ScheduleModule.forRoot(), 
    PrismaModule, 
    ServicoModule, 
    PacienteModule, 
    AgendamentoModule, 
    UsuarioModule, 
    AuthModule, 
    BloqueioModule,
    DashboardModule, 
    LembreteModule, 
    ConfiguracaoAgendaModule,
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    RelatoriosModule,
    WhatsappModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}