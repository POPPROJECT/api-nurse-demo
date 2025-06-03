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

async function bootstrap() {
  const server = express();

  // ✅ ตั้งค่า Middleware บน Express instance โดยตรง
  // ลำดับมีความสำคัญมาก!

  // 1. Cookie Parser
  server.use(cookieParser());

  // 2. Body Parsers
  server.use(express.json());
  server.use(express.urlencoded({ extended: true }));

  // สร้าง NestJS app ด้วย Express instance ที่ตั้งค่าแล้ว
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  // เปิดใช้งาน static file serving
  server.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

  // ตั้งค่า CORS บน NestJS app
  app.enableCors({
    origin: 'https://nurse-demo.vercel.app',
    credentials: true,
  });

  // ตั้งค่า Global Pipes
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  // เริ่มต้นแอปและให้ Express server รับฟัง request
  await app.init();
  const port = process.env.PORT || 8000;
  server.listen(port, () => {
    Logger.log(`🚀 Server ready at http://localhost:${port}`, 'Bootstrap');
  });
}
bootstrap();
