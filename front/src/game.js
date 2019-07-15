import web3 from "./web3";

// ropsten network
// const address = '0x37ab2a8f0c44099eac4baa5317e8845de4dfd6fc';
const address = '0xd45D4A387F82794325Be2DE09A142966A1dBA3E0';

const abi = [
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
        "name": "caller",
        "type": "address"
      }
    ],
    "name": "ForceFinish",
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
    "name": "NextRound",
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
    "constant": false,
    "inputs": [
      {
        "name": "_player2",
        "type": "address"
      },
      {
        "name": "_secretHand",
        "type": "bytes32"
      }
    ],
    "name": "createGame",
    "outputs": [
      {
        "name": "",
        "type": "bytes32"
      }
    ],
    "payable": true,
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "_gameId",
        "type": "bytes32"
      },
      {
        "name": "_hand",
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
        "name": "hand1",
        "type": "uint256"
      },
      {
        "name": "hand2",
        "type": "uint256"
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
    "constant": true,
    "inputs": [
      {
        "name": "secretHand",
        "type": "bytes32"
      },
      {
        "name": "hand",
        "type": "uint256"
      },
      {
        "name": "seed",
        "type": "uint256"
      }
    ],
    "name": "verifyHand",
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
    "constant": false,
    "inputs": [
      {
        "name": "_gameId",
        "type": "bytes32"
      },
      {
        "name": "_hand",
        "type": "uint256"
      },
      {
        "name": "_seed",
        "type": "uint256"
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
    "constant": false,
    "inputs": [
      {
        "name": "_gameId",
        "type": "bytes32"
      },
      {
        "name": "_secretHand",
        "type": "bytes32"
      }
    ],
    "name": "continueGame",
    "outputs": [],
    "payable": true,
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "_gameId",
        "type": "bytes32"
      }
    ],
    "name": "forceFinishGame",
    "outputs": [
      {
        "name": "",
        "type": "bool"
      }
    ],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "_hand",
        "type": "uint256"
      }
    ],
    "name": "isValidHand",
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
        "name": "player1SecretHand",
        "type": "bytes32"
      },
      {
        "name": "player2Hand",
        "type": "uint256"
      },
      {
        "name": "fee",
        "type": "uint256"
      },
      {
        "name": "reward",
        "type": "uint256"
      },
      {
        "name": "winner",
        "type": "uint256"
      },
      {
        "name": "status",
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
  }
];

// let contract = new web3.eth.Contract(abi, address);
let contract = web3.eth.contract(abi);
let instance = contract.at(address);

export default instance;
// export default contract;
