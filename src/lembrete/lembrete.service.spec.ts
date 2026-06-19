jest.mock('@whiskeysockets/baileys', () => ({}));
import { Test, TestingModule } from '@nestjs/testing';
import { LembreteService } from './lembrete.service';

import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

describe('LembreteService', () => {
  let service: LembreteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LembreteService,
        { provide: PrismaService, useValue: {} },
        { provide: WhatsappService, useValue: {} },
      ],
    }).compile();

    service = module.get<LembreteService>(LembreteService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
