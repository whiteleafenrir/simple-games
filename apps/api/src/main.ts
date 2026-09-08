import 'dotenv/config';
import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { GUEST_SESSION_COOKIE } from './pets/guest-session-auth.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Pocket Pet API')
      .setDescription('Локальный API. Начните с POST /api/guest-sessions: Execute вернёт id гостя. Подставьте его в guestId методов питомцев. Cookie используется автоматически в этом браузере. Игра и Swagger на localhost используют одну гостевую сессию. POST-запросы меняют данные; GET питомцев актуализирует состояние по времени.')
      .setVersion('0.1.0')
      .addCookieAuth(GUEST_SESSION_COOKIE, { type: 'apiKey', in: 'cookie' }, 'guest-session')
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config), {
      jsonDocumentUrl: 'api/docs-json',
      swaggerOptions: { docExpansion: 'list', displayRequestDuration: true }
    });
  }

  const port = Number(process.env.API_PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('API_PORT must be an integer between 1 and 65535.');
  }
  await app.listen(port, process.env.HOST || '127.0.0.1');
  console.log(`Pocket Pet API: http://localhost:${port}/api/health`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`API explorer: http://localhost:${port}/api/docs`);
  }
}

void bootstrap();
