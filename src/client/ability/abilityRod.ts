import { Character } from "../character/characterModel.js";
import { Position, Game } from "../gameModel.js";
import { GameMap, MapChunk, positionToMapKey } from "../map/map.js";
import { ABILITIES_FUNCTIONS, Ability, UpgradeOptionAbility } from "./ability.js";

type RodObject = {
    pos: Position,
}

type AbilityRod = Ability & {
    damage: number,
    maxNumberRods: number,
    rodObjects: RodObject[],
    effects: string[],
}
const ABILITY_NAME = "Rod";

export function addRodAbility() {
    ABILITIES_FUNCTIONS[ABILITY_NAME] = {
        tickAbility: tickAbilityRod,
        createAbiltiyUpgradeOptions: createAbilityRodUpgradeOptions,
        paintAbility: paintAbilityRod,
        paintAbilityUI: paintAbilityRodUI,
        activeAbilityCast: castRod,
    };
}

export function createAbilityRod(
    playerInputBinding: string,
    damage: number = 10,
): AbilityRod {
    return {
        name: ABILITY_NAME,
        damage: damage,
        maxNumberRods: 3,
        rodObjects: [],
        passive: false,
        playerInputBinding: playerInputBinding,
        effects: ["connected"],
    };
}

function castRod(character: Character, ability: Ability, castPosition: Position, game: Game) {
    let abilityRod = ability as AbilityRod;

    if (abilityRod.rodObjects.length >= abilityRod.maxNumberRods) {
        abilityRod.rodObjects.splice(0, 1);
    }

    let newRod: RodObject = { pos: castPosition };
    abilityRod.rodObjects.push(newRod);
}

function paintAbilityRod(ctx: CanvasRenderingContext2D, character: Character, ability: Ability, cameraPosition: Position) {
    let abilityRod = ability as AbilityRod;
    let centerX = ctx.canvas.width / 2;
    let centerY = ctx.canvas.height / 2;
    let rodSize = 10;

    for (let rod of abilityRod.rodObjects) {
        let paintX = Math.floor(rod.pos.x - cameraPosition.x + centerX - rodSize / 2);
        let paintY = Math.floor(rod.pos.y - cameraPosition.y + centerY - rodSize / 2);
        ctx.fillStyle = "white";
        ctx.fillRect(paintX, paintY, rodSize, rodSize);
    }

    for (let effect of abilityRod.effects) {
        switch (effect) {
            case "connected":
                drawEffectConnected(ctx, abilityRod, cameraPosition);
                break;
            default:
                throw new Error("missing effect case");
        }
    }
}

function drawEffectConnected(ctx: CanvasRenderingContext2D, abilityRod: AbilityRod, cameraPosition: Position) {
    if (abilityRod.rodObjects.length > 1) {
        let centerX = ctx.canvas.width / 2;
        let centerY = ctx.canvas.height / 2;
        ctx.strokeStyle = "red";
        ctx.lineWidth = 3;
        let rods = abilityRod.rodObjects;
        let paintX: number;
        let paintY: number;

        for (let i = 0; i < rods.length - 1; i++) {
            for (let j = i + 1; j < rods.length; j++) {
                ctx.beginPath();
                paintX = Math.floor(abilityRod.rodObjects[i].pos.x - cameraPosition.x + centerX);
                paintY = Math.floor(abilityRod.rodObjects[i].pos.y - cameraPosition.y + centerY);
                ctx.moveTo(paintX, paintY);
                paintX = Math.floor(abilityRod.rodObjects[j].pos.x - cameraPosition.x + centerX);
                paintY = Math.floor(abilityRod.rodObjects[j].pos.y - cameraPosition.y + centerY);
                ctx.lineTo(paintX, paintY);
                ctx.stroke();
            }
        }
    }
}

function tickEffectConnected(character: Character, abilityRod: AbilityRod, game: Game) {
    if (abilityRod.rodObjects.length > 1) {
        let rods = abilityRod.rodObjects;
        for (let i = 0; i < rods.length - 1; i++) {
            for (let j = i + 1; j < rods.length; j++) {
                let characters: Character[] = getCharactersTouchingLine(game, rods[i].pos, rods[j].pos);
                for (let char of characters) {
                    char.hp -= abilityRod.damage;
                    char.wasHitRecently = true;
                }
            }
        }
    }
}

function getCharactersTouchingLine(game: Game, lineStart: Position, lineEnd: Position): Character[] {
    let chunks: MapChunk[] = getChunksTouchingLine(game.state.map, lineStart, lineEnd);
    let lineWidth = 3;
    let charactersTouchingLine: Character[] = [];
    for (let chunk of chunks) {
        for (let char of chunk.characters) {
            let distance = calculateDistancePointToLine(char, lineStart, lineEnd);
            if (distance < char.width / 2 + lineWidth / 2) {
                charactersTouchingLine.push(char);
            }
        }
    }

    return charactersTouchingLine;
}

function calculateDistancePointToLine(point: Position, linestart: Position, lineEnd: Position) {
    var A = point.x - linestart.x;
    var B = point.y - linestart.y;
    var C = lineEnd.x - linestart.x;
    var D = lineEnd.y - linestart.y;

    var dot = A * C + B * D;
    var len_sq = C * C + D * D;
    var param = -1;
    if (len_sq != 0) //in case of 0 length line
        param = dot / len_sq;

    var xx, yy;

    if (param < 0) {
        xx = linestart.x;
        yy = linestart.y;
    }
    else if (param > 1) {
        xx = lineEnd.x;
        yy = lineEnd.y;
    }
    else {
        xx = linestart.x + param * C;
        yy = linestart.y + param * D;
    }

    var dx = point.x - xx;
    var dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

export function getChunksTouchingLine(map: GameMap, lineStart: Position, lineEnd: Position): MapChunk[] {
    let chunkSize = map.chunkLength * map.tileSize;
    let chunkKeys: string[] = [];
    chunkKeys.push(positionToMapKey(lineStart, map));
    let endKey = positionToMapKey(lineEnd, map);
    if (chunkKeys[0] !== endKey) {
        let xDiff = lineEnd.x - lineStart.x;
        let yDiff = lineEnd.y - lineStart.y;
        let currentPos = { ...lineStart };
        let currentKey: string;
        do {
            let nextYBorder: number | undefined;
            let nextXBorder: number | undefined;
            let nextYBorderX: number | undefined;
            let nextXBorderY: number | undefined;
            if(yDiff !== 0){
                if(yDiff > 0){
                    nextYBorder = Math.ceil(currentPos.y / chunkSize) * chunkSize + 1;
                }else{
                    nextYBorder = Math.floor(currentPos.y / chunkSize) * chunkSize - 1;
                }
            }
            if(xDiff !== 0){
                if(xDiff > 0){
                    nextXBorder = Math.ceil(currentPos.x / chunkSize) * chunkSize + 1;
                }else{
                    nextXBorder = Math.floor(currentPos.x / chunkSize) * chunkSize - 1;
                }
            }
            if(nextYBorder !== undefined){
                nextYBorderX = (nextYBorder - currentPos.y) * (xDiff/yDiff) + currentPos.x;
            }
            if(nextXBorder !== undefined){
                nextXBorderY = (nextXBorder - currentPos.x) * (yDiff/xDiff) + currentPos.y;
            }
            if(nextYBorderX !== undefined && nextXBorderY !== undefined){
                if(nextXBorder! > nextYBorderX){
                    if(xDiff > 0){
                        currentPos.x = nextYBorderX;
                        currentPos.y = nextYBorder!;
                    }else{
                        currentPos.x = nextXBorder!;
                        currentPos.y = nextXBorderY;
                    }
                }else{
                    if(xDiff > 0){
                        currentPos.x = nextXBorder!;
                        currentPos.y = nextXBorderY;
                    }else{
                        currentPos.x = nextYBorderX;
                        currentPos.y = nextYBorder!;
                    }
                }
            }else if(nextYBorderX !== undefined){

            }else if(nextXBorderY !== undefined){

            }else{
                console.log("should not happen?");
            }
            currentKey = positionToMapKey(currentPos, map);
            chunkKeys.push(currentKey);
        } while (currentKey !== endKey);
    }

    let chunks: MapChunk[] = [];
    for (let chunkKey of chunkKeys) {
        if (map.chunks[chunkKey] !== undefined) {
            chunks.push(map.chunks[chunkKey]);
        }
    }
    return chunks;
}

function paintAbilityRodUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) {
    let rod = ability as AbilityRod;
    let fontSize = size;
    let rectSize = size;
    ctx.strokeStyle = "black";
    ctx.fillStyle = "white";
    ctx.fillRect(drawStartX, drawStartY, rectSize, rectSize);
    ctx.beginPath();
    ctx.rect(drawStartX, drawStartY, rectSize, rectSize);
    ctx.stroke();

    ctx.fillStyle = "black";
    ctx.font = fontSize + "px Arial";

    if (rod.playerInputBinding) {
        let keyBind = "";
        game.clientKeyBindings[0].keyCodeToActionPressed.forEach((value, key) => {
            if (value.action === rod.playerInputBinding) {
                keyBind = value.uiDisplayInputValue;
            }
        });
        ctx.fillStyle = "black";
        ctx.font = "10px Arial";
        ctx.fillText(keyBind, drawStartX + 1, drawStartY + 8);
    }
}

function tickAbilityRod(character: Character, ability: Ability, game: Game) {
    let abilityRod = ability as AbilityRod;
    for (let effect of abilityRod.effects) {
        switch (effect) {
            case "connected":
                tickEffectConnected(character, abilityRod, game);
                break;
            default:
                throw new Error("missing effect case");
        }
    }
}

function createAbilityRodUpgradeOptions(): UpgradeOptionAbility[] {
    let upgradeOptions: UpgradeOptionAbility[] = [];
    upgradeOptions.push({
        name: "Damage+10", upgrade: (a: Ability) => {
            let as = a as AbilityRod;
            as.damage += 10;
        }
    });
    upgradeOptions.push({
        name: "Damage+10", upgrade: (a: Ability) => {
            let as = a as AbilityRod;
            as.damage += 10;
        }
    });
    upgradeOptions.push({
        name: "RodCount+", upgrade: (a: Ability) => {
            let as = a as AbilityRod;
            as.maxNumberRods += 1;
        }
    });

    return upgradeOptions;
}
