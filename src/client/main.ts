var gameDatas: Game[] = [];

function start() {
    createGame("myCanvas");
}

function startMore(){
    let nextCssId = "myCanvas_" + gameDatas.length.toString();
    let canvasHTML = `<canvas id="${nextCssId}" width="400" height="300" style="border:1px solid #000000;"></canvas>`;
    document.body.insertAdjacentHTML("beforeend", canvasHTML);
    createGame(nextCssId);
}

function createGame(canvasElementId: string){
    let c: HTMLCanvasElement | null = document.getElementById(canvasElementId) as HTMLCanvasElement;
    if (c == null) throw new DOMException("canvas element not found");
    let ctx: CanvasRenderingContext2D | null = c.getContext("2d");
    if (ctx == null) throw new DOMException("CanvasRenderingContext2D element not found");

    const game = createDefaultGameData(c, ctx);
    gameDatas.push(game);
    document.addEventListener('keydown', (e) => keyDown(e, game), false);
    document.addEventListener('keyup', (e) => keyUp(e, game), false);

    gameInit(game);
    game.state.characters[0].hp = 0;
    runner(game);

    websocketConnect(game);
}

function runner(game: Game) {
    const tickInterval = 16;

    if(game.multiplayer.websocket === null){
        const timeNow = performance.now();
        while (!game.state.ended && timeNow > game.realStartTime + game.state.time) {
            tick(tickInterval, game);
        }    
    }else{
        while (!game.state.ended && game.multiplayer.serverGameTime >= game.state.time + tickInterval) {
            tick(tickInterval, game);
        }    
    }
    paintAll(game.ctx, game);
    setTimeout(() => runner(game), tickInterval);
}

function tick(gameTimePassed: number, game: Game) {
    if (!game.state.ended) {
        game.state.time += gameTimePassed;
        tickPlayerInputs(game.state.playerInputs, game.state.time, game);
        if(game.state.characters.length < 100){
            game.state.characters.push(createRandomEnemy(game));
        }
        tickCharacters(game.state.characters, game.state.projectiles);
        tickProjectiles(game.state.projectiles);
        detectProjectileToCharacterHit(game.state);
        detectCharacterDeath(game.state.characters, game.state, game.avaialbleUpgrades);
        if (gameEndedCheck(game)) endGame(game.state);
    }
}

function playerCharacterXpGain(state: GameState, killedCharacter: Character, upgradeOptions: Map<string, UpgradeOption>){
    let playerCharacters: LevelingCharacter[] = getPlayerCharacters(state.characters) as LevelingCharacter[];
    for(let i = 0; i<playerCharacters.length; i++){
        if(playerCharacters[i].experience !== undefined){
            playerCharacters[i].experience += killedCharacter.experienceWorth;
            if(playerCharacters[i].experience >= playerCharacters[i].experienceForLevelUp){
                levelingCharacterLevelUp(playerCharacters[i], state, upgradeOptions);
            }
        }
    }
}

function detectCharacterDeath(characters: Character[], state: GameState,  upgradeOptions: Map<string, UpgradeOption>){
    for (let charIt = characters.length - 1; charIt >= 0; charIt--) {
        if (characters[charIt].hp <= 0) {
            if(characters[charIt].faction === "enemy"){
                playerCharacterXpGain(state, characters[charIt], upgradeOptions);
                state.killCounter++;
            }
            characters.splice(charIt, 1);
        }
    }
}

function tickPlayerInputs(playerInputs: PlayerInput[], currentTime: number, game: Game) {
    for (let i = playerInputs.length - 1; i >= 0; i--) {
        if (playerInputs[i].executeTime <= currentTime) {
            if (playerInputs[i].command === "playerInput") {
                if (playerInputs[i].executeTime <= currentTime - 16) {
                    console.log("playerAction to late", currentTime - playerInputs[i].executeTime, playerInputs[i]);
                }
                playerAction(playerInputs[i].data.playerIndex, playerInputs[i].data.action, playerInputs[i].data.isKeydown, game);
                playerInputs.splice(i,1);
            }
        }
    }
}

function endGame(state: GameState) {
    state.ended = true;
    state.highscores.scores.push(state.killCounter);
    state.highscores.scores.sort((a, b) => b - a);
    if (state.highscores.scores.length > state.highscores.maxLength) {
        state.highscores.scores.pop();
    }
}

function gameEndedCheck(game: Game) {
    let alivePlayersCount = countAlivePlayers(game.state.characters)
    if(alivePlayersCount === 0){
        return true;
    }
    return false;
}

function countAlivePlayers(characters: Character[]){
    let counter = 0;
    for (let charIt = characters.length - 1; charIt >= 0; charIt--) {
        if(characters[charIt].faction === "player") counter++;
    }
    return counter;
}

function detectProjectileToCharacterHit(state: GameState) {
    let characters: Character[] = state.characters;

    for (let projIt = 0; projIt < state.projectiles.length; projIt++) {
        let projectile = state.projectiles[projIt];
        for (let charIt = characters.length - 1; charIt >= 0; charIt--) {
            let c = characters[charIt];
            if (c.faction === projectile.faction) continue;
            let distance = calculateDistance(c, projectile);
            if (distance < projectile.size + c.size) {
                c.hp -= projectile.damage;
            }
        }
    }
}

function calculateDistance(objectA: {x:number, y:number}, objectB: {x:number, y:number}){
    let xDiff = objectA.x - objectB.x;
    let yDiff = objectA.y - objectB.y;
    return Math.sqrt(xDiff * xDiff + yDiff * yDiff);
}

function handleCommand(game: Game, data: any){
    if (game.multiplayer.websocket === null) {
        data.executeTime = game.state.time+1;
        executeCommand(game, data);
    } else {
        game.multiplayer.websocket.send(JSON.stringify(data));
    }    
}

function executeCommand(game: Game, data: any) {
    const command = data.command;
    switch (command) {
        case "restart":
            gameRestart(game);
            break;
        case "playerInput":
            game.state.playerInputs.push(data);
            break;
        case "sendGameState":
            game.state.clientIds.push(data.clientId);
            game.multiplayer.websocket!.send(JSON.stringify({ command: "gameState", data: game.state }));
            break;
        case "gameState":
            game.state = data.data;
            game.realStartTime = performance.now() - game.state.time;
            for (let i = 0; i < game.state.clientIds.length; i++) {
                if (game.multiplayer.myClientId === game.state.clientIds[i]) {
                    game.clientKeyBindings = [{
                        playerIndex: i,
                        keyCodeToActionPressed: createDefaultKeyBindings1()
                    }];
                }
            }
            break;
        case "connectInfo":
            game.multiplayer.myClientId = data.clientId;
            game.state.clientIds = [data.clientId];
            break;
        case "playerLeft":
            for (let i = 0; i < game.state.clientIds.length; i++) {
                if (game.state.clientIds[i] === data.clientId) {
                    console.log("client removed", game.state.clientIds[i]);
                    game.state.clientIds.splice(i, 1);
                    break;
                }
            }
            break;
        case "timeUpdate":
            game.multiplayer.serverGameTime = data.time;
            break;
        default:
            console.log("unkown command: " + command, data);
    }
}