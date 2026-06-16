import { Controller, Get, Post, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
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
  @ApiOperation({ summary: 'Retorna o QR Code atual e status da conexão' })
  getQrCode() {
    const { connected, status } = this.whatsappService.getStatus();
    return {
      qr: this.whatsappService.getQrCode(),
      connected,
      status,
    };
  }

  @Get('status')
  @ApiOperation({ summary: 'Verifica se o WhatsApp está conectado' })
  getStatus() {
    return this.whatsappService.getStatus();
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Força reset da sessão WhatsApp (gera novo QR Code)' })
  async reset() {
    await this.whatsappService.forcarReset();
    return { message: 'Sessão reiniciada. Aguarde o novo QR Code.' };
  }
}
