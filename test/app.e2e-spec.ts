jest.mock('@whiskeysockets/baileys', () => ({
  useMultiFileAuthState: jest.fn().mockResolvedValue({ state: {}, saveCreds: jest.fn() }),
  DisconnectReason: { loggedOut: 401 },
  default: jest.fn(() => ({
    ev: { on: jest.fn() },
    logout: jest.fn(),
  })),
}));
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest'; 
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { WhatsappService } from './../src/whatsapp/whatsapp.service';
import * as bcrypt from 'bcrypt';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Usamos o 'beforeAll' para configurar o ambiente uma única vez
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
    .overrideProvider(WhatsappService)
    .useValue({
      sendMessage: jest.fn(),
      onModuleInit: jest.fn(),
      conectarWhatsApp: jest.fn(),
    })
    .compile();

    app = moduleFixture.createNestApplication();

    // ESSENCIAL: Ativar validações para os testes de erro 400 passarem
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      transform: true,
    }));

    await app.init();

    // Pegamos a instância do Prisma para preparar o banco
    prisma = app.get<PrismaService>(PrismaService);

    // Removida a limpeza de banco para evitar a deleção dos dados na apresentação!
    // Apenas testamos o fluxo de ponta a ponta assumindo que o admin existe.
  });

  // Fecha as conexões para o Jest não ficar "pendurado" no terminal
  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('/ (GET) - Deve estar online', () => {
    return (request(app.getHttpServer()) as any)
      .get('/')
      .expect(200);
  });

  it('/agendamento (GET) - Deve barrar acesso sem Token (401)', () => {
    return (request(app.getHttpServer()) as any)
      .get('/agendamento')
      .expect(401);
  });

  it('/auth/login (POST) - Deve retornar um token com credenciais válidas', async () => {
    return (request(app.getHttpServer()) as any)
      .post('/auth/login')
      .send({
        email: 'admin@bioschedule.com',
        senha: 'admin',
      })
      .expect(200)
      .then((response) => {
        expect(response.body).toHaveProperty('access_token');
      });
  });

  it('/paciente (GET) - Deve permitir acesso com Token válido', async () => {
    // 1. Fazemos login para obter um token real
    const loginRes = await (request(app.getHttpServer()) as any)
      .post('/auth/login')
      .send({ email: 'admin@bioschedule.com', senha: 'admin' });

    const token = loginRes.body.access_token;

    // 2. Testamos a rota protegida
    return (request(app.getHttpServer()) as any)
      .get('/paciente')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('/paciente (POST) - Deve retornar 400 ao enviar dados inválidos', async () => {
    const loginRes = await (request(app.getHttpServer()) as any)
      .post('/auth/login')
      .send({ email: 'admin@bioschedule.com', senha: 'admin' });

    const token = loginRes.body.access_token;

    // Enviando campos vazios para forçar o ValidationPipe
    return (request(app.getHttpServer()) as any)
      .post('/paciente')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: '',
        email: 'email-invalido',
      })
      .expect(400);
  });
});