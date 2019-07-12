pragma solidity ^0.5.1;

contract Migrations {
  address public owner;
  uint public last_completed_migration;

  constructor() public {
    owner = msg.sender;
  }

  function setCompleted(uint completed) public {
    last_completed_migration = completed;
  }

  function upgrade(address new_address) public  {
    Migrations upgraded = Migrations(new_address);
    upgraded.setCompleted(last_completed_migration);
  }
}