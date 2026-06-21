// Mock do Baileys: makeWASocket (default export) retorna um socket falso a cada chamada.
// Nenhuma conexão real é aberta.
jest.mock('@whiskeysockets/baileys', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    ev: { on: jest.fn(), removeAllListeners: jest.fn() },
    end: jest.fn(),
  })),
  useMultiFileAuthState: jest.fn().mockResolvedValue({ state: {}, saveCreds: jest.fn() }),
  DisconnectReason: { loggedOut: 401, badSession: 500, forbidden: 403 },
}));

// Mock do fs: garante que os testes nunca apaguem a pasta de credenciais real.
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
  rmSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

import makeWASocket from '@whiskeysockets/baileys';
import { WhatsappService } from './whatsapp.service';

const makeWASocketMock = makeWASocket as unknown as jest.Mock;

describe('WhatsappService', () => {
  let service: WhatsappService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WhatsappService();
    // Silencia os logs durante os testes
    jest.spyOn((service as any).logger, 'log').mockImplementation(() => undefined);
    jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
    jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined);
  });

  // ==========================================
  // #2 — TETO DE RECONEXÃO
  // ==========================================
  describe('reconnectComDelay (teto de reconexão)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      // Não queremos executar a reinicialização real ao avançar o timer
      jest.spyOn(service as any, 'initializeClient').mockResolvedValue(undefined);
    });

    afterEach(() => {
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    it('agenda UMA reconexão e incrementa o contador', () => {
      (service as any).reconnectComDelay();
      expect((service as any).reconnectAttempts).toBe(1);
      expect((service as any).reconnectTimer).not.toBeNull();
    });

    it('não empilha múltiplas reconexões se já houver uma agendada', () => {
      (service as any).reconnectComDelay();
      (service as any).reconnectComDelay();
      (service as any).reconnectComDelay();
      // Apenas a primeira agendou; as demais retornam cedo
      expect((service as any).reconnectAttempts).toBe(1);
    });

    it('PARA de reconectar ao atingir o teto e marca status disconnected', () => {
      const max = (service as any).MAX_RECONNECT_ATTEMPTS;
      (service as any).reconnectAttempts = max; // já no limite

      (service as any).reconnectComDelay();

      expect((service as any).reconnectTimer).toBeNull(); // não agendou
      expect((service as any).status).toBe('disconnected');
    });

    it('ao disparar o timer, limpa o handle e chama initializeClient', () => {
      (service as any).reconnectComDelay();
      expect((service as any).reconnectTimer).not.toBeNull();

      jest.runOnlyPendingTimers();

      expect((service as any).reconnectTimer).toBeNull();
      expect((service as any).initializeClient).toHaveBeenCalledTimes(1);
    });
  });

  // ==========================================
  // #1 — TEARDOWN DE SOCKET + GUARD CONCORRENTE
  // ==========================================
  describe('teardownSocket (evita leak de listeners/sockets)', () => {
    it('remove listeners e encerra o socket anterior', () => {
      const socketAntigo = {
        ev: { on: jest.fn(), removeAllListeners: jest.fn() },
        end: jest.fn(),
      };
      (service as any).socket = socketAntigo;

      (service as any).teardownSocket();

      expect(socketAntigo.ev.removeAllListeners).toHaveBeenCalledWith('connection.update');
      expect(socketAntigo.ev.removeAllListeners).toHaveBeenCalledWith('creds.update');
      expect(socketAntigo.end).toHaveBeenCalled();
      expect((service as any).socket).toBeUndefined();
    });

    it('é seguro chamar sem socket existente', () => {
      (service as any).socket = undefined;
      expect(() => (service as any).teardownSocket()).not.toThrow();
    });
  });

  describe('initializeClient (guard de concorrência + teardown)', () => {
    it('ignora chamada concorrente quando já está inicializando', async () => {
      (service as any).isInitializing = true;

      await (service as any).initializeClient();

      expect(makeWASocketMock).not.toHaveBeenCalled();
    });

    it('encerra o socket anterior antes de criar um novo', async () => {
      const socketAntigo = {
        ev: { on: jest.fn(), removeAllListeners: jest.fn() },
        end: jest.fn(),
      };
      (service as any).socket = socketAntigo;

      await (service as any).initializeClient();

      expect(socketAntigo.end).toHaveBeenCalled();
      expect(makeWASocketMock).toHaveBeenCalledTimes(1);
      // registra os dois listeners no novo socket
      const novoSocket = makeWASocketMock.mock.results[0].value;
      expect(novoSocket.ev.on).toHaveBeenCalledWith('connection.update', expect.any(Function));
      expect(novoSocket.ev.on).toHaveBeenCalledWith('creds.update', expect.any(Function));
    });

    it('libera a flag isInitializing ao final', async () => {
      await (service as any).initializeClient();
      expect((service as any).isInitializing).toBe(false);
    });
  });

  // ==========================================
  // forcarReset — reabilita reconexão e limpa estado
  // ==========================================
  describe('forcarReset', () => {
    it('cancela timer pendente, zera tentativas e reinicializa', async () => {
      jest.spyOn(service as any, 'initializeClient').mockResolvedValue(undefined);
      (service as any).reconnectAttempts = 5;
      (service as any).reconnectTimer = setTimeout(() => undefined, 10000);

      await service.forcarReset();

      expect((service as any).reconnectAttempts).toBe(0);
      expect((service as any).reconnectTimer).toBeNull();
      expect((service as any).initializeClient).toHaveBeenCalledTimes(1);
    });
  });
});
