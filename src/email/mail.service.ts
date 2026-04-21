import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  // ✨ Adicionamos o campo 'profissional' aqui nos parâmetros
  async enviarConfirmacao(dados: { email: string, nome: string, servico: string, profissional: string, data: string, hora: string }) {
    try {
      await this.resend.emails.send({
        from: 'BioSchedule <onboarding@resend.dev>',
        to: [dados.email],
        subject: '✨ Seu agendamento está confirmado!',
        html: `
          <div style="background-color: #f8fafc; padding: 40px 20px; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #e2e8f0;">
              
              <div style="background-color: #2563eb; padding: 30px 20px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;">BioSchedule</h1>
                <p style="color: #bfdbfe; margin: 5px 0 0 0; font-size: 14px;">Agendamento Confirmado</p>
              </div>

              <div style="padding: 30px;">
                <h2 style="color: #1e293b; margin-top: 0;">Olá, ${dados.nome}! 👋</h2>
                <p style="color: #475569; font-size: 16px; line-height: 1.5;">
                  Tudo certo! Seu horário já está reservado em nossa agenda. Abaixo estão os detalhes do seu procedimento:
                </p>

                <div style="background-color: #f1f5f9; border-radius: 12px; padding: 20px; margin: 25px 0; border-left: 4px solid #3b82f6;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #64748b; width: 40%;">🗓️ <strong>Data:</strong></td>
                      <td style="padding: 8px 0; color: #0f172a; font-weight: bold;">${dados.data}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #64748b;">⏰ <strong>Hora:</strong></td>
                      <td style="padding: 8px 0; color: #0f172a; font-weight: bold;">${dados.hora}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #64748b;">✂️ <strong>Procedimento:</strong></td>
                      <td style="padding: 8px 0; color: #0f172a; font-weight: bold;">${dados.servico}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #64748b;">👤 <strong>Profissional:</strong></td>
                      <td style="padding: 8px 0; color: #0f172a; font-weight: bold;">${dados.profissional}</td>
                    </tr>
                  </table>
                </div>

                <p style="color: #475569; font-size: 15px; line-height: 1.5; text-align: center; margin-top: 30px;">
                  Qualquer imprevisto, pedimos que entre em contato conosco com antecedência.<br/>
                  <strong>Estamos ansiosos para te ver!</strong>
                </p>
              </div>

              <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="color: #94a3b8; margin: 0; font-size: 12px;">
                  Este é um e-mail automático enviado pela plataforma BioSchedule.
                </p>
              </div>
            </div>
          </div>
        `,
      });
    } catch (error) {
      console.error('Erro ao enviar e-mail:', error);
    }
  }
}