const assert = require("assert");

const BigNumber = web3.BigNumber
require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should()

const GameContract = artifacts.require('GameContract')

function assertEvent(log, expectedEventName, expectedArgs) {
  const { event, args } = log
  event.should.be.eq(expectedEventName)

  if (expectedArgs) {
    for (let key in expectedArgs) {
      let value = args[key]
      if (value instanceof BigNumber) {
        value = value.toString()
      }
      value.should.be.equal(expectedArgs[key], `[assertEvent] ${key}`)
    }
  }
}

async function getEvents(contract, eventName) {
  return new Promise((resolve, reject) => {
    contract[eventName]().get(function(err, logs) {
      if (err) reject(new Error(`Error fetching the ${eventName} events`))
      resolve(logs)
    })
  })
}

async function assertRevert(promise, message) {
  try {
    await promise
  } catch (error) {
    error.message.should.include(
      message
        ? `VM Exception while processing transaction: revert ${message}`
        : 'revert',
      `Expected "revert", got ${error} instead`
    )
    return
  }
  should.fail('Expected revert not received')
}

function increaseTime(duration) {
  const id = Date.now()

  return new Promise((resolve, reject) => {
    web3.currentProvider.sendAsync(
      {
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        params: [duration],
        id: id
      },
      err1 => {
        if (err1) return reject(err1)

        web3.currentProvider.sendAsync(
          {
            jsonrpc: '2.0',
            method: 'evm_mine',
            id: id + 1
          },
          (err2, res) => {
            return err2 ? reject(err2) : resolve(res)
          }
        )
      }
    )
  })
}

contract('Game', function([
  _,
  owner,
  player1,
  player2,
  player3,
  hacker
]) {

  const ROCK = 1;
  const PAPER = 2;
  const SCISSORS = 3;
  const MINUMUM_FEE = "0.001";

  const ether = (ether) => web3.utils.toWei(ether, 'ether').toString();

  beforeEach(async function() {
    gameManager = await GameContract.new({
      from: owner,
      gas: 6e6,
      gasPrice: 21e9
    })
  })

  async function createGame(player1, player2, fee = MINUMUM_FEE) {
    const receipt = await gameManager.createGame(
      player2,
      ether(fee),
      { from: player1 }
    )
    const event = receipt.logs[0]
    assert.equal(event.event, "GameCreated")
    assert.equal(event.args.player1, player1);
    assert.equal(event.args.player2, player2);
    assert.equal(event.args.fee.toString(), ether(MINUMUM_FEE));
    return receipt;
  }

  async function sendHand(gameId, player, hand, fee = MINUMUM_FEE) {
    const receipt = await gameManager.sendHand(
      gameId,
      hand,
      { from: player, value: ether(fee) }
    );
    return receipt;
  }

  async function finishGame(gameId, address) {
    const receipt = await gameManager.finishGame(
      gameId,
      { from: address === undefined ? owner : address}
    );
    // const event = receipt.logs[0]
    // assert.equal(event.event, "GameCreated")
    // assert.equal(event.args.gameId, "0xc85c863e55fe66a7374b0aa9d5744be5ed1d68bac32a182d18edba7268578758");
    // assert.equal(event.args.player1, player1);
    // assert.equal(event.args.player2, player2);
    // assert.equal(event.args.fee.toString(), ether("0.01"));
    return receipt;
  }

  describe('games', function() {
    it('should create a game', async function() {
      const receipt = await createGame(player1, player2);
      const event = receipt.logs[0]
      assert.equal(event.args.gameId, "0xbe8c53317bc8a2fd12a55d2e2af745a315bcc11c903383efddc53e23b6e0fddc");
    })

    it('should create two games', async function() {
      const receipt1 = await createGame(player1, player2);
      const receipt2 = await createGame(player1, player3);
      assert.notEqual(receipt1.logs[0].args.gameId, receipt2.logs[0].args.gameId);
    })

    it('should revert if create two identical games', async function() {
      await createGame(player1, player2);
      await assertRevert(createGame(player1, player2), "duplicate game")
    })


    it('play hands', async function() {
      let receipt = await createGame(player1, player2);
      const gameId = receipt.logs[0].args.gameId;

      await sendHand(gameId, player1, ROCK);
      await sendHand(gameId, player2, PAPER);
      
      receipt = await finishGame(gameId);
      let event = receipt.logs[0];
      assert.equal(event.event, "Winner");
      assert.equal(event.args.gameId, gameId);
      assert.equal(event.args.winner, player2);
      assert.equal(event.args.reward.toString(), ether("0.002"));
    })

    it('happy case with turns', async function() {
      let receipt = await createGame(player1, player2);
      const gameId = receipt.logs[0].args.gameId;

      await sendHand(gameId, player1, PAPER);
      await sendHand(gameId, player2, PAPER);
      
      receipt = await finishGame(gameId);

      event = receipt.logs[0];
      assert.equal(event.event, "Tie");
      assert.equal(event.args.gameId, gameId);
      assert.equal(event.args.reward.toString(), ether("0.002"));
      
      await sendHand(gameId, player1, ROCK);
      await sendHand(gameId, player2, PAPER);
      
      receipt = await finishGame(gameId);

      event = receipt.logs[0];
      assert.equal(event.event, "Winner");
      assert.equal(event.args.gameId, gameId);
      assert.equal(event.args.winner, player2);
      assert.equal(event.args.reward.toString(), ether("0.004"));

    })

    it('should throw when finalize an already ended game', async function() {
      let receipt = await createGame(player1, player2);
      const gameId = receipt.logs[0].args.gameId;

      await sendHand(gameId, player1, PAPER);
      await sendHand(gameId, player2, ROCK);
      
      receipt = await finishGame(gameId);

      await assertRevert(finishGame(gameId), "the game already ended");
    })

    it('should not be able to finalize if the other one player havent play', async function() {
      const receipt = await createGame(player1, player2);
      const gameId = receipt.logs[0].args.gameId;

      await sendHand(gameId, player1, PAPER);
      
      await assertRevert(finishGame(gameId), "player 2 haven't play yet");
    })

    it('should be able to finish a game after failed to finalized', async function() {
      let receipt = await createGame(player1, player2);
      const gameId = receipt.logs[0].args.gameId;

      await sendHand(gameId, player2, PAPER);
      
      await assertRevert(finishGame(gameId), "player 1 haven't play yet");

      await sendHand(gameId, player1, ROCK);

      receipt = await finishGame(gameId);
      assert.equal(receipt.logs[0].event, "Winner");
    })

    it('should not be able to change your hand', async function() {
      const receipt = await createGame(player1, player2);
      const gameId = receipt.logs[0].args.gameId;

      await sendHand(gameId, player1, PAPER);
      await assertRevert(sendHand(gameId, player1, ROCK), "you can't change your hand");
    })

    it('should not be able to play an ended game', async function() {
      let receipt = await createGame(player1, player2);

      const gameId = receipt.logs[0].args.gameId;

      await sendHand(gameId, player1, PAPER);
      await sendHand(gameId, player2, ROCK);
      
      receipt = await finishGame(gameId);
      assert.equal(receipt.logs[0].event, "Winner");
      await assertRevert(sendHand(gameId, player2, SCISSORS), "the game already ended");
    })
    
    it('should not be able to change your hand', async function() {
      let receipt = await createGame(player1, player2);
      const gameId = receipt.logs[0].args.gameId;

      await sendHand(gameId, player1, PAPER);
      await assertRevert(sendHand(gameId, player1, ROCK), "you can't change your hand");
      await sendHand(gameId, player2, SCISSORS);
      await assertRevert(sendHand(gameId, player1, ROCK), "you can't change your hand");
      await assertRevert(sendHand(gameId, player2, PAPER), "you can't change your hand");
      receipt = await finishGame(gameId);
      assert.equal(receipt.logs[0].event, "Winner");
      assert.equal(receipt.logs[0].args.winner, player2);
    })

    it('game should result in a tie', async function() {
      let receipt = await createGame(player1, player2);
      const gameId = receipt.logs[0].args.gameId;

      await sendHand(gameId, player1, PAPER);
      await sendHand(gameId, player2, PAPER);
      receipt = await finishGame(gameId);
      assert.equal(receipt.logs[0].event, "Tie");
    })

    it('should handle multiple games between same players', async function() {
      let receipt = await createGame(player1, player2);
      const gameId = receipt.logs[0].args.gameId;

      await sendHand(gameId, player1, PAPER);
      await sendHand(gameId, player2, PAPER);
      receipt = await finishGame(gameId);
      assert.equal(receipt.logs[0].event, "Tie");

      await sendHand(gameId, player1, ROCK);
      await sendHand(gameId, player2, ROCK);
      receipt = await finishGame(gameId);
      assert.equal(receipt.logs[0].event, "Tie");

      await sendHand(gameId, player1, ROCK);
      await sendHand(gameId, player2, PAPER);
      receipt = await finishGame(gameId);
      assert.equal(receipt.logs[0].event, "Winner");

      receipt = await createGame(player1, player2);
      let gameId2 = receipt.logs[0].args.gameId;
      assert.equal(gameId, gameId2);

      await sendHand(gameId, player1, ROCK);
      await sendHand(gameId, player2, PAPER);
      receipt = await finishGame(gameId);
      assert.equal(receipt.logs[0].event, "Winner");

      receipt = await createGame(player1, player2);
      gameId2 = receipt.logs[0].args.gameId;
      assert.equal(gameId, gameId2);

      await sendHand(gameId, player1, ROCK);
      await sendHand(gameId, player2, SCISSORS);
      receipt = await finishGame(gameId);
      assert.equal(receipt.logs[0].event, "Winner");
    })
  })

})
