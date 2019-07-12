var GameContract = artifacts.require("GameContract");

module.exports = function(deployer) {
  deployer.deploy(GameContract);
};
