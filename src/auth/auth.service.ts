import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { UsuarioService } from '../usuario/usuario.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usuarioService: UsuarioService,
    private jwtService: JwtService
  ) {}

  async login(email: string, senhaPlana: string) {
    const usuario = await this.usuarioService.findByEmail(email);
    
    if (!usuario) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    const senhaValida = await bcrypt.compare(senhaPlana, usuario.senha);
    
    if (!senhaValida) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    // TRAVA DE SEGURANÇA: Verifica se o usuário está ativo
    // Se o Admin ainda não aprovou (ativo: false), barramos o login aqui.
    if (!usuario.ativo) {
      throw new ForbiddenException('Sua conta ainda aguarda aprovação de um administrador.');
    }

    const payload = { 
      sub: usuario.id, 
      email: usuario.email, 
      nome: usuario.nome,
      role: usuario.role 
    };
    
    return {
      access_token: await this.jwtService.signAsync(payload),
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        ativo: usuario.ativo // Retornamos o status também para o frontend
      }
    };
  }
}