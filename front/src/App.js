import React, { Component } from 'react';
import './App.css';

import game from "./game";
import { promisify } from "util";
import abi from "ethereumjs-abi";
import { BN } from "ethereumjs-util";
import { randomBytes } from 'crypto';

let web3;

const gameCreatedId = abi.eventID('GameCreated', ["bytes32", "address", "address", "uint256"]).toString('hex')
const forceFinishId = abi.eventID('ForceFinish', ["bytes32", "address"]).toString('hex')
const tieId = abi.eventID('Tie', ["bytes32", "uint256"]).toString('hex')
const nextRoundId = abi.eventID('NextRound', ["bytes32", "uint256", "uint256"]).toString('hex')
const winnerId = abi.eventID('Winner', ["bytes32", "address", "uint256"]).toString('hex')

class App extends Component {
  state = {
    gameId: undefined,
    bet: "0.001",
    player1: '',
    player2: '',
    fee: "0.001",
    data: undefined
  };

  async componentDidMount() {
    const Web3 = require("web3");
    await window.ethereum.enable();
    web3 = new Web3(window.ethereum);
    const accounts = await web3.eth.accounts
    console.log("player1:", accounts[0])
    this.setState({ player1: accounts[0] });

    var options = {
      fromBlock: "pending",
      toBlock: "latest",
      address: game.address,
    };

    const watchForEvents = function(error, response) {
      if (!error && response) {
        const topics = response.topics;
        for (const t in topics) {
          // I couldn't make the abi decoder work so this snippet is a bit ugly...
          let data, caller, reward, rounds, winner, gameId;
          console.log(topics[t], response.data);
          switch (topics[t]) {
            case gameCreatedId:
              data = abi.rawDecode(["bytes32", "address", "address", "uint256"], response.data);
              gameId = data[0];
              this.updateGameId(gameId);
              break;
            case forceFinishId:
              data = abi.rawDecode(["bytes32", "address"], response.data);
              [gameId, caller] = data[1];
              console.log("the game", gameId, " was force-finished by", caller)
              break;
            case tieId:
              data = abi.rawDecode(["bytes32", "uint256"], response.data);
              [gameId, reward] = data[1]
              console.log("the game", gameId, "is tied");
              break;
            case nextRoundId:
              data = abi.rawDecode(["bytes32", "uint256", "uint256"], response.data);
              [gameId, rounds, reward] = data;
              console.log("game", gameId, 'has another round')
              break;
            case winnerId:
              data = abi.rawDecode(["bytes32", "address", "uint256"], response.data);
              winner = data[1]
              console.log("the winner is", winner)
              break;
            default:
              console.log('unknown event');
          }
        }
      } else {
        console.error(error);
      }
    }

    var filter = web3.eth.filter(options, watchForEvents.bind(this));
    filter.watch(function(error, result){});
  }

  getGameId = (player1, player2) => {
    return abi.soliditySHA256(['address', 'address'], [player1, player2]);
  }

  getSecretHand = (hand) => {
    const seedBN = new BN(randomBytes(32));
    const seedHex = '0x' + seedBN.toString('hex');
    console.log(hand, seedHex)
    const secretHand = abi.soliditySHA256(['uint256', 'uint256'], [hand, seedHex]);
    return [secretHand, seedBN];
  }

  createGame = async () => {
    console.log("Creating new game between", this.state.player1, "and", this.state.player2)
    const pCreateGame = promisify(game.createGame.sendTransaction);
    try {
      const player2 = this.state.player2;
      const gameId = this.getGameId(this.state.player1, this.state.player2);
      console.log(gameId);
      const [secretHand, seed] = this.getSecretHand(this.state.selectedHand)
      console.log(player2, secretHand);
      await pCreateGame(
        player2,
        secretHand.toString('hex'),
        {
          gas: "300000",
          from: this.state.player1,
          value: web3.toWei(this.state.fee, 'ether')
        }
      );
      localStorage.setItem(gameId, seed.toString('hex'));


    } catch (e) {
      console.log('an error has occored', e);
    }
  }

  sendHand = async (hand) => {
    try {
      const pSendHand = promisify(game.sendHand.sendTransaction);

      await pSendHand(
        this.state.gameId,
        hand,
        {
          gas: 300000,
          from: this.state.player1,
          value: web3.toWei(this.state.fee, 'ether')
        }
      );
    } catch (e) {
      console.log('an error has occored', e);
    }
  }

  finishGame = async () => {
    try {
      const pFinishGame = promisify(game.finishGame.sendTransaction);

      const hand = this.state.selectedHand;
      const seed = localStorage.getItem(this.state.gameId);
      await pFinishGame(
        this.state.gameId,
        hand,
        seed,
        {
          gas: 300000,
          from: this.state.player1,
        }
      );
    } catch (e) {
      console.log('an error has occored', e);
    }
  }
  
  continueGame = async () => {
    try {
      const pContinueGame = promisify(game.continueGame.sendTransaction);

      const hand = this.state.selectedHand;
      const [secretHand, seed] = this.getSecretHand(hand);
      await pContinueGame(
        this.state.gameId,
        secretHand,
        {
          gas: 300000,
          from: this.state.player1,
        }
      );
      localStorage.setItem(this.state.gameId, seed.toString('hex'));
    } catch (e) {
      console.log('an error has occored', e);
    }
  }

  forceFinishGame = async () => {
    try {
      const pForceFinish = promisify(game.forceFinish.sendTransaction);
      await pForceFinish(
        this.state.gameId,
        {
          gas: 300000,
          from: this.state.player1,
        }
      );
    } catch (e) {
      console.log('an error has occored', e);
    }
  }

  deleteGame = async () => {
    try {
      const pDeleteGame = promisify(game.deleteGame.sendTransaction);
      pDeleteGame(
        this.state.gameId,
        {
          gas: 300000,
          from: this.state.player1,
        }
      );
    } catch (e) {
      console.log('an error has occored', e);
    }
  }


  getGame = async () => {
    if (!this.state.gameId) {
      return;
    }
    try {
      const pGetGame = promisify(game.getGame.call);

      return await pGetGame(
        this.state.gameId,
        {
          gas: 300000,
          from: this.state.player1,
        }
      );
    } catch (e) {
      console.log('an error has occored', e);
    }
  }


  joinGame = async () => {
    try {
      const data = await this.getGame();
      if (data[8]) {
        console.log("this game already ended");
      } else {
        if (data[5].toNumber() === 0) {
          console.log("this game do not exist");
        }
      }
    } catch (e) {
      console.log('an error has occored', e);
    }
  }

  updateGameId = async (event) => {
    let gameId = typeof(event) === 'string' ? event : event.target.value;
    if (!gameId.startsWith('0x')) {
      gameId = '0x' + gameId;
    }
    console.log('new game id:', gameId)
    this.setState({gameId: gameId})
  }

  updatePlayer2 = async (event) => {
    let player2 = typeof(event) === 'string' ? event : event.target.value;
    if (!player2.startsWith('0x')) {
      player2 = '0x' + player2;
    }
    console.log('new player2:', player2)
    this.setState({player2: player2})
  }


  selectHand = async (hand) => {
    console.log('new hand:', hand)
    this.setState({selectedHand: hand})
  }

  render() {
    return (
      <div id="sections">
        <div>
          player2:<input id="player2" type="text" value={this.state.player2} onChange={ event => this.updatePlayer2(event) }/>
          <button onClick={() => this.createGame()}>Start new game</button>
        </div>
        <div>
          gameId:<input id="gameId" type="text" onChange={ event => this.updateGameId(event) } />
          <button onClick={() => this.joinGame()}>Join Game</button>
        </div>
        <section>
          <h3>Elegí</h3>
          <button onClick={() => this.selectHand(1)} id="rock">Piedra</button>
          <button onClick={() => this.selectHand(2)} id="paper">Papel</button>
          <button onClick={() => this.selectHand(3)} id="scissors">Tijera</button>
        </section>
        <button onClick={() => this.finishGame()}>Finish game</button>
        <button onClick={() => this.deleteGame()}>Delete game</button>
      </div>
    )
  };
}
export default App;
