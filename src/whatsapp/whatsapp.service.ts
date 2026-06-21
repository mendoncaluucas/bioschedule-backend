import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  WASocket,
} from '@whiskeysockets/baileys';
import * as fs from 'fs';
import * as path from 'path';

const AUTH_DIR = path.resolve('./whatsapp-auth');

@Injectable()
export class WhatsappService implements OnModuleInit {
  private socket: WASocket;
  private qrCode: string | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 10;
  private isInitializing = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private status: 'disconnected' | 'connecting' | 'waiting_qr' | 'connected' | 'logged_out' = 'disconnected';
  private readonly logger = new Logger(WhatsappService.name);

  async onModuleInit() {
    await this.initializeClient();
  }

  private async initializeClient() {
    // Evita inicializações concorrentes: vários eventos 'close' (de sockets antigos)
    // poderiam disparar makeWASocket em paralelo, acumulando sockets/listeners.
    if (this.isInitializing) {
      this.logger.warn('Inicialização do WhatsApp já em andamento — chamada concorrente ignorada.');
      return;
    }
    this.isInitializing = true;

    // Encerra o socket anterior antes de criar um novo (evita leak de listeners/timers).
    this.teardownSocket();

    this.status = 'connecting';
    this.qrCode = null;

    try {
      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

      this.socket = makeWASocket({
        auth: state,
        printQRInTerminal: true,
      });

      // Listener de atualização de conexão
      this.socket.ev.on('connection.update', (update) => {
        const { qr, connection, lastDisconnect } = update;

        if (qr) {
          this.qrCode = qr;
          this.status = 'waiting_qr';
          this.logger.warn('📱 Novo QR Code gerado. Escaneie com o WhatsApp.');
        }

        if (connection === 'open') {
          this.isConnected = true;
          this.qrCode = null;
          this.status = 'connected';
          this.reconnectAttempts = 0; // Reset no sucesso
          this.logger.log('✅ WhatsApp conectado com sucesso!');
        }

        if (connection === 'close') {
          this.isConnected = false;
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;

          this.logger.warn(`⚠️ WhatsApp desconectado. Status code: ${statusCode}`);

          // Sessão inválida ou logout → limpar credenciais e pedir novo QR
          if (
            statusCode === DisconnectReason.loggedOut ||
            statusCode === DisconnectReason.badSession
          ) {
            this.logger.error('❌ Sessão inválida. Limpando credenciais para novo QR Code...');
            this.limparCredenciais();
            this.status = 'logged_out';
            // Reconectar após delay para gerar novo QR
            this.reconnectComDelay();
            return;
          }

          // Conta banida/bloqueada → parar completamente
          if (statusCode === DisconnectReason.forbidden) {
            this.logger.error('🚫 Conta bloqueada/banida. Reconexão desabilitada.');
            this.status = 'disconnected';
            return;
          }

          // Todos os outros casos → reconectar com backoff
          this.status = 'connecting';
          this.reconnectComDelay();
        }
      });

      // Salva credenciais quando atualizadas
      this.socket.ev.on('creds.update', saveCreds);
    } catch (error) {
      this.logger.error('Erro ao inicializar cliente WhatsApp:', error);
      this.status = 'disconnected';
      // Reconectar após erro de inicialização
      this.reconnectComDelay();
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Encerra o socket atual e remove seus listeners para liberar recursos.
   * Os listeners são removidos ANTES do end() para que o 'close' resultante
   * não dispare uma reconexão espúria.
   */
  private teardownSocket() {
    if (!this.socket) return;
    try {
      const ev: any = this.socket.ev;
      ev?.removeAllListeners?.('connection.update');
      ev?.removeAllListeners?.('creds.update');
      this.socket.end(undefined);
    } catch (err) {
      this.logger.warn('Falha ao encerrar socket anterior (ignorada).');
    }
    this.socket = undefined as unknown as WASocket;
  }

  /**
   * Reconecta com delay exponencial (3s, 6s, 12s... máx 30s)
   */
  private reconnectComDelay() {
    // Já há um reconnect agendado: não empilhar outro (evita tempestade de reconexão
    // quando vários sockets emitem 'close' em sequência).
    if (this.reconnectTimer) {
      return;
    }

    // Teto de tentativas: evita loop de reconexão infinito quando a conexão nunca abre.
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      this.logger.error(
        `❌ Limite de ${this.MAX_RECONNECT_ATTEMPTS} tentativas de reconexão atingido. ` +
        `Reconexão automática desabilitada. Use POST /whatsapp/reset para tentar novamente.`,
      );
      this.status = 'disconnected';
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(3000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    this.logger.log(`🔄 Tentando reconectar em ${delay / 1000}s (tentativa ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})...`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.initializeClient();
    }, delay);
  }

  /**
   * Limpa credenciais para forçar geração de novo QR Code.
   */
  private limparCredenciais() {
    try {
      if (fs.existsSync(AUTH_DIR)) {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        this.logger.log('🗑️ Credenciais WhatsApp limpas com sucesso.');
      }
    } catch (err) {
      this.logger.error('Erro ao limpar credenciais:', err);
    }
  }

  /**
   * Envia uma mensagem de texto via WhatsApp.
   * Usa onWhatsApp() para validar o número e obter o JID real.
   * Falha silenciosa — nunca deve travar o fluxo de negócio que o chamou.
   */
  async sendMessage(phone: string, text: string): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn(`WhatsApp não está conectado (status: ${this.status}). Mensagem para ${phone} não enviada.`);
      return;
    }

    try {
      // 1. Limpar o número para formato internacional
      const numeroLimpo = this.formatarNumero(phone);
      this.logger.log(`📤 Verificando número ${phone} → ${numeroLimpo}...`);

      // 2. Validar se o número existe no WhatsApp e obter JID real
      const [resultado] = await this.socket.onWhatsApp(numeroLimpo);

      if (!resultado || !resultado.exists) {
        this.logger.warn(`⚠️ Número ${phone} (${numeroLimpo}) não encontrado no WhatsApp. Mensagem não enviada.`);
        return;
      }

      const jidReal = resultado.jid;
      this.logger.log(`📤 Número validado! Enviando para JID: ${jidReal}...`);

      // 3. Enviar usando o JID real retornado pelo WhatsApp
      await this.socket.sendMessage(jidReal, { text });
      this.logger.log(`✅ Mensagem enviada com sucesso para ${phone} (${jidReal})`);
    } catch (error) {
      this.logger.error(`❌ Falha ao enviar mensagem para ${phone}:`, error);
    }
  }

  /**
   * Formata número brasileiro para consulta no WhatsApp.
   * Aceita: "(48) 99999-9999", "48999999999", "5548999999999"
   * Resultado: "5548999999999" (sem @s.whatsapp.net — onWhatsApp cuida disso)
   */
  private formatarNumero(phone: string): string {
    let cleaned = phone.replace(/\D/g, '');
    
    // Adicionar código do país se não tiver
    if (!cleaned.startsWith('55')) {
      cleaned = `55${cleaned}`;
    }

    return cleaned;
  }

  /** Retorna o QR Code atual (ou null se já conectado) */
  getQrCode(): string | null {
    return this.qrCode;
  }

  /** Retorna o status detalhado da conexão do WhatsApp */
  getStatus(): { connected: boolean; status: string } {
    return { connected: this.isConnected, status: this.status };
  }

  /**
   * Força reset da sessão — limpa credenciais e reinicializa.
   * Chamado pelo endpoint POST /whatsapp/reset
   */
  async forcarReset(): Promise<void> {
    this.logger.warn('🔄 Reset manual solicitado. Limpando sessão...');

    // Cancela qualquer reconexão agendada para não correr em paralelo com o reset.
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Encerra o socket atual (remove listeners + end).
    this.teardownSocket();

    this.isConnected = false;
    this.qrCode = null;
    this.reconnectAttempts = 0; // Reabilita a reconexão automática após o reset
    this.limparCredenciais();

    // Reinicializar
    await this.initializeClient();
  }
}
