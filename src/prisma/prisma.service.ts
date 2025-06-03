import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    // เชื่อมต่อ database ตอนที่ module เริ่มทำงาน
    await this.$connect();
  }

  async onModuleDestroy() {
    // ปิดการเชื่อมต่อ ตอนที่แอปปิดตัวลง
    await this.$disconnect();
  }
}
