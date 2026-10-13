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

export class CallNextDto {
  @IsOptional()
  @IsUUID()
  serviceId?: string;
}