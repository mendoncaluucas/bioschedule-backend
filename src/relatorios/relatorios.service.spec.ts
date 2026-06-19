import { Test, TestingModule } from '@nestjs/testing';
import { RelatoriosService } from './relatorios.service';

import { PrismaService } from '../prisma/prisma.service';

describe('RelatoriosService', () => {
  let service: RelatoriosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RelatoriosService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<RelatoriosService>(RelatoriosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
