type Game = {
    canvasElement: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    player: Character,
    enemies: Character[],
    projectiles: Projectile[],
    keysPressed: KeysPressed,
    killCounter: number,
    startTime: number,
    maxTime: number,
    ended: boolean,
    highscore: {
        scores:number[],
        maxLength: 10,
    },
}

function gameRestart() {
    gameData.enemies = [];
    gameData.projectiles = [];
    gameData.player = {
        x: 100,
        y: 100,
        size: 10,
        color: "blue",
        moveSpeed: 2,
        moveDirection: 0,
        isMoving: false,
        hp: 100,
        damage: 10,
    };
    gameData.killCounter = 0;
    gameData.startTime = performance.now();
    gameData.ended = false;
}

function createDefaultGameData(c: HTMLCanvasElement, ctx: CanvasRenderingContext2D): Game {
    return {
        canvasElement: c,
        ctx: ctx,
        projectiles: [],
        enemies: [],
        player: {
            x: 100,
            y: 100,
            size: 10,
            color: "blue",
            moveSpeed: 2,
            moveDirection: 0,
            isMoving: false,
            hp: 100,
            damage: 10,
        },
        keysPressed: {
            a: false,
            s: false,
            d: false,
            w: false
        },
        killCounter: 0,
        startTime: performance.now(),
        ended: false,
        maxTime: 5000,
        highscore: {
            scores:[],
            maxLength: 10,
        }
    }
}