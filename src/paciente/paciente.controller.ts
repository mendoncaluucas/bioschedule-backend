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
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

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
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = './uploads';
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath);
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        cb(null, `${randomName}${extname(file.originalname)}`);
      }
    })
  }))
  async uploadFoto(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo de imagem enviado.');
    }
    const fileUrl = `http://localhost:3000/uploads/${file.filename}`;
    return this.pacienteService.salvarFoto(id, fileUrl);
  }

  @Delete(':id/foto/:fotoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFoto(@Param('id') id: string, @Param('fotoId') fotoId: string) {
    return this.pacienteService.removerFoto(id, fotoId);
  }
}