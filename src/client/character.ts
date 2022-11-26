type Character = {
    x: number,
    y: number,
    size: number,
    color: string,
    moveSpeed: number,
    moveDirection: number,
    isMoving: boolean,
    hp: number,
    maxHp: number,
    damage: number,
    faction: string,
    experienceWorth: number,
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
    projectiles.push(createProjectile(character.x, character.y, character.moveDirection, character.damage, character.faction, character.moveSpeed+2));
}

function tickCharacters(characters: Character[], projectiles: Projectile[]) {
    for (let i = 0; i < characters.length; i++) {
        if (characters[i].faction === "player") {
            tickPlayerCharacter(characters[i], projectiles);
        }else if(characters[i].faction === "enemy"){
            tickEnemyCharacter(characters[i], getPlayerCharacters(characters));
        }
        moveCharacterTick(characters[i]);
    }
}

function getPlayerCharacters(characters: Character[]){
    let playerCharacters = [];
    for (let i = 0; i < characters.length; i++) {
        if (characters[i].faction === "player") {
            playerCharacters.push(characters[i]);
        }
    }
    return playerCharacters;
}

function tickPlayerCharacter(character: Character, projectiles: Projectile[]) {
    shoot(character, projectiles);
}

function tickEnemyCharacter(character: Character, playerCharacters: Character[]){
    let closestPlayer = determineClosestPlayer(character, playerCharacters)
    determineEnemyMoveDirection(character, closestPlayer);
    determineEnemyHitsPlayer(character, closestPlayer);
}

function determineEnemyHitsPlayer(character: Character, closestPlayer: Character | null){
    if(closestPlayer === null) return;
    
    let distance = calculateDistance(character, closestPlayer);
    if(distance <= character.size + closestPlayer.size){
        closestPlayer.hp -= character.damage;
    }
}

function determineClosestPlayer(character: Character, playerCharacters: Character[]){
    let minDistance: number = 0;
    let minDistancePlayerCharacter: Character | null = null;

    for(let i = 0; i< playerCharacters.length; i++){
        let distance = calculateDistance(character, playerCharacters[i]);
        if(minDistancePlayerCharacter === null || minDistance > distance){
            minDistance = distance;   
            minDistancePlayerCharacter = playerCharacters[i];
        }
    }
    return minDistancePlayerCharacter;
}

function determineEnemyMoveDirection(character: Character, closestPlayer: Character | null){
    if(closestPlayer === null){
        character.isMoving = false;
        return;
    } 
    character.isMoving = true;

    let yDiff = (character.y - closestPlayer.y);
    let xDiff = (character.x - closestPlayer.x);

    if(xDiff>=0){
        character.moveDirection = - Math.PI + Math.atan(yDiff/xDiff);
    }else if(yDiff<=0){
        character.moveDirection = - Math.atan(xDiff/yDiff)+ Math.PI/2;
    }else{
        character.moveDirection = - Math.atan(xDiff/yDiff)- Math.PI/2;
    }
}

function moveCharacterTick(character: Character) {
    if (character.isMoving) {
        character.x += Math.cos(character.moveDirection) * character.moveSpeed;
        character.y += Math.sin(character.moveDirection) * character.moveSpeed;
    }
}

function createRandomEnemy(game: Game): Character {
    let x,y;
    let hp = Math.floor(game.state.time / 100);

    if(nextRandom(game.state) < 0.5){
        x = Math.round(nextRandom(game.state)) * game.canvasElement.width;
        y = nextRandom(game.state) * game.canvasElement.height;        
    }else{
        x = nextRandom(game.state) * game.canvasElement.width;
        y = Math.round(nextRandom(game.state)) * game.canvasElement.height;    
    }
    return createEnemy(x, y, hp);
}

function createEnemy(x: number, y: number, hp: number): Character {
    return createCharacter(x, y, 5, "black", 1, hp, 1, "enemy", true);
}

function createPlayerCharacter(x: number, y: number): Character {
    return createLevelingCharacter(x, y, 10, "blue", 2, 200, 10, "player");
}

function createCharacter(
    x: number,
    y: number,
    size: number,
    color: string,
    moveSpeed: number,
    hp: number,
    damage: number,
    faction: string,
    isMoving: boolean = false,
): Character {
    return {
        x: x,
        y: y,
        size: size,
        color: color,
        moveSpeed: moveSpeed,
        moveDirection: 0,
        isMoving: isMoving,
        hp: hp,
        maxHp: hp,
        damage: damage,
        faction: faction,
        experienceWorth: 1,        
    };
}