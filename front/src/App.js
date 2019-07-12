import React, { Component } from 'react';
import './App.css';

import game from "./game";
import { promisify } from "util";

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

    const watchForEvents = function(error, response) {
      if (!error && response) {
        const topics = response.topics;
        for (const t in topics) {
          // I couldn't make the abi decoder work so this snippet is a bit ugly...
          if (topics[t] === '0xb653067b29ff213be334638862d1e3f28be365b33e8eb9558742962f699a6ffd') {
            const gameId = response.data.substring(0, 66);
            this.updateGameId(gameId);
          } else if (topics[t] === '0x3aea73aed08869918e8572b0bc3d5dbd2a09b2b6c47f038ad013f4e18cc94a45') {
            const winner = response.data.substring(66, 66+66);
            console.log("the winner is", winner)
          } else if (topics[t] === '0xc4c914bccdfa67099284940c39dd86cb12b00a694593ce49ec91492b138b62c3') {
            console.log("it's a tie, keep playing")
          }
        }
      } else {
        console.error(error);
      }
    }

    var filter = web3.eth.filter(options, watchForEvents.bind(this));
    filter.watch(function(error, result){});
  }

  createGame = async () => {
    console.log("Creating new game between", this.state.player1, "and", this.state.player2)
    const pCreateGame = promisify(game.createGame.sendTransaction);
    try {
      const player2 = this.state.player2;
      const fee = web3.toWei(this.state.fee, 'ether')
      await pCreateGame(
        player2,
        fee,
        {
          gas: "300000",
          from: this.state.player1
        }
      );
    } catch (e) {
      console.log('an error has occored', e);
    }
  }

  sendHand = async (hand) => {
    try {
      const  pSendHand = promisify(game.sendHand.sendTransaction);

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

      await pFinishGame(
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
          <button onClick={() => this.sendHand(1)} id="rock">Piedra</button>
          <button onClick={() => this.sendHand(2)} id="paper">Papel</button>
          <button onClick={() => this.sendHand(3)} id="scissors">Tijera</button>
        </section>
        <button onClick={() => this.finishGame()}>Finish game</button>
        <button onClick={() => this.deleteGame()}>Delete game</button>
      </div>
    )
  };
}
export default App;
