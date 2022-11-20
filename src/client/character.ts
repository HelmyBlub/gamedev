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

function shoot(character: Character, projectiles: Projectile[]) {
    projectiles.push(createProjectile(character.x, character.y, character.moveDirection, character.damage, character.faction));
}

function tickCharacters(characters: Character[], projectiles: Projectile[]) {
    for (let i = 0; i < characters.length; i++) {
        if (characters[i].faction === "player") {
            tickCharacter(characters[i], projectiles);
            moveCharacterTick(characters[i]);
        }
    }
}

function tickCharacter(character: Character, projectiles: Projectile[]) {
    shoot(character, projectiles);
}

function moveCharacterTick(character: Character) {
    if (character.isMoving) {
        character.x += Math.cos(character.moveDirection) * character.moveSpeed;
        character.y += Math.sin(character.moveDirection) * character.moveSpeed;
    }
}

function createRandomEnemy(game: Game): Character {
    let x = nextRandom(game.state) * game.canvasElement.width;
    let y = nextRandom(game.state) * game.canvasElement.height;
    return createEnemy(x, y);
}

function createEnemy(x: number, y: number): Character {
    return createCharacter(x, y, 5, "black", 1, 10, 5, "enemy");
}

function createPlayerCharacter(x: number, y: number): Character {
    return createCharacter(x, y, 10, "blue", 2, 100, 10, "player");
}

function createCharacter(x: number, y: number, size: number, color: string, moveSpeed: number, hp: number, damage: number, faction: string): Character {
    return {
        x: x,
        y: y,
        size: size,
        color: color,
        moveSpeed: moveSpeed,
        moveDirection: 0,
        isMoving: false,
        hp: hp,
        damage: damage,
        faction: faction,
    };
}