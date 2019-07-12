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

## ERC20 implementation

Antes de poder crear una partida llamaría a [IERC20::approve](https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/contracts/token/ERC20/IERC20.sol#L50) con un valor suficientemente alto para no necesitar incrementar el allowance constantemente.

### sendHand

En lugar de enviar ether en la transacción que envia la mano elegida por el jugador,  el contrato utilizaría [IERC20::transferFrom](https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/contracts/token/ERC20/IERC20.sol#L61) para retirar los tokens necesarios para poder jugar en la partida, y fallar en caso de que no haya suficientes tokens.

### finishGame

De forma similar a sendHand, en lugar de enviar ether al ganador se le transferirian los ERC20 al ganador.


## Commit-reveal protocol

Una forma de evitar que alguna de las partes pueda saber la elección de la otra de ante mano es utilizar un commit-reveal protocol.

### Commit phase

Ambos jugadores, en lugar de enviar su elección en texto plano, envian un hash de su elección y algún valor random, siendo este último es necesario para garantizar un hash único.

### Reveal phase

Una vez que ambos jugado, envian su elección junto con el mismo valor random previamente utilizadop y se genera el calcula el mismo hash.
De ser iguales, ambos jugadores fueron _honestos_ y la partida puede continuar ya sea con un resultado final (ganador/perdedor) o en una segunda ronda en caso de haber un empate.
En caso de que algun hash no sea el mismo al envia previamente enviado significa que algún jugador está intentando modificar su elección y podría ser descalificado.





