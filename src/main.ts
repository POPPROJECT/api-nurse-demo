import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
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
    origin: ['https://nurse-demo.vercel.app'],
    credentials: true, // อนุญาตการส่ง credentials (เช่น cookie)
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: 'Content-Type, Authorization', // Headers ที่อนุญาต
  });

  // app.enableCors({
  //   origin: ['http://localhost:3000'],
  //   credentials: true, // อนุญาตการส่ง credentials (เช่น cookie)
  //   methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  //   allowedHeaders: 'Content-Type, Authorization', // Headers ที่อนุญาต
  // });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  await app.init();

  const port = process.env.PORT || 8000;
  await app.listen(port, () => {
    Logger.log(`🚀 Server is running on port ${port}`, 'Bootstrap');
  });
}
bootstrap();
