import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  WASocket,
} from '@whiskeysockets/baileys';

@Injectable()
export class WhatsappService implements OnModuleInit {
  private socket: WASocket;
  private qrCode: string | null = null;
  private isConnected = false;
  private readonly logger = new Logger(WhatsappService.name);

  async onModuleInit() {
    await this.initializeClient();
  }

  private async initializeClient() {
    try {
      // 1. Carrega credenciais salvas (ou cria novas)
      const { state, saveCreds } = await useMultiFileAuthState('./whatsapp-auth');

      // 2. Cria o socket do Baileys
      this.socket = makeWASocket({
        auth: state,
        printQRInTerminal: true, // Mostra QR no terminal (útil para dev)
      });

      // 3. Listener de atualização de conexão
      this.socket.ev.on('connection.update', (update) => {
        const { qr, connection, lastDisconnect } = update;

        if (qr) {
          this.qrCode = qr; // Armazena para o endpoint
          this.logger.warn('📱 Novo QR Code gerado. Escaneie com o WhatsApp.');
        }

        if (connection === 'open') {
          this.isConnected = true;
          this.qrCode = null;
          this.logger.log('✅ WhatsApp conectado com sucesso!');
        }

        if (connection === 'close') {
          this.isConnected = false;
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;

          // Se foi deslogado pelo usuário (ex: logout no celular), não reconecta
          if (statusCode === DisconnectReason.loggedOut) {
            this.logger.error('❌ WhatsApp deslogado. Escaneie o QR Code novamente.');
            return;
          }

          // Caso contrário, tenta reconectar automaticamente
          this.logger.warn('⚠️ WhatsApp desconectado. Tentando reconectar...');
          this.initializeClient();
        }
      });

      // 4. Salva credenciais quando atualizadas
      this.socket.ev.on('creds.update', saveCreds);
    } catch (error) {
      this.logger.error('Erro ao inicializar cliente WhatsApp:', error);
    }
  }

  /**
   * Envia uma mensagem de texto via WhatsApp.
   * Falha silenciosa — nunca deve travar o fluxo de negócio que o chamou.
   */
  async sendMessage(phone: string, text: string): Promise<void> {
    if (!this.isConnected) {
      this.logger.error('WhatsApp não está conectado. Mensagem não enviada.');
      return;
    }

    try {
      const jid = this.formatPhoneToJid(phone);
      await this.socket.sendMessage(jid, { text });
      this.logger.log(`📤 Mensagem enviada para ${phone}`);
    } catch (error) {
      this.logger.error(`Falha ao enviar mensagem para ${phone}:`, error);
    }
  }

  /**
   * Formata número brasileiro para o padrão JID do WhatsApp.
   * Ex: "(48) 99999-9999" → "5548999999999@s.whatsapp.net"
   */
  private formatPhoneToJid(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    const withCountry = cleaned.startsWith('55') ? cleaned : `55${cleaned}`;
    return `${withCountry}@s.whatsapp.net`;
  }

  /** Retorna o QR Code atual (ou null se já conectado) */
  getQrCode(): string | null {
    return this.qrCode;
  }

  /** Retorna o status de conexão do WhatsApp */
  getStatus(): { connected: boolean } {
    return { connected: this.isConnected };
  }
}
