/* import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import * as express from 'express'; // 👈 เพิ่มตรงนี้
import { ExpressAdapter } from '@nestjs/platform-express';

async function bootstrap() {
  const server = express(); // 👈 new
  server.use(cookieParser()); // 👈 use before Nest

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  app.use(cookieParser());
  app.use(express.json()); // 👈 สำคัญมาก! เพื่อให้อ่าน body JSON ได้
  app.use(express.urlencoded({ extended: true })); // ✅ สำหรับ form data

  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  await app.init();
  await app.listen(8000); // ✅ listen ทันทีไม่ต้อง .init()

  const httpAdapter = app.getHttpAdapter();
  if (httpAdapter.getType() === 'express') {
    const instance = httpAdapter.getInstance();
    const stack = instance._router?.stack;

    if (stack) {
      const routes = stack
        .filter((layer) => layer.route)
        .map((layer) => {
          const method = Object.keys(layer.route.methods)[0].toUpperCase();
          const path = layer.route.path;
          return `${method} ${path}`;
        });
      Logger.log(`📌 All registered routes:\n${routes.join('\n')}`, 'Routes');
    } else {
      Logger.warn('⚠️ No routes found (stack is still undefined)');
    }
  } else {
    Logger.warn('⚠️ Router explorer only works with Express');
  }
}

bootstrap();
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as express from 'express';
import * as path from 'path';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';
import * as passport from 'passport';
//import { AllExceptionsFilter } from './all-exceptions.filter';

async function bootstrap() {
  const server = express();

  // ✅ 1. Initialize passport
  server.use(passport.initialize()); // 🔥 ต้องมาก่อนทุกอย่าง

  // ✅ 2. ใช้ cookie parser และ body parser
  server.use(cookieParser());
  server.use(express.json());
  server.use(express.urlencoded({ extended: true }));

  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  server.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

  //app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.init();
  server.listen(8000, () => {
    Logger.log(`🚀 Server ready at http://localhost:8000`, 'Bootstrap');
  });
}
bootstrap();
