var gameData: Game; 

function start(){
    document.addEventListener('keydown', keyDown, false);
    document.addEventListener('keyup', keyUp, false);
    let c: HTMLCanvasElement | null = document.getElementById("myCanvas") as HTMLCanvasElement;
    if(c == null) throw new DOMException("canvas element not found");
    let ctx: CanvasRenderingContext2D | null = c.getContext("2d");
    if(ctx == null) throw new DOMException("CanvasRenderingContext2D element not found");

    gameData = createDefaultGameData(c, ctx);
    setTimeout(tick, 16);
}

function tick(){
    if(!gameData.ended){
        spawnEnemy();
        tickCharacters();
        tickProjectiles(gameData.projectiles);
        detectProjectileToCharacterHit(gameData);    
        if(gameData.startTime + gameData.maxTime - performance.now() < 0){
            gameData.ended = true;
            gameData.highscore.scores.push(gameData.killCounter);
            gameData.highscore.scores.sort((a,b)=>b-a);
            if(gameData.highscore.scores.length > gameData.highscore.maxLength){
                gameData.highscore.scores.pop();
            }
        }
    }

    paintAll(gameData.ctx);
    setTimeout(tick, 16);
}

function paintAll(ctx: CanvasRenderingContext2D){
    paintBackground(ctx);
    paintCharacters(ctx);
    paintProjectiles(ctx, gameData.projectiles);
    paintKillCounter(ctx);
    if(gameData.ended){
        paintHighscoreBoard(gameData.ctx);
    }else{
        paintTimeLeft(ctx);
    }
}

function paintHighscoreBoard(ctx: CanvasRenderingContext2D){
    ctx.fillStyle = "white";
    ctx.font = "18px Arial";

    ctx.fillText("Restart with Key \"R\" ", 150, 20);
    ctx.fillText("Scores: ", 150, 60);
    for(let i = 0; i < gameData.highscore.scores.length; i++){
        ctx.fillText((i+1) + ": " + gameData.highscore.scores[i], 150, 80 + 20*i);
    }
}



function paintTimeLeft(ctx: CanvasRenderingContext2D){
    ctx.fillStyle = "white";
    ctx.font = "18px Arial";
    let timeLeft = Math.round((gameData.startTime + gameData.maxTime - performance.now()) / 1000);
    ctx.fillText("Timer: " + timeLeft, 10, 40);
}

function paintKillCounter(ctx: CanvasRenderingContext2D){
    ctx.fillStyle = "white";
    ctx.font = "18px Arial";
    ctx.fillText("Kills: " + gameData.killCounter, 10, 20);
}

function paintBackground(ctx: CanvasRenderingContext2D){
    ctx.fillStyle = "green";
    ctx.fillRect(0, 0, 400, 300);
}

function detectProjectileToCharacterHit(gameData: Game){
    let characters: Character[] = gameData.enemies;

    for(let projIt = 0; projIt < gameData.projectiles.length; projIt++){
        let projectile = gameData.projectiles[projIt];
        for(let charIt = characters.length - 1; charIt >= 0; charIt--){
            let c = characters[charIt];
            let xDiff = c.x - projectile.x;        
            let yDiff = c.y - projectile.y;
            let distance = Math.sqrt(xDiff * xDiff + yDiff * yDiff);
            if(distance < projectile.size + c.size){
                c.hp -= projectile.damage;
                if(c.hp < 0){
                    gameData.enemies.splice(charIt, 1);
                    gameData.killCounter++;
                }
            }
        }
    }
}
