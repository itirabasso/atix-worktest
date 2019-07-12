usePlugin("@nomiclabs/buidler-web3")
usePlugin("@nomiclabs/buidler-truffle5")
usePlugin("@nomiclabs/buidler-ethers")

// task("accounts", "Prints a list of the available accounts", async () => {
//   const accounts = await ethereum.send("eth_accounts");

//   console.log("Accounts:", accounts);
// });

// task("transfer-token", "Transfer a ERC20 token", async ({tokenName, value}, env, runSuper) => {
//   // const accounts = await ethereum.send("eth_accounts");
//   // console.log("Accounts:", accounts);
//   console.log("Transfering " + value + " of " + tokenName + " ERC20 tokens.");
//   get
// }).addParam("tokenName").addParam("value");

module.exports = {
  networks: {
    develop: {
      url: "http://localhost:8545"
    },
    ropsten: {
      url: 'http://localhost:8545',
      chainId: 3,
      gas: 30000000,
      gasPrice: 40003330000,
      from: '94A9B184Fe1Ff30BbE33Ad1E97c15976c3FcaD96',
      accounts: "remote"
    }
  }
};

// 0x94A9B184Fe1Ff30BbE33Ad1E97c15976c3FcaD96
// 063c2f590daa94239bf980fad96dcbae699ca9aaf21249ceb225ecae817370c0
