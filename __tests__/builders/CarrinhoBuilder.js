import { Carrinho } from '../../src/domain/Carrinho.js';
import { Item } from '../../src/domain/Item.js';
import { UserMother } from './UserMother.js';

/**
 * Padrao Data Builder.
 *
 * O Carrinho combina usuario x quantidade de itens x valores, o que geraria
 * uma explosao de metodos em um Object Mother. O Builder parte de um estado
 * padrao valido e permite sobrescrever apenas o que importa para o cenario,
 * eliminando o Test Smell de "Setup Obscuro".
 */
export class CarrinhoBuilder {
    constructor() {
        // Estado padrao: usuario comum com 1 item de R$ 100,00
        this.user = UserMother.umUsuarioPadrao();
        this.itens = [new Item('Item Padrao', 100)];
    }

    static umCarrinho() {
        return new CarrinhoBuilder();
    }

    comUser(user) {
        this.user = user;
        return this;
    }

    comItens(itens) {
        this.itens = itens;
        return this;
    }

    comItem(nome, preco) {
        this.itens = [...this.itens, new Item(nome, preco)];
        return this;
    }

    comValorTotal(valor) {
        this.itens = [new Item('Item Avulso', valor)];
        return this;
    }

    vazio() {
        this.itens = [];
        return this;
    }

    build() {
        return new Carrinho(this.user, this.itens);
    }
}
