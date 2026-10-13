import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateTicketDto {
  /** Dipakai saat pelanggan datang dari QR code toko (?service=<id>). */
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  customerName?: string;
}

export class ManualTicketDto {
  /** Layanan yang dipilih operator. Kosong = layanan pertama. */
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  /** Nama pelanggan walk-in. Kosong = "Walk-in". */
  @IsOptional()
  @IsString()
  @MaxLength(60)
  customerName?: string;
}

export class CallNextDto {
  @IsOptional()
  @IsUUID()
  serviceId?: string;
}