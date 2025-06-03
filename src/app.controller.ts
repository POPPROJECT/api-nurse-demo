import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get()
  healthCheck(): string {
    // เมื่อ Railway เรียกมาที่ URL หลัก มันจะได้รับ 200 OK พร้อมข้อความนี้
    return 'API is healthy and running!';
  }
}
