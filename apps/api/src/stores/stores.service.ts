import { Injectable, NotFoundException } from '@nestjs/common';
import type { CreateServiceDto, CreateStoreDto, UpdateServiceDto, UpdateStoreDto } from './dto/store.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.db.store.findMany({
      include: { services: { orderBy: { estMinutes: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  findBySlug(slug: string) {
    return this.prisma.db.store.findUnique({
      where: { slug },
      include: { services: { orderBy: { estMinutes: 'asc' } } },
    });
  }

  async findBySlugOrFail(slug: string) {
    const store = await this.findBySlug(slug);

    if (!store) {
      throw new NotFoundException(`Store dengan slug "${slug}" tidak ditemukan`);
    }

    return store;
  }

  create(dto: CreateStoreDto) {
    return this.prisma.db.store.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        address: dto.address,
        qrCodeUrl: dto.qrCodeUrl,
      },
    });
  }

  async update(slug: string, dto: UpdateStoreDto) {
    await this.findBySlugOrFail(slug);

    return this.prisma.db.store.update({ where: { slug }, data: { ...dto } });
  }

  async remove(slug: string): Promise<void> {
    await this.findBySlugOrFail(slug);
    await this.prisma.db.store.delete({ where: { slug } });
  }

  listServices(storeSlug: string) {
    return this.prisma.db.service.findMany({
      where: { store: { slug: storeSlug } },
      orderBy: { estMinutes: 'asc' },
    });
  }

  async createService(storeSlug: string, dto: CreateServiceDto) {
    const store = await this.findBySlugOrFail(storeSlug);

    return this.prisma.db.service.create({
      data: { storeId: store.id, name: dto.name, estMinutes: dto.estMinutes },
    });
  }

  async updateService(serviceId: string, dto: UpdateServiceDto) {
    const service = await this.prisma.db.service.findUnique({ where: { id: serviceId } });

    if (!service) {
      throw new NotFoundException(`Service "${serviceId}" tidak ditemukan`);
    }

    return this.prisma.db.service.update({ where: { id: serviceId }, data: { ...dto } });
  }

  async removeService(serviceId: string): Promise<void> {
    const service = await this.prisma.db.service.findUnique({ where: { id: serviceId } });

    if (!service) {
      throw new NotFoundException(`Service "${serviceId}" tidak ditemukan`);
    }

    await this.prisma.db.service.delete({ where: { id: serviceId } });
  }
}