import web3 from "./web3";

// ropsten network
const address = '0x37ab2a8f0c44099eac4baa5317e8845de4dfd6fc';

const abi = [
  {
    "constant": false,
    "inputs": [
      {
        "name": "_player2",
        "type": "address"
      },
      {
        "name": "_fee",
        "type": "uint256"
      }
    ],
    "name": "createGame",
    "outputs": [
      {
        "name": "",
        "type": "bytes32"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "gameId",
        "type": "bytes32"
      }
    ],
    "name": "finishGame",
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "payable": true,
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "gameId",
        "type": "bytes32"
      }
    ],
    "name": "getGame",
    "outputs": [
      {
        "name": "player1",
        "type": "address"
      },
      {
        "name": "player2",
        "type": "address"
      },
      {
        "name": "expiration",
        "type": "uint256"
      },
      {
        "name": "player1Choice",
        "type": "uint8"
      },
      {
        "name": "player2Choice",
        "type": "uint8"
      },
      {
        "name": "fee",
        "type": "uint256"
      },
      {
        "name": "bet",
        "type": "uint256"
      },
      {
        "name": "winner",
        "type": "uint256"
      },
      {
        "name": "finalized",
        "type": "bool"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "",
        "type": "uint256"
      },
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "rules",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "gameId",
        "type": "bytes32"
      }
    ],
    "name": "deleteGame",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "GAME_DURATION",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "gameId",
        "type": "bytes32"
      }
    ],
    "name": "play",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "gameId",
        "type": "bytes32"
      },
      {
        "name": "hand",
        "type": "uint256"
      }
    ],
    "name": "sendHand",
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "payable": true,
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "hand",
        "type": "uint256"
      }
    ],
    "name": "validHand",
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "payable": false,
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "name": "gameId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "name": "player1",
        "type": "address"
      },
      {
        "indexed": false,
        "name": "player2",
        "type": "address"
      },
      {
        "indexed": false,
        "name": "fee",
        "type": "uint256"
      }
    ],
    "name": "GameCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "name": "gameId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "name": "winner",
        "type": "address"
      },
      {
        "indexed": false,
        "name": "reward",
        "type": "uint256"
      }
    ],
    "name": "Winner",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "name": "gameId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "name": "reward",
        "type": "uint256"
      }
    ],
    "name": "Tie",
    "type": "event"
  }
];

// let contract = new web3.eth.Contract(abi, address);
let contract = web3.eth.contract(abi);
let instance = contract.at(address);

export default instance;
// export default contract;
