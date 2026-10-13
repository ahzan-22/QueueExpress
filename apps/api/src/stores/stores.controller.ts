import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  CreateServiceDto,
  CreateStoreDto,
  UpdateServiceDto,
  UpdateStoreDto,
} from './dto/store.dto';
import { StoresService } from './stores.service';

@Controller('stores')
export class StoresController {
  constructor(private readonly stores: StoresService) {}

  @Get()
  list() {
    return this.stores.list();
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.stores.findBySlugOrFail(slug);
  }

  @Post()
  create(@Body() dto: CreateStoreDto) {
    return this.stores.create(dto);
  }

  @Patch(':slug')
  update(@Param('slug') slug: string, @Body() dto: UpdateStoreDto) {
    return this.stores.update(slug, dto);
  }

  @Delete(':slug')
  async remove(@Param('slug') slug: string): Promise<{ deleted: true }> {
    await this.stores.remove(slug);
    return { deleted: true };
  }

  @Get(':slug/services')
  listServices(@Param('slug') slug: string) {
    return this.stores.listServices(slug);
  }

  @Post(':slug/services')
  createService(@Param('slug') slug: string, @Body() dto: CreateServiceDto) {
    return this.stores.createService(slug, dto);
  }

  @Patch(':slug/services/:serviceId')
  updateService(@Param('serviceId') serviceId: string, @Body() dto: UpdateServiceDto) {
    return this.stores.updateService(serviceId, dto);
  }

  @Delete(':slug/services/:serviceId')
  async removeService(@Param('serviceId') serviceId: string): Promise<{ deleted: true }> {
    await this.stores.removeService(serviceId);
    return { deleted: true };
  }
}