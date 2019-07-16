const assert = require("assert");
var abi = require('ethereumjs-abi');
const randomBytes = require('randombytes');
const { BN } = require('ethereumjs-util');
// const BigNumber = web3.BigNumber
require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BN))
  .should()

const GameContract = artifacts.require('GameContract')

function assertEvent(log, expectedEventName, expectedArgs) {
  const { event, args } = log
  event.should.be.eq(expectedEventName)

  if (expectedArgs) {
    for (let key in expectedArgs) {
      let value = args[key]
      if (value instanceof BN) {
        value = value.toString()
      }
      assert.equal(value, expectedArgs[key], `[assertEvent] ${key}`)
    }
  }
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

/**
 * Increase the time increase the block's timestamp.
 * @param {number} duration the duration in seconds
 */
function increaseTime(duration) {
  const id = Date.now()

  return new Promise((resolve, reject) => {
    web3.currentProvider.send(
      {
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        params: [duration],
        id: id
      },
      err1 => {
        if (err1) return reject(err1)

        web3.currentProvider.send(
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

  let secrets = {}

  beforeEach(async function() {
    gameManager = await GameContract.new({
      from: owner,
      gas: 6e6,
      gasPrice: 21e9
    })
  })

  function getSecretHand(hand) {
    const seedBN = new BN(randomBytes(32));
    const seedHex = '0x' + seedBN.toString('hex');
    const secretHand = abi.soliditySHA3(['uint256', 'uint256'], [hand, seedHex]);
    return [secretHand, seedBN];
  }

  async function createGame(player1, player2, hand, fee = MINUMUM_FEE) {
    const [secretHand, seed] = getSecretHand(hand);
    const receipt = await gameManager.createGame(
      player2,
      secretHand,
      { 
        from: player1,
        value: ether(fee)
      }
    )
    const event = receipt.logs[0]
    assertEvent(
      event,
      "GameCreated", 
      {
        player1: player1,
        player2: player2
      }
    );
    secrets[event.args.gameId] = [hand, seed];
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

  async function finishGame(gameId, hand, seed, player1) {
    const receipt = await gameManager.finishGame(
      gameId,
      hand,
      seed,
      { from: player1}
    );

    return receipt;
  }

  async function continueGame(gameId, hand, fee = MINUMUM_FEE) {
    const [secretHand, seed] = getSecretHand(hand);
    const receipt = await gameManager.continueGame(
      gameId,
      secretHand,
      { 
        from: player1,
        value: ether(fee)
      }
    )
    assertEvent(
      receipt.logs[0],
      "NextRound", 
      {
        gameId: gameId,
      }
    );
    secrets[gameId] = [hand, seed]
    return receipt;
  }

  async function forceFinishGame(gameId, caller = owner) {
    const receipt = await gameManager.forceFinishGame(
      gameId,
      { 
        from: caller,
      }
    )
    assertEvent(
      receipt.logs[0],
      "ForceFinish", 
      {
        gameId: gameId,
        caller: caller
      }
    );
    return receipt;
  }
  describe('games', function() {
    it('should create a game', async function() {
      const receipt = await createGame(player1, player2, ROCK);
      const event = receipt.logs[0]
      assert.equal(event.args.gameId, "0xbe8c53317bc8a2fd12a55d2e2af745a315bcc11c903383efddc53e23b6e0fddc");
    })

    it('should create two games', async function() {
      const receipt1 = await createGame(player1, player2, ROCK);
      const receipt2 = await createGame(player1, player3, PAPER);
      assert.notEqual(receipt1.logs[0].args.gameId, receipt2.logs[0].args.gameId);
    })

    it('should revert if create two identical games', async function() {
      await createGame(player1, player2, ROCK);
      await assertRevert(createGame(player1, player2, ROCK), "duplicate game")
    })


    it('play hands', async function() {
      let receipt = await createGame(player1, player2, ROCK);
      const gameId = receipt.logs[0].args.gameId;

      // await sendHand(gameId, player1, ROCK);
      await sendHand(gameId, player2, PAPER);
      
      const [hand, seed] = secrets[gameId];
      receipt = await finishGame(gameId, hand, seed, player1);
      // let event = receipt.logs[0];
      assertEvent(
        receipt.logs[0],
        "Winner", 
        {
          gameId: gameId,
          winner: player2,
          reward: ether("0.002")
        }
      );
    })

    it('happy case with turns', async function() {
      let receipt = await createGame(player1, player2, PAPER);
      const gameId = receipt.logs[0].args.gameId;

      await sendHand(gameId, player2, PAPER);
      
      let [hand, seed] = secrets[gameId];
      receipt = await finishGame(gameId, hand, seed, player1);

      assertEvent(
        receipt.logs[0],
        "Tie", 
        {
          gameId: gameId,
          reward: ether("0.002")
        }
      );

      receipt = await continueGame(gameId, ROCK);
      
      await sendHand(gameId, player2, PAPER);

      [hand, seed] = secrets[gameId];
      receipt = await finishGame(gameId, hand, seed, player1);

      assertEvent(
        receipt.logs[0],
        "Winner", 
        {
          gameId: gameId,
          winner: player2,
          reward: ether("0.004")
        }
      );
    })

    it('should throw when finalize an already ended game', async function() {
      let receipt = await createGame(player1, player2, PAPER);
      const gameId = receipt.logs[0].args.gameId;

      await sendHand(gameId, player2, ROCK);
      
      [hand, seed] = secrets[gameId];
      receipt = await finishGame(gameId, hand, seed, player1);

      await assertRevert(finishGame(gameId, hand, seed, player1), "you can't finish this game");
    })

    it('should throw when fail fail to verify secret hand', async function() {
      const receipt = await createGame(player1, player2, PAPER);
      const gameId = receipt.logs[0].args.gameId;

      await sendHand(gameId, player2, ROCK);
      
      const [hand, _] = secrets[gameId];
      const [__, fakeSeed]  = getSecretHand(hand)
      await assertRevert(finishGame(gameId, hand, fakeSeed, player1), "cant verify hand");
    })

    it('should throw when fail fail to verify secret hand but let finish game later', async function() {
      let receipt = await createGame(player1, player2, PAPER);
      const gameId = receipt.logs[0].args.gameId;

      await sendHand(gameId, player2, ROCK);
      
      const [hand, seed] = secrets[gameId];
      const [_, fakeSeed]  = getSecretHand(hand)
      await assertRevert(finishGame(gameId, hand, fakeSeed, player1), "cant verify hand");
      receipt = await finishGame(gameId, hand, seed, player1)
      assertEvent(
        receipt.logs[0],
        "Winner", 
        {
          gameId: gameId,
          winner: player1
        }
      );
    })

    it('should not be able to finalize if player2 havent play yet', async function() {
      const receipt = await createGame(player1, player2, ROCK);
      const gameId = receipt.logs[0].args.gameId;
    
      const [hand, seed] = secrets[gameId];
      await assertRevert(finishGame(gameId, hand, seed, player1), "you can't finish this game");
    })

    it('should not be able to change your hand', async function() {
      const receipt = await createGame(player1, player2, ROCK);
      const gameId = receipt.logs[0].args.gameId;

      await assertRevert(sendHand(gameId, player1, ROCK), "you can't change your hand");
      await assertRevert(sendHand(gameId, player1, PAPER), "you can't change your hand");
      await sendHand(gameId, player2, PAPER);
      // await assertRevert(sendHand(gameId, player2, ROCK), "you can't play in this stage");
    })

    it('only games players can play in the game', async function() {
      const receipt = await createGame(player1, player2, ROCK);
      const gameId = receipt.logs[0].args.gameId;
      await assertRevert(sendHand(gameId, hacker, PAPER), "you can't play in this game");
    })

    it.skip('should throw when playing an ended game', async function() {
      let receipt = await createGame(player1, player2, PAPER);
      const gameId = receipt.logs[0].args.gameId;

      await sendHand(gameId, player2, ROCK);
      
      const [hand, seed] = secrets[gameId];
      receipt = await finishGame(gameId, hand,seed, player1);
      assert.equal(receipt.logs[0].event, "Winner");
      await assertRevert(sendHand(gameId, player2, SCISSORS), "you can't play in this stage");
    })
    
    // it('should not be able to change your hand', async function() {
    //   let receipt = await createGame(player1, player2, );
    //   const gameId = receipt.logs[0].args.gameId;

    //   await sendHand(gameId, player1, PAPER);
    //   await assertRevert(sendHand(gameId, player1, ROCK), "you can't change your hand");
    //   await sendHand(gameId, player2, SCISSORS);
    //   await assertRevert(sendHand(gameId, player1, ROCK), "you can't change your hand");
    //   await assertRevert(sendHand(gameId, player2, PAPER), "you can't change your hand");
    //   receipt = await finishGame(gameId);
    //   assert.equal(receipt.logs[0].event, "Winner");
    //   assert.equal(receipt.logs[0].args.winner, player2);
    // })

    it('should result in a tie', async function() {
      let receipt = await createGame(player1, player2, PAPER);
      const gameId = receipt.logs[0].args.gameId;

      await sendHand(gameId, player2, PAPER);
      const [hand, seed] = secrets[gameId];
      receipt = await finishGame(gameId, hand, seed, player1);
      assert.equal(receipt.logs[0].event, "Tie");
    })

    it('should be able to continue a tied game', async function() {
      let receipt = await createGame(player1, player2, PAPER);
      const gameId = receipt.logs[0].args.gameId;

      await sendHand(gameId, player2, PAPER);
      let [hand, seed] = secrets[gameId];
      receipt = await finishGame(gameId, hand, seed, player1);
      assert.equal(receipt.logs[0].event, "Tie");

      await continueGame(gameId, ROCK);
      await sendHand(gameId, player2, SCISSORS);
      [hand, seed] = secrets[gameId];
      receipt = await finishGame(gameId, hand, seed, player1);
      assert.equal(receipt.logs[0].event, "Winner");
    })

    it('should handle multiple consecutive games between same players', async function() {
      let receipt = await createGame(player1, player2, PAPER);
      const gameId = receipt.logs[0].args.gameId;

      await sendHand(gameId, player2, PAPER);
      let [hand, seed] = secrets[gameId];
      receipt = await finishGame(gameId, hand, seed, player1);
      assert.equal(receipt.logs[0].event, "Tie");

      await continueGame(gameId, ROCK);
      await sendHand(gameId, player2, ROCK);
      [hand, seed] = secrets[gameId];
      receipt = await finishGame(gameId, hand, seed, player1);
      assert.equal(receipt.logs[0].event, "Tie");

      await continueGame(gameId, ROCK);
      await sendHand(gameId, player2, PAPER);
      [hand, seed] = secrets[gameId];
      receipt = await finishGame(gameId, hand, seed, player1);
      assert.equal(receipt.logs[0].event, "Winner");

      receipt = await createGame(player1, player2, ROCK);
      let gameId2 = receipt.logs[0].args.gameId;
      assert.equal(gameId, gameId2);

      await sendHand(gameId, player2, PAPER);
      [hand, seed] = secrets[gameId];
      receipt = await finishGame(gameId, hand, seed, player1);
      assert.equal(receipt.logs[0].event, "Winner");

      receipt = await createGame(player1, player2, ROCK);
      gameId2 = receipt.logs[0].args.gameId;
      assert.equal(gameId, gameId2);

      await sendHand(gameId, player2, SCISSORS);
      [hand, seed] = secrets[gameId];
      receipt = await finishGame(gameId, hand, seed, player1);
      assert.equal(receipt.logs[0].event, "Winner");
    })

    it('should force finish a game', async function() {
      let receipt = await createGame(player1, player2, ROCK);
      const gameId = receipt.logs[0].args.gameId;
      await increaseTime(60*60);
      receipt = await forceFinishGame(gameId, player1);
      assert.equal(receipt.logs[0].event, "ForceFinish");
    })

    it('should force finish a game', async function() {
      let receipt = await createGame(player1, player2, ROCK);
      const gameId = receipt.logs[0].args.gameId;

      const [hand, seed] = secrets[gameId];
      await assertRevert(finishGame(gameId, hand,seed, player1), "you can't finish this game");
      await increaseTime(60*60);
      receipt = await forceFinishGame(gameId, player1);
      assert.equal(receipt.logs[0].event, "ForceFinish");
    })

    it('should throw when the game is not expired', async function() {
      let receipt = await createGame(player1, player2, ROCK);
      const gameId = receipt.logs[0].args.gameId;
      await assertRevert(forceFinishGame(gameId, hacker), "game is not expired yet");
    })

    it('should throw when third parties try to force finish a game', async function() {
      let receipt = await createGame(player1, player2, ROCK);
      const gameId = receipt.logs[0].args.gameId;
      await increaseTime(60*60);
      await assertRevert(forceFinishGame(gameId, hacker), "only players can force finish");
    })

    it.skip('should distribute games reward', async function() {
      let receipt = await createGame(player1, player2, ROCK);
      const gameId = receipt.logs[0].args.gameId;
      await increaseTime(60*60);
      const previousBalance = await web3.eth.getBalance(player1);
      await forceFinishGame(gameId, player1);
      const currentBalance = await web3.eth.getBalance(player1);
      console.log(currentBalance <= previousBalance);
      // assert.isBelow(currentBalance, previousBalance);
    })
  })

})
