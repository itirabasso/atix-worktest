pragma solidity ^0.5.1;

contract GameContract {

    enum Hand { NONE, Rock, Paper, Scissors }

    struct Game {
        address payable player1;
        address payable player2;

        uint expiration;

        Hand player1Choice;
        Hand player2Choice;

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

    modifier validHand(uint hand) {
        require(hand > 0 && hand <= 3, "invalid hand");
        _;
    }

    function createGame(address payable _player2, uint _fee) public returns (bytes32) {
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
        games[gameId].player1Choice = Hand.NONE;
        games[gameId].player2Choice = Hand.NONE;
        // games[gameId].expiration = now + GAME_DURATION;
        games[gameId].fee = _fee;
        games[gameId].bet = 0;
        games[gameId].winner = 0;
        games[gameId].finalized = false;
        emit GameCreated(gameId, player1, _player2, _fee);

        return gameId;
    }

    /**

    */
    function sendHand(bytes32 _gameId, uint _hand) public payable validHand(_hand) returns (bool) {
        Game storage game = games[_gameId];
        require(game.finalized == false, "the game already ended");
        require(msg.value >= game.fee, "you need to bet some ether");
        if (game.player1 == msg.sender) {
            require(game.player1Choice == Hand.NONE, "you can't change your hand");
        } else if (game.player2 == msg.sender) {
            require(game.player2Choice == Hand.NONE, "you can't change your hand");
        } else {
            revert("you can't play in this game");
        }

        // TODO : secure math
        game.bet = game.bet + msg.value;

        if (game.player1 == msg.sender) {
            game.player1Choice = Hand(_hand);
        } else {
            game.player2Choice = Hand(_hand);
        }
        return true;
    }

    function play(bytes32 _gameId) public view returns (uint) {
        Game memory game = games[_gameId];
        return rules[uint(game.player1Choice)][uint(game.player2Choice)];
    }

    /**
        When both players have played their hands someone needs to call
          finishGame to check who win.
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
