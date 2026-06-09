import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WhatsappService } from './whatsapp.service';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('WhatsApp')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('qr')
  @ApiOperation({ summary: 'Retorna o QR Code atual para autenticação do WhatsApp' })
  getQrCode() {
    return {
      qr: this.whatsappService.getQrCode(),
      connected: this.whatsappService.getStatus().connected,
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Verifica se o WhatsApp está conectado' })
  getStatus() {
    return this.whatsappService.getStatus();
  }
}
