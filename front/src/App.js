import React, { Component } from 'react';
import './App.css';

import game from "./game";
import { promisify } from "util";
import abi from "ethereumjs-abi";
import { BN, setLengthLeft } from "ethereumjs-util";
import { randomBytes } from 'crypto';

let web3;

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
    // 0xc40eb6b4839055c77d68697985cfa7e7064f73c5661a0552183a1396260379e5
    const watchForEvents = function(error, response) {
      if (!error && response) {
        game.GameCreated().get((err, logs) => {
          if (!logs.length) return;
          const {gameId, player1, player2, fee} = logs[0].args
          const seed = localStorage.getItem('seed');
          localStorage.setItem(gameId, seed);
          console.log("game, seed:", gameId, seed)
          this.updateGameId(gameId);
        });
        game.ForceFinish().get((err, logs) => {
          if (!logs.length) return;
          const { gameId, caller } = logs[0].args
          console.log("the game", gameId, " was force-finished by", caller)
        });
        game.Tie().get((err, logs) => {
          if (!logs.length) return;
          const { gameId, reward } = logs[0].args
          console.log(
            "the game", gameId, 
            "is tied, the winner will receieve", web3.fromWei(reward, 'ether').toNumber()
          );
        });
        game.NextRound().get((err, logs) => {
          if (!logs.length) return;
          const { gameId, round, reward } = logs[0].args
          console.log(
            'game', gameId,
            'goes for round', round.toNumber(),
            ', the winner will receive', web3.fromWei(reward, 'ether').toNumber());
        });
        game.Winner().get((err, logs) => {
          if (!logs.length) return;
          const {gameId, winner, reward} = logs[0].args
          console.log(
            "the winner is", winner, 
            'and received', web3.fromWei(reward, 'ether').toNumber()
          );
        });
      } else {
        console.error(error);
      }
    }

    var filter = web3.eth.filter(options, watchForEvents.bind(this));
    filter.watch(function(error, result){});
  }

  getGameId = (player1, player2) => {
    player1 = setLengthLeft(player1, 20)
    player2 = setLengthLeft(player2, 20)
    const gameHex = abi.soliditySHA3(['address', 'address'], [player1, player2]);
    console.log('hex', gameHex);
    const gameId = '0x' + new BN(gameHex).toString('hex');
    return gameId;
  }

  getSecretHand = (hand) => {
    const seedBN = new BN(randomBytes(32));
    const seedHex = '0x' + seedBN.toString('hex');
    console.log('0x' + hand.toString(), seedHex)
    const secretHand = abi.soliditySHA3(['uint256', 'uint256'], [hand, seedHex]);
    return [secretHand, seedBN];
  }

  createGame = async () => {
    console.log("Creating new game between", this.state.player1, "and", this.state.player2)
    const pCreateGame = promisify(game.createGame.sendTransaction);
    try {
      const [secretHand, seed] = this.getSecretHand(this.state.selectedHand)
      const secretHandHex = '0x' + secretHand.toString('hex')
      await pCreateGame(
        this.state.player2,
        secretHandHex,
        {
          gas: "300000",
          from: this.state.player1,
          value: web3.toWei(this.state.fee, 'ether')
        }
      );
      localStorage.setItem('seed', seed.toString('hex'))
    } catch (e) {
      console.log('an error has occored', e);
    }
  }

  sendHand = async () => {
    const hand = this.state.selectedHand
    try {
      const pSendHand = promisify(game.sendHand.sendTransaction);
      console.log(this.state.gameId, hand)
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
      const seed = '0x' + localStorage.getItem(this.state.gameId);
      // console.log(this.state.gameId, hand, seed);
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
      const secretHandHex = '0x' + secretHand.toString('hex');
      console.log(this.state.gameId, hand, secretHandHex)
      await pContinueGame(
        this.state.gameId,
        secretHandHex,
        {
          gas: 300000,
          from: this.state.player1,
          value: web3.toWei(this.state.fee, 'ether')
        }
      );
      localStorage.setItem('seed', seed);
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
      pDeleteGame(this.state.gameId, {gas: 300000, from: this.state.player1});
    } catch (e) {
      console.log('an error has occored', e);
    }
  }

  deleteAll = async () => {
    try {
      const pDeleteAll = promisify(game.deleteAll.sendTransaction);
      pDeleteAll({gas: 300000, from: this.state.player1});
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

      const r = await pGetGame(
        this.state.gameId,
        {
          gas: 300000,
          from: this.state.player1,
        }
      );
      console.log(r[0], r[1], r[8].toString());
      console.log(r);
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
          <button onClick={() => this.sendHand()}>Send Hand</button>
        </div>
        <section>
          <h3>Elegí</h3>
          <button onClick={() => this.selectHand(1)} id="rock">Piedra</button>
          <button onClick={() => this.selectHand(2)} id="paper">Papel</button>
          <button onClick={() => this.selectHand(3)} id="scissors">Tijera</button>
        </section>
        <button onClick={() => this.finishGame()}>Finish game</button>
        <button onClick={() => this.continueGame()}>Continue game</button>
        <button onClick={() => this.getGame()}>Get game</button>
        <button onClick={() => this.deleteGame()}>Delete game</button>
      </div>
    )
  };
}
export default App;
