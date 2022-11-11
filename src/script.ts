type GameData = {
    canvasElement: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    player:PlayerData,
    keysPressed: KeysPressed,
}

type PlayerData = {
    x: number,
    y: number,
    size: number,
    color: string,
    moveSpeed: number,
    moveDirection: number,
    isMoving: boolean
}

type KeysPressed = {
    a: boolean,
    s: boolean,
    d: boolean,
    w: boolean
}


var gameData: GameData; 

function start(){
    document.addEventListener('keydown', keyDown, false);
    document.addEventListener('keyup', keyUp, false);
    let c: HTMLCanvasElement | null = document.getElementById("myCanvas") as HTMLCanvasElement;
    if(c == null) throw new DOMException("canvas element not found");
    let ctx: CanvasRenderingContext2D | null = c.getContext("2d");
    if(ctx == null) throw new DOMException("CanvasRenderingContext2D element not found");

    gameData = {
        canvasElement: c,
        ctx: ctx,
        player: {
            x: 100,
            y: 100,
            size: 10,
            color: "blue",
            moveSpeed: 2,
            moveDirection: 0,
            isMoving: false,
        },
        keysPressed: {
            a: false,
            s: false,
            d: false,
            w: false
        }
    }
    
    setTimeout(tick, 16);
}

function tick(){
    movePlayerTick();
    paintAll();

    setTimeout(tick, 16);
}

function movePlayerTick(){
    determinePlayerMoveDirection();
    let player = gameData.player;
    if(player.isMoving){
        player.x += Math.cos(player.moveDirection) * player.moveSpeed;
        player.y += Math.sin(player.moveDirection) * player.moveSpeed;
    }
}

function determinePlayerMoveDirection(){
    let keys = gameData.keysPressed;
    gameData.player.isMoving = true;
    if(keys.a && !keys.w){
        if(!keys.s){
            gameData.player.moveDirection = Math.PI;
        }else{
            gameData.player.moveDirection = Math.PI * 0.75;
        }
    } else if(keys.s){
        if(!keys.d){
            gameData.player.moveDirection = Math.PI * 0.5;
        }else{
            gameData.player.moveDirection = Math.PI * 0.25;
        }
    } else if(keys.d){
        if(!keys.w){
            gameData.player.moveDirection = 0;
        }else{
            gameData.player.moveDirection = Math.PI * 1.75;
        }
    } else if(keys.w){
        if(!keys.a){
            gameData.player.moveDirection = Math.PI * 1.5;
        }else{
            gameData.player.moveDirection = Math.PI * 1.25;
        }
    } else {
        gameData.player.isMoving = false;
    }
}

function paintAll(){
    paintBackground(gameData.ctx);
    paintPlayer(gameData.ctx);
}

function paintPlayer(ctx: CanvasRenderingContext2D){
    ctx.fillStyle = gameData.player.color;
    ctx.beginPath();
    ctx.arc(gameData.player.x, gameData.player.y, gameData.player.size, 0, 2 * Math.PI);
    ctx.fill();
}

function paintBackground(ctx: CanvasRenderingContext2D){
    ctx.fillStyle = "green";
    ctx.fillRect(0, 0, 400, 300);
}

function keyDown(event: KeyboardEvent){
    var name = event.key;
    switch(name){
        case "a":
            gameData.keysPressed.a = true;
            break;
        case "s":
            gameData.keysPressed.s = true;
            break;
        case "d":
            gameData.keysPressed.d = true;
            break;
        case "w":
            gameData.keysPressed.w = true;
            break;
        default:
            console.log(`Key pressed ${name}`, event);            
    }
}

function keyUp(event: KeyboardEvent){
    var name = event.key;
    switch(name){
        case "a":
            gameData.keysPressed.a = false;
            break;
        case "s":
            gameData.keysPressed.s = false;
            break;
        case "d":
            gameData.keysPressed.d = false;
            break;
        case "w":
            gameData.keysPressed.w = false;
            break;
    }
}