import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS restritivo: apenas origens confiáveis
  app.enableCors({
    origin: [
      'http://localhost:5173',                    // Dev (Vite)
      'https://bioschedule-frontend.vercel.app',  // Produção
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });

  // Filtro global de exceções: padroniza erros e esconde stack traces do frontend
  app.useGlobalFilters(new AllExceptionsFilter());

  // Ligando a validação global!
  // whitelist: true arranca fora qualquer dado extra que o hacker tente mandar e que não esteja no DTO
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true })); 

  const config = new DocumentBuilder()
    .setTitle('API BioSchedule')
    .setDescription('Documentação da API para o sistema de gestão e agendamento estético.')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();