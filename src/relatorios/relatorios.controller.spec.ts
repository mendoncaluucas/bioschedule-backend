import { Test, TestingModule } from '@nestjs/testing';
import { RelatoriosController } from './relatorios.controller';

import { RelatoriosService } from './relatorios.service';
import { JwtService } from '@nestjs/jwt';

describe('RelatoriosController', () => {
  let controller: RelatoriosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RelatoriosController],
      providers: [
        { provide: RelatoriosService, useValue: {} },
        { provide: JwtService, useValue: {} },
      ],
    }).compile();

    controller = module.get<RelatoriosController>(RelatoriosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
