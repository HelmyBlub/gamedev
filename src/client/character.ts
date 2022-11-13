type Character = {
    x: number,
    y: number,
    size: number,
    color: string,
    moveSpeed: number,
    moveDirection: number,
    isMoving: boolean,
    hp: number,
    damage: number,
    faction: string
}

function paintCharacter(ctx: CanvasRenderingContext2D, character: Character) {
    ctx.fillStyle = character.color;
    ctx.beginPath();
    ctx.arc(character.x, character.y, character.size, 0, 2 * Math.PI);
    ctx.fill();
}

function paintCharacters(ctx: CanvasRenderingContext2D, characters: Character[]) {
    for (let i = 0; i < characters.length; i++) {
        paintCharacter(ctx, characters[i]);
    }
}

function shoot(character: Character) {
    gameData.projectiles.push(createProjectile(character.x, character.y, character.moveDirection, character.damage, character.faction));
}

function tickCharacters(characters: Character[]) {
    for (let i = 0; i < characters.length; i++) {
        if(characters[i].faction === "player"){
            tickCharacter(characters[i]);
            movePlayerTick(characters[i]);
        }
    }
}

function tickCharacter(character: Character) {
    shoot(character);
}

function movePlayerTick(character: Character) {
    if (character.isMoving) {
        character.x += Math.cos(character.moveDirection) * character.moveSpeed;
        character.y += Math.sin(character.moveDirection) * character.moveSpeed;
    }
}

function createRandomEnemy() {
    let x = Math.random() * gameData.canvasElement.width;
    let y = Math.random() * gameData.canvasElement.height;
    return createEnemy(x, y);
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
        faction: "enemy"
    }
}

function createPlayerCharacter(x: number, y:number){
    return {
        x: x,
        y: y,
        size: 10,
        color: "blue",
        moveSpeed: 2,
        moveDirection: 0,
        isMoving: false,
        hp: 100,
        damage: 10,
        faction: "player",
    };
}