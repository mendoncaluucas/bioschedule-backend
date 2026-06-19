import { PrismaService } from './src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaService();

async function main() {
  const email = 'admin@bioschedule.com';
  const password = 'admin';
  const hash = await bcrypt.hash(password, 10);

  // Vamos garantir que o usuário com esse email exista e seja ADMIN
  const existing = await prisma.usuario.findUnique({ where: { email } });
  
  if (existing) {
    await prisma.usuario.update({
      where: { email },
      data: {
        senha: hash,
        role: 'ADMIN', // <-- Garante a permissão de administrador
        ativo: true,
      }
    });
    console.log(`[SUCCESS] Usuário existente '${email}' atualizado para ADMIN com sucesso.`);
    console.log(`[SUCCESS] Nova senha: ${password}`);
  } else {
    await prisma.usuario.create({
      data: {
        nome: 'Administrador Master',
        email,
        senha: hash,
        role: 'ADMIN', // <-- Cria já com permissão de administrador
        ativo: true,
      }
    });
    console.log(`[SUCCESS] Novo usuário '${email}' criado como ADMIN com sucesso.`);
    console.log(`[SUCCESS] Senha: ${password}`);
  }
}

main()
  .catch(e => {
    console.error('[ERROR]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
