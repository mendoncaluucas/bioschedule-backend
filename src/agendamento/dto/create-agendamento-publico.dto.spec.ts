import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateAgendamentoPublicoDto } from './create-agendamento-publico.dto';

// Testes puros do DTO (class-validator) — não tocam banco nem rede.
describe('CreateAgendamentoPublicoDto', () => {
  const payloadValido = {
    profissionalId: 'prof-1',
    profissionalNome: 'Dra. Maria',
    servicoId: 'serv-1',
    data: '2026-06-22',
    hora: '14:30',
    pacienteNome: 'Fulano de Tal',
    pacienteTelefone: '48999999999',
    pacienteCpf: '000.000.000-00',
    pacienteEmail: 'fulano@exemplo.com',
  };

  async function getErros(payload: Record<string, unknown>) {
    const dto = plainToInstance(CreateAgendamentoPublicoDto, payload);
    return validate(dto);
  }

  // Helper: junta todas as constraints violadas em uma lista de nomes de propriedade
  function propriedadesComErro(errors: Awaited<ReturnType<typeof validate>>) {
    return errors.map((e) => e.property);
  }

  it('aceita um payload válido (sem erros de validação)', async () => {
    const erros = await getErros(payloadValido);
    expect(erros).toHaveLength(0);
  });

  it('rejeita hora em formato inválido', async () => {
    const erros = await getErros({ ...payloadValido, hora: '9h' });
    expect(propriedadesComErro(erros)).toContain('hora');
  });

  it('rejeita hora fora do intervalo 00-23 / 00-59', async () => {
    const erros = await getErros({ ...payloadValido, hora: '25:99' });
    expect(propriedadesComErro(erros)).toContain('hora');
  });

  it('rejeita data em formato inválido', async () => {
    const erros = await getErros({ ...payloadValido, data: '22/06/2026' });
    expect(propriedadesComErro(erros)).toContain('data');
  });

  it('rejeita e-mail inválido', async () => {
    const erros = await getErros({ ...payloadValido, pacienteEmail: 'email-invalido' });
    expect(propriedadesComErro(erros)).toContain('pacienteEmail');
  });

  it('rejeita campos obrigatórios ausentes', async () => {
    const erros = await getErros({ hora: '14:30', data: '2026-06-22' });
    const props = propriedadesComErro(erros);
    expect(props).toEqual(
      expect.arrayContaining([
        'profissionalId',
        'profissionalNome',
        'servicoId',
        'pacienteNome',
        'pacienteTelefone',
        'pacienteCpf',
        'pacienteEmail',
      ]),
    );
  });

  it('rejeita strings vazias em campos obrigatórios', async () => {
    const erros = await getErros({ ...payloadValido, profissionalId: '', servicoId: '' });
    const props = propriedadesComErro(erros);
    expect(props).toContain('profissionalId');
    expect(props).toContain('servicoId');
  });
});
