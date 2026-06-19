import {
  Controller, Get, Post, Body, Patch, Put, Param, Delete,
  UseGuards, HttpCode, HttpStatus, UseInterceptors,
  UploadedFile, BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard';
import { ApiBearerAuth, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { PacienteService } from './paciente.service';
import { CreatePacienteDto } from './dto/create-paciente.dto';
import { UpdatePacienteDto } from './dto/update-paciente.dto';
import { memoryStorage } from 'multer';

@Controller('paciente') // Voltamos para o padrão singular exato do seu frontend
@UseGuards(AuthGuard)
@ApiTags('paciente')
@ApiBearerAuth()
export class PacienteController {
  constructor(private readonly pacienteService: PacienteService) {}

  @Post()
  create(@Body() createPacienteDto: CreatePacienteDto) {
    return this.pacienteService.create(createPacienteDto);
  }

  @Get()
  findAll() {
    return this.pacienteService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pacienteService.findOne(id);
  }

  // ✨ O SEGREDO ESTÁ AQUI: Funções separadas para não bugar o NestJS!
  // Atende quem mandar PUT
  @Put(':id')
  updatePut(@Param('id') id: string, @Body() updatePacienteDto: UpdatePacienteDto) {
    return this.pacienteService.update(id, updatePacienteDto);
  }

  // Atende quem mandar PATCH
  @Patch(':id')
  updatePatch(@Param('id') id: string, @Body() updatePacienteDto: UpdatePacienteDto) {
    return this.pacienteService.update(id, updatePacienteDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.pacienteService.remove(id);
  }

  @Post(':id/foto')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    // Mantém o arquivo em memória para persistir como base64 no banco
    // (o disco do Render é efêmero e perderia as imagens a cada redeploy)
    storage: memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB por imagem
    fileFilter: (_req, file, cb) => {
      if (!file.mimetype.startsWith('image/')) {
        return cb(new BadRequestException('Apenas arquivos de imagem são permitidos.'), false);
      }
      cb(null, true);
    },
  }))
  async uploadFoto(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo de imagem enviado.');
    }
    // Data URL base64 — persiste com o banco e é renderizada direto pelo <img src> no frontend
    const dataUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    return this.pacienteService.salvarFoto(id, dataUrl);
  }

  @Delete(':id/foto/:fotoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFoto(@Param('id') id: string, @Param('fotoId') fotoId: string) {
    return this.pacienteService.removerFoto(id, fotoId);
  }
}