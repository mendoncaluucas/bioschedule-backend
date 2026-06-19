import { Test, TestingModule } from '@nestjs/testing';
import { ConfiguracaoAgendaController } from './configuracao-agenda.controller';
import { ConfiguracaoAgendaService } from './configuracao-agenda.service';

import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('ConfiguracaoAgendaController', () => {
  let controller: ConfiguracaoAgendaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConfiguracaoAgendaController],
      providers: [
        ConfiguracaoAgendaService,
        { provide: PrismaService, useValue: {} },
        { provide: JwtService, useValue: {} },
      ],
    }).compile();

    controller = module.get<ConfiguracaoAgendaController>(ConfiguracaoAgendaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
