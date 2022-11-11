type Character = {
    x: number,
    y: number,
    size: number,
    color: string,
    moveSpeed: number,
    moveDirection: number,
    isMoving: boolean,
    hp: number,
    damage: number
}

function paintCharacter(ctx: CanvasRenderingContext2D, character: Character) {
    ctx.fillStyle = character.color;
    ctx.beginPath();
    ctx.arc(character.x, character.y, character.size, 0, 2 * Math.PI);
    ctx.fill();
}

function paintCharacters(ctx: CanvasRenderingContext2D) {
    for (let i = 0; i < gameData.enemies.length; i++) {
        paintCharacter(ctx, gameData.enemies[i]);
    }
    paintCharacter(ctx, gameData.player);
}

function shot(character: Character) {
    gameData.projectiles.push(createProjectile(character.x, character.y, character.moveDirection, character.damage));
}

function tickCharacters() {
    for (let i = 0; i < gameData.enemies.length; i++) {
        //        tickCharacter(gameData.enemies[i]);
    }
    tickCharacter(gameData.player);
    movePlayerTick();
}

function tickCharacter(character: Character) {
    shot(character);
}

function movePlayerTick() {
    determinePlayerMoveDirection();
    let player = gameData.player;
    if (player.isMoving) {
        player.x += Math.cos(player.moveDirection) * player.moveSpeed;
        player.y += Math.sin(player.moveDirection) * player.moveSpeed;
    }
}

function spawnEnemy() {
    let x = Math.random() * gameData.canvasElement.width;
    let y = Math.random() * gameData.canvasElement.height;
    gameData.enemies.push(createEnemy(x, y));
}

function createEnemy(x: number, y:number){
    return {
        x: x,
        y: y,
        size: 5,
        color: "black",
        moveSpeed: 1,
        moveDirection: 0,
        isMoving: false,
        hp: 10,
        damage: 5,
    }
}

function determinePlayerMoveDirection() {
    let keys = gameData.keysPressed;
    gameData.player.isMoving = true;
    if (keys.a && !keys.w) {
        if (!keys.s) {
            gameData.player.moveDirection = Math.PI;
        } else {
            gameData.player.moveDirection = Math.PI * 0.75;
        }
    } else if (keys.s) {
        if (!keys.d) {
            gameData.player.moveDirection = Math.PI * 0.5;
        } else {
            gameData.player.moveDirection = Math.PI * 0.25;
        }
    } else if (keys.d) {
        if (!keys.w) {
            gameData.player.moveDirection = 0;
        } else {
            gameData.player.moveDirection = Math.PI * 1.75;
        }
    } else if (keys.w) {
        if (!keys.a) {
            gameData.player.moveDirection = Math.PI * 1.5;
        } else {
            gameData.player.moveDirection = Math.PI * 1.25;
        }
    } else {
        gameData.player.isMoving = false;
    }
}