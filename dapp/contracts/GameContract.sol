pragma solidity ^0.5.1;

contract GameContract {

    enum Hand { NONE, Rock, Paper, Scissors }

    struct Game {
        address payable player1;
        address payable player2;

        uint expiration;

        // Hand player1Choice;
        // Hand player2Choice;
        bytes32 player1SecretHand;
        bytes32 player2SecretHand;

        uint fee;
        uint bet;
        uint winner;

        // FIXME: false is a valid state
        bool finalized;
    }

    uint public constant GAME_DURATION = 60 minutes;

    mapping (uint => mapping (uint => uint)) public rules;
    mapping (bytes32 => Game) games;

    event GameCreated(bytes32 gameId, address player1, address player2, uint fee);
    event Winner(bytes32 gameId, address winner, uint reward);
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
    * @param _fee - uint of the the game's fee in wei
    */
    function createGame(address payable _player2, bytes32 _secretHand, uint _fee) public returns (bytes32) {
        address payable player1 = msg.sender;
        bytes32 gameId = keccak256(abi.encodePacked(player1, _player2));

        Game storage game = games[gameId];

        require(player1 != _player2, "you cannot play with yourself");

        if (game.finalized == false && game.winner == 0 && game.player1 == player1) {
            revert("duplicate game");
        }

        // TODO : Maybe using delete games[gameId] is better.
        games[gameId].player1 = player1;
        games[gameId].player2 = _player2;
        games[gameId].player1SecretHand = _secretHand;
        games[gameId].expiration = now + GAME_DURATION;
        games[gameId].fee = _fee;
        games[gameId].bet = 0;
        games[gameId].winner = 0;
        games[gameId].finalized = false;
        emit GameCreated(gameId, player1, _player2, _fee);

        return gameId;
    }

    /**
    * @dev Receives a player's secret hand.
    * @param _gameId - bytes32 of the game's id
    * @param _secretHand - bytes32 of the player's secret hand
    */
    function sendHand(bytes32 _gameId, bytes32 _secretHand) public payable returns (bool) {
        Game storage game = games[_gameId];
        require(game.finalized == false, "the game already ended");
        require(msg.value >= game.fee, "you have to pay the game's fee");
        if (game.player1 == msg.sender) {
            require(game.player1SecretHand == 0, "you can't change your pick");
        } else if (game.player2 == msg.sender) {
            require(game.player2SecretHand == 0, "you can't change your pick");
        } else {
            revert("you can't play in this game");
        }

        // TODO : secure math
        game.bet = game.bet + msg.value;

        if (game.player1 == msg.sender) {
            game.player1SecretHand = _secretHand;
        } else {
            game.player2SecretHand = _secretHand;
        }
        return true;
    }

    /**
    * @dev Retrieves the winner for a given combination of hands.
    * @param _hand1 - uint of player1's hand
    * @param _hand2 - uint of player2's hand
    */
    function play(uint hand1, uint hand2) public pure returns (uint) {
        return rules[hand1][hand2];
    }

    /**
    * @dev Finish a game.
    * @param _gameId - bytes32 of the game's id
    */
    function finishGame(bytes32 _gameId) public payable returns (bool) {
        Game storage game = games[_gameId];

        require(game.finalized == false, "the game already ended");
        require(game.player1Choice != Hand.NONE, "player 1 haven't play yet");
        require(game.player2Choice != Hand.NONE, "player 2 haven't play yet");

        uint winner = play(_gameId);

        if (winner == 0) {
            // it's a tie, restart game state.
            game.player1Choice = Hand.NONE;
            game.player2Choice = Hand.NONE;
            emit Tie(_gameId, game.bet);
            return false;
        } else {
            // there's a winner, so we finish the game
            game.finalized = true;

            address payable winnerAddress;
            game.winner = winner;
            // send the reward to the winner
            if (winner == 1) {
                winnerAddress = game.player1;
            } else {
                winnerAddress = game.player2;
            }
            winnerAddress.transfer(game.bet);

            emit Winner(_gameId, winnerAddress, game.bet);
            return true;
        }

        // finalize game if expired.
    }

    /**
        Setup the rock, paper, scissors rules.
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
        Hand player1Choice,
        Hand player2Choice,
        uint fee,
        uint bet,
        uint winner,
        bool finalized
    ) {
        Game memory game = games[gameId];
        player1 = game.player1;
        player2 = game.player2;
        expiration = game.expiration;
        player1Choice = game.player1Choice;
        player2Choice = game.player2Choice;
        fee = game.fee;
        bet = game.bet;
        winner = game.winner;
        finalized = game.finalized;
    }

    /**
        Deletes a game, only for debugging purposes
    */
    function deleteGame(bytes32 gameId) public {
        delete games[gameId];
    }

}
