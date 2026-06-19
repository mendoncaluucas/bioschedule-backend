import { Module } from '@nestjs/common';
import { ConfiguracaoAgendaService } from './configuracao-agenda.service';
import { ConfiguracaoAgendaController } from './configuracao-agenda.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ PrismaModule ],
  controllers: [ConfiguracaoAgendaController],
  providers: [ConfiguracaoAgendaService],
})
export class ConfiguracaoAgendaModule {}
