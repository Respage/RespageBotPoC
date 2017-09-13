## Bot Development
### Local Testing
1. Download and install the [BotBuilder Emulator](https://github.com/Microsoft/BotFramework-Emulator/releases/tag/v3.5.31)
2. Clone this git repo using `git clone https://github.com/Respage/RespageBotPoC.git`
3. Change directory to `/messages` and run `npm install`
4. Once npm modules are installed, run `node index.js`
5. Open BotBuilder Emulator and connect to `http://localhost:3978/api/messages`
6. Start chatting! You should see requests in your logs showing `200` status codes

### Continuous Integration
Changes to this repo will automatically deploy to Azure.

## Client Development
### Local Testing
1. Change directory to `/client`
2. Install npm modules `npm install`
1. Build the project: `npm run build`
2. Start a web server: `npm run start`
3. Aim your browser at `http://localhost:8000/samples/backchannel?[parameters as listed below]`

For ease of testing, several parameters can be set in the query string:
  * s = Direct Line secret, or
  * t = Direct Line token (obtained by calling Direct Line's Generate Token)
  * domain = optionally, the URL of an alternate Direct Line endpoint
  * webSocket = set to 'true' to use WebSocket to receive messages (currently defaults to false)
  * userid, username = id (and optionally name) of bot user
  * botid, botname = id (and optionally name) of bot
