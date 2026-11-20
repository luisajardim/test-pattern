import { User } from '../../src/domain/User.js';

/**
 * Padrao Object Mother.
 *
 * Usuario e uma entidade simples e com poucas variacoes relevantes
 * para os testes (PADRAO x PREMIUM). Por isso, metodos estaticos
 * nomeados pelo "papel" do objeto sao suficientes e deixam o teste
 * declarativo: UserMother.umUsuarioPremium().
 */
export class UserMother {
    static umUsuarioPadrao() {
        return new User(1, 'Ana Padrao', 'padrao@email.com', 'PADRAO');
    }

    static umUsuarioPremium() {
        return new User(2, 'Bruno Premium', 'premium@email.com', 'PREMIUM');
    }
}
