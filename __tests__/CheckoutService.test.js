import { CheckoutService } from '../src/services/CheckoutService.js';
import { Pedido } from '../src/domain/Pedido.js';
import { UserMother } from './builders/UserMother.js';
import { CarrinhoBuilder } from './builders/CarrinhoBuilder.js';

const CARTAO_VALIDO = '4111-1111-1111-1111';

describe('CheckoutService', () => {

    describe('quando o pagamento falha', () => {

        it('nao gera pedido (retorna null)', async () => {
            // Arrange
            const carrinho = CarrinhoBuilder.umCarrinho().build();

            // Stub: controla o fluxo devolvendo uma resposta pre-definida
            const gatewayStub = {
                cobrar: jest.fn().mockResolvedValue({ success: false, error: 'Cartao recusado' })
            };
            // Dummies: nao devem ser usados neste fluxo
            const repositoryDummy = { salvar: jest.fn() };
            const emailDummy = { enviarEmail: jest.fn() };

            const checkoutService = new CheckoutService(gatewayStub, repositoryDummy, emailDummy);

            // Act
            const pedido = await checkoutService.processarPedido(carrinho, CARTAO_VALIDO);

            // Assert (Verificacao de Estado)
            expect(pedido).toBeNull();
        });

        it('nao persiste o pedido nem notifica o cliente', async () => {
            // Arrange
            const carrinho = CarrinhoBuilder.umCarrinho().build();
            const gatewayStub = {
                cobrar: jest.fn().mockResolvedValue({ success: false, error: 'Saldo insuficiente' })
            };
            const repositoryDummy = { salvar: jest.fn() };
            const emailDummy = { enviarEmail: jest.fn() };
            const checkoutService = new CheckoutService(gatewayStub, repositoryDummy, emailDummy);

            // Act
            await checkoutService.processarPedido(carrinho, CARTAO_VALIDO);

            // Assert
            expect(repositoryDummy.salvar).not.toHaveBeenCalled();
            expect(emailDummy.enviarEmail).not.toHaveBeenCalled();
        });
    });

    describe('quando um cliente Premium finaliza a compra', () => {

        it('cobra o valor com 10% de desconto e notifica o cliente', async () => {
            // Arrange
            const usuarioPremium = UserMother.umUsuarioPremium();
            const carrinho = CarrinhoBuilder.umCarrinho()
                .comUser(usuarioPremium)
                .comItens([])
                .comItem('Teclado Mecanico', 120)
                .comItem('Mouse Gamer', 80)
                .build();

            const pedidoSalvo = new Pedido(99, carrinho, 180, 'PROCESSADO');

            // Stubs: so precisam devolver o estado necessario para o fluxo seguir
            const gatewayStub = {
                cobrar: jest.fn().mockResolvedValue({ success: true })
            };
            const repositoryStub = {
                salvar: jest.fn().mockResolvedValue(pedidoSalvo)
            };
            // Mock: a interacao em si e o comportamento que queremos verificar
            const emailMock = {
                enviarEmail: jest.fn().mockResolvedValue(undefined)
            };

            const checkoutService = new CheckoutService(gatewayStub, repositoryStub, emailMock);

            // Act
            const pedido = await checkoutService.processarPedido(carrinho, CARTAO_VALIDO);

            // Assert (Verificacao de Comportamento)
            expect(gatewayStub.cobrar).toHaveBeenCalledTimes(1);
            expect(gatewayStub.cobrar).toHaveBeenCalledWith(180, CARTAO_VALIDO);

            expect(emailMock.enviarEmail).toHaveBeenCalledTimes(1);
            expect(emailMock.enviarEmail).toHaveBeenCalledWith(
                'premium@email.com',
                'Seu Pedido foi Aprovado!',
                'Pedido 99 no valor de R$180'
            );

            // Assert (Verificacao de Estado) - complementar
            expect(pedido).toBe(pedidoSalvo);
        });
    });

    describe('quando um cliente Padrao finaliza a compra', () => {

        it('cobra o valor integral, sem desconto', async () => {
            // Arrange
            const carrinho = CarrinhoBuilder.umCarrinho()
                .comUser(UserMother.umUsuarioPadrao())
                .comValorTotal(200)
                .build();

            const gatewayStub = { cobrar: jest.fn().mockResolvedValue({ success: true }) };
            const repositoryStub = {
                salvar: jest.fn().mockImplementation(async (p) => new Pedido(1, p.carrinho, p.totalFinal, p.status))
            };
            const emailMock = { enviarEmail: jest.fn().mockResolvedValue(undefined) };

            const checkoutService = new CheckoutService(gatewayStub, repositoryStub, emailMock);

            // Act
            const pedido = await checkoutService.processarPedido(carrinho, CARTAO_VALIDO);

            // Assert
            expect(gatewayStub.cobrar).toHaveBeenCalledWith(200, CARTAO_VALIDO);
            expect(pedido.totalFinal).toBe(200);
            expect(pedido.status).toBe('PROCESSADO');
        });
    });

    describe('quando o envio de e-mail falha', () => {

        it('ainda assim conclui o pedido', async () => {
            // Arrange
            const carrinho = CarrinhoBuilder.umCarrinho().build();
            const pedidoSalvo = new Pedido(7, carrinho, 100, 'PROCESSADO');

            const gatewayStub = { cobrar: jest.fn().mockResolvedValue({ success: true }) };
            const repositoryStub = { salvar: jest.fn().mockResolvedValue(pedidoSalvo) };
            const emailMock = {
                enviarEmail: jest.fn().mockRejectedValue(new Error('SMTP fora do ar'))
            };
            jest.spyOn(console, 'error').mockImplementation(() => {});

            const checkoutService = new CheckoutService(gatewayStub, repositoryStub, emailMock);

            // Act
            const pedido = await checkoutService.processarPedido(carrinho, CARTAO_VALIDO);

            // Assert
            expect(pedido).toBe(pedidoSalvo);
            expect(emailMock.enviarEmail).toHaveBeenCalledTimes(1);

            console.error.mockRestore();
        });
    });

    describe('quando o carrinho esta vazio', () => {

        it('cobra zero do gateway', async () => {
            // Arrange
            const carrinho = CarrinhoBuilder.umCarrinho().vazio().build();
            const gatewayStub = { cobrar: jest.fn().mockResolvedValue({ success: true }) };
            const repositoryStub = {
                salvar: jest.fn().mockResolvedValue(new Pedido(2, carrinho, 0, 'PROCESSADO'))
            };
            const emailMock = { enviarEmail: jest.fn().mockResolvedValue(undefined) };
            const checkoutService = new CheckoutService(gatewayStub, repositoryStub, emailMock);

            // Act
            await checkoutService.processarPedido(carrinho, CARTAO_VALIDO);

            // Assert
            expect(gatewayStub.cobrar).toHaveBeenCalledWith(0, CARTAO_VALIDO);
        });
    });
});
