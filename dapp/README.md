## Setup

### Installation dependencies
```
npm install # or yarn
```

### Compile contracts
```
npx truffle compile
```

### Run local ganache
```
npm run ganache
```

### Run tests
```
npx truffle test
```


### Deploy the contracts
```
npx truffle migrate
```

# Commit-reveal scheme

Al crear la partida se envia un secreto que es igual a ```keccak256(abi.encodePacked(hand, seed))```, siendo hand la mano elegida y seed un valor de 32 bytes random.
Luego el player2 debe jugar su mano, esta si se envia en texto plano.
Luego player1 debe finalizar la partida enviando la mano y la seed que se utilizó para generar el secreto enviado previamente. 
Si la mano y la seed son las mismas son correctamente verificadas la partida continua su desarrollo, ya sea con un empate o con un ganador.
De haber empate, player1 puede continuar enviando otro secreto (generado de la misma forma pero con otro valor random)
Las partidas tienen tiempo de expiration, por lo que si player1 tardase mucho en decidir si quiere finalizar/continuar la partida o player2 en jugar su mano, cualquiera de los dos puede llamar a ForceFinish y forzar la terminacion de la partida (repartiendo el monto apostado entre ambos jugadores).

## ERC20 implementation

Antes de poder crear una partida llamaría a [IERC20::approve](https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/contracts/token/ERC20/IERC20.sol#L50) con un valor suficientemente alto para no necesitar incrementar el allowance constantemente.

### sendHand

En lugar de enviar ether en la transacción que envia la mano elegida por el jugador,  el contrato utilizaría [IERC20::transferFrom](https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/contracts/token/ERC20/IERC20.sol#L61) para retirar los tokens necesarios para poder jugar en la partida, y fallar en caso de que no haya suficientes tokens.

### finishGame

De forma similar a sendHand, en lugar de enviar ether al ganador se le transferirian los ERC20 al ganador.


