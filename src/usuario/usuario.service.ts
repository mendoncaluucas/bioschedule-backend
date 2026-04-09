import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsuarioService {
  constructor(private prisma: PrismaService) {}

  async create(createUsuarioDto: CreateUsuarioDto) {
    const usuarioExiste = await this.prisma.usuario.findUnique({
      where: { email: createUsuarioDto.email },
    });

    if (usuarioExiste) {
      throw new ConflictException('Este e-mail já está em uso.');
    }

    const senhaCriptografada = await bcrypt.hash(createUsuarioDto.senha, 10);

    const novoUsuario = await this.prisma.usuario.create({
      data: {
        nome: createUsuarioDto.nome,
        email: createUsuarioDto.email,
        senha: senhaCriptografada,
        role: createUsuarioDto.role || 'PROFISSIONAL',
      },
    });

    const { senha, ...usuarioSemSenha } = novoUsuario;
    return usuarioSemSenha;
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
      orderBy: { nome: 'asc' },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.usuario.findUnique({
      where: { email },
    });
  }

  async findOne(id: string) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
        ativo: true,
      },
    });

    if (!usuario) throw new NotFoundException('Usuário não encontrado.');
    return usuario;
  }

  async remove(id: string) {
    try {
      await this.findOne(id);
      return await this.prisma.usuario.delete({ where: { id } });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Usuário possui vínculos e não pode ser removido.');
    }
  }
}