import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUsuarioDto } from './dto/create-usuario.dto';

@Injectable()
export class UsuarioService {
  constructor(private prisma: PrismaService) {}

  async create(createUsuarioDto: CreateUsuarioDto) {
    const usuarioExistente = await this.prisma.usuario.findUnique({
      where: { email: createUsuarioDto.email },
    });

    if (usuarioExistente) {
      throw new ConflictException('Este e-mail já está em uso.');
    }

    const salt = await bcrypt.genSalt();
    const senhaHash = await bcrypt.hash(createUsuarioDto.senha, salt);

    const usuario = await this.prisma.usuario.create({
      data: {
        nome: createUsuarioDto.nome,
        email: createUsuarioDto.email,
        senha: senhaHash,
        role: createUsuarioDto.role || 'PROFISSIONAL',
        ativo: false, 
      },
    });

    delete (usuario as any).senha;
    return usuario;
  }

  async findAll() {
    return this.prisma.usuario.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        ativo: true,
        criado_em: true,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.usuario.findUnique({
      where: { email },
    });
  }

  async findEquipePublica() {
    return this.prisma.usuario.findMany({
      where: {
        ativo: true,
        OR: [
          { role: 'ADMIN' },
          { role: 'PROFISSIONAL' }
        ]
      },
      select: {
        id: true,
        nome: true,
        role: true,
      }
    });
  }

  async update(id: string, updateData: any) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return this.prisma.usuario.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });
    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    return this.prisma.usuario.delete({ where: { id } });
  }
}