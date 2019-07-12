I used the create-react-app repo as a template for this project.

### `npm start`

Runs the app in the development mode.<br>
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The smart contracts supports multiple games but this frontend only supports two wallets playing at the same time. You'll have to open your browser's console to get see some output.

You need to place the player2's address in the first input text to create a game.
After the game is created and you got the game's id you can play your hand and wait until the other player have played. Once both players have played their hands, anyone can call finishGame and see the results.



The contract is deployed at 0x37ab2a8f0c44099eac4baa5317e8845de4dfd6fc on the Rospten test network, you need to change your network in metamask in order to play.
