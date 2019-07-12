require('babel-register')

module.exports = {
  solc: {
    optimizer: {
      enabled: true,
      runs: 200
    }
  },
  networks: {
    development: {
      host: 'localhost',
      port: 8545,
      network_id: 5777
    },
    ropsten: {
      host: 'localhost',
      port: 8545,
      network_id: 3,
      gas: 30000000,
      from: '0x62ba62ff92917edf8ac0386fa10e3b27950bce8d'
    }
  }
}
