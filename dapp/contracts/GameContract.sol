pragma solidity ^0.5.1;

contract GameContract {

    enum Hand { NONE, Rock, Paper, Scissors }

    struct Game {
        address payable player1;
        address payable player2;

        uint expiration;

        uint status;

        // Hand player1Hand;
        uint player2Hand;
        bytes32 player1SecretHand;
        // bytes32 player2SecretHand;

        uint fee;
        uint reward;
        uint winner;
        uint round;

    }

    uint public constant GAME_DURATION = 15 minutes;

    mapping (uint => mapping (uint => uint)) public rules;
    mapping (bytes32 => Game) games;

    event GameCreated(bytes32 gameId, address player1, address player2, uint fee);
    event ForceFinish(bytes32 gameId, address caller);
    event Winner(bytes32 gameId, address winner, uint reward);
    event NextRound(bytes32 gameId, uint round, uint reward);
    event Tie(bytes32 gameId, uint reward);

    constructor() public {
        setRules();
    }

    function validHand(uint hand) public pure returns (bool) {
        return hand > 0 && hand <= 3;
    }

    /**
    * @dev Creates a game
    * @param _player2 - address of the player2
    * @param _secretHand - bytes32 of the player1's secret hand
    */
    function createGame(address payable _player2, bytes32 _secretHand) public payable returns (bytes32) {
        address payable player1 = msg.sender;
        bytes32 gameId = keccak256(abi.encodePacked(player1, _player2));

        Game storage game = games[gameId];

        require(player1 != _player2, "you cannot play with yourself");
        require(game.status == 0 || game.status == 4, "duplicate game");
        uint fee = msg.value;

        // TODO : Maybe using delete games[gameId] is better.
        games[gameId].player1 = player1;
        games[gameId].player2 = _player2;
        games[gameId].player1SecretHand = _secretHand;
        games[gameId].expiration = now + GAME_DURATION;
        games[gameId].fee = fee;
        games[gameId].reward = fee;
        games[gameId].winner = 0;
        games[gameId].status = 1;
        games[gameId].round = 0;
        emit GameCreated(gameId, player1, _player2, fee);

        return gameId;
    }

    /**
    * @dev Receives a player's secret hand.
    * @param _gameId - bytes32 of the game's id
    * @param _hand - uint of the hand
    */
    function sendHand(bytes32 _gameId, uint _hand) public payable returns (bool) {
        require(isValidHand(_hand), "invalid hand");
        Game storage game = games[_gameId];
        require(game.status == 1, "you can't play in this stage");
        if (game.player1 == msg.sender) {
            revert("you can't change your pick");
        } else if (game.player2 == msg.sender) {
            require(game.player2Hand == uint(Hand.NONE), "you can't change your pick");
        } else {
            revert("you can't play in this game");
        }
        uint reward = _payFee(_gameId);

        game.reward = reward;
        game.status = 2;
        game.player2Hand = _hand;

        return true;
    }

    /**
    * @dev Retrieves the winner for a given combination of hands.
    * @param hand1 - uint of player1's hand
    * @param hand2 - uint of player2's hand
    */
    function play(uint hand1, uint hand2) public view returns (uint) {
        return rules[hand1][hand2];
    }

    function verifyHand(bytes32 secretHand, uint hand, uint256 seed) public pure returns (bool) {
        bytes32 verification = keccak256(abi.encodePacked(hand, seed));
        return secretHand == verification;
    }

    /**
    * @dev Finish a game.
    * @param _gameId - bytes32 of the game's id
    */
    function finishGame(bytes32 _gameId, uint _hand, uint256 _seed) public payable returns (bool) {
        Game storage game = games[_gameId];

        require(game.status == 2, "you can't finish this game");
        require(verifyHand(game.player1SecretHand, _hand, _seed), "cant verify hand");

        uint hand1 = _hand;
        uint hand2 = game.player2Hand;
        uint winner = play(hand1, hand2);

        if (winner == 0) {
            // it's a tie
            game.status = 3;
            emit Tie(_gameId, game.reward);
            return false;
        } else {
            // there's a winner
            address payable winnerAddress;
            game.winner = winner;
            // send the game's reward to the winner
            if (winner == 1) {
                winnerAddress = game.player1;
            } else {
                winnerAddress = game.player2;
            }
            winnerAddress.transfer(game.reward);
            game.status = 4;
            emit Winner(_gameId, winnerAddress, game.reward);
            return true;
        }

        // finalize game if expired.
    }

    /**
    * @dev Receives player1's secret hand.
    * @param _gameId - bytes32 of the game's id
    * @param _secretHand - bytes32 of the player1's secret hand
    */
    function continueGame(bytes32 _gameId, bytes32 _secretHand) public payable {
        Game storage game = games[_gameId];
        require(game.status == 3, "invalid status");

        uint reward = _payFee(_gameId);
        games[_gameId].player1SecretHand = _secretHand;
        games[_gameId].player2Hand = uint(Hand.NONE);
        games[_gameId].expiration = games[_gameId].expiration + GAME_DURATION;
        games[_gameId].status = 1;
        games[_gameId].reward = reward;
        games[_gameId].round = games[_gameId].round + 1;
        emit NextRound(_gameId, games[_gameId].round, reward);
    }

    /**
    * @dev Force finish a game.
    * @param _gameId - bytes32 of the game's id
    */
    function forceFinishGame(bytes32 _gameId) public returns (bool) {
        Game storage game = games[_gameId];
        require(isGameExpired(game.expiration), "game is not expired yet");
        require(game.player1 == msg.sender || game.player2 == msg.sender, "only players can force finish");

        // TODO: no contempla rondas
        if (game.status == 1) {
            game.player1.transfer(game.reward);
        } else if (game.status == 2 || game.status == 3) {
            game.player1.transfer(game.reward / 2);
            game.player2.transfer(game.reward / 2);
        }
        game.status = 4;
        emit ForceFinish(_gameId, msg.sender);
        return true;
    }

    function isGameExpired(uint expiration) private view returns (bool) {
        return expiration >= now;
    }

    function _payFee(bytes32 _gameId) private returns (uint) {
        Game memory game = games[_gameId];
        require(msg.value >= game.fee, "you need to pay game's fee");
        // TODO : secure math
        return game.reward + msg.value;
    }

    function isValidHand(uint _hand) public pure returns (bool) {
        return _hand >= 1 && _hand <= 3;
    }

    /**
    * @dev Setup the rule's matrix
    */
    function setRules() private {
        uint rock = uint(Hand.Rock);
        uint paper = uint(Hand.Paper);
        uint scissors = uint(Hand.Scissors);

        rules[rock][rock] = 0;
        rules[rock][paper] = 2;
        rules[rock][scissors] = 1;
        rules[paper][rock] = 1;
        rules[paper][paper] = 0;
        rules[paper][scissors] = 2;
        rules[scissors][rock] = 2;
        rules[scissors][paper] = 1;
        rules[scissors][scissors] = 0;
    }

    // helpers


    function getGame(bytes32 gameId)
        public
        view
        returns (
        address payable player1,
        address payable player2,
        uint expiration,
        bytes32 player1SecretHand,
        uint player2Hand,
        uint fee,
        uint reward,
        uint winner,
        uint status
    ) {
        Game memory game = games[gameId];
        player1 = game.player1;
        player2 = game.player2;
        expiration = game.expiration;
        player1SecretHand = game.player1SecretHand;
        player2Hand = game.player2Hand;
        fee = game.fee;
        reward = game.reward;
        winner = game.winner;
        status = game.status;
    }

    /**
        Deletes a game, only for debugging purposes
    */
    function deleteGame(bytes32 gameId) public {
        delete games[gameId];
    }

}
