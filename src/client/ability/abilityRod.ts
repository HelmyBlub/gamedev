import { getCharactersTouchingLine } from "../character/character.js";
import { Character } from "../character/characterModel.js";
import { calculateDistance } from "../game.js";
import { Position, Game } from "../gameModel.js";
import { GameMap, MapChunk, positionToMapKey } from "../map/map.js";
import { ABILITIES_FUNCTIONS, Ability, UpgradeOptionAbility } from "./ability.js";

type RodObject = {
    pos: Position,
    id: number,
    conntetedToId?: number,
}

type AbilityRod = Ability & {
    idCounter: number,
    damage: number,
    maxNumberRods: number,
    rodObjects: RodObject[],
    effects: string[],
}

type RodConnection = { rod: RodObject, connectedTo: RodObject };

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
        idCounter: 0,
    };
}

function castRod(character: Character, ability: Ability, castPosition: Position, game: Game) {
    let abilityRod = ability as AbilityRod;

    if (abilityRod.rodObjects.length >= abilityRod.maxNumberRods) {
        let deletedId = abilityRod.rodObjects.splice(0, 1)[0].id;
        for(let rod of abilityRod.rodObjects){
            if(rod.conntetedToId !== undefined && rod.conntetedToId === deletedId){
                delete rod.conntetedToId;
            }
        }
    }

    let newRod: RodObject = { pos: castPosition, id: abilityRod.idCounter++};
    if(abilityRod.rodObjects.length > 0){
        let nearest = getNearestRod(abilityRod, newRod);
        if(nearest){
            newRod.conntetedToId = nearest.id;
        }
    }
    abilityRod.rodObjects.push(newRod);
}

function paintAbilityRod(ctx: CanvasRenderingContext2D, character: Character, ability: Ability, cameraPosition: Position) {
    let abilityRod = ability as AbilityRod;
    let centerX = ctx.canvas.width / 2;
    let centerY = ctx.canvas.height / 2;
    let rodBaseSize = 8;

    for (let i = 0; i < abilityRod.rodObjects.length; i++) {
        let rod = abilityRod.rodObjects[i];
        let rodConnectionCounter = getRodConnectionCount(abilityRod, rod);
        let rodHeight = rodBaseSize + rodConnectionCounter * 5;
        let paintX = Math.floor(rod.pos.x - cameraPosition.x + centerX - rodBaseSize / 2);
        let paintY = Math.floor(rod.pos.y - cameraPosition.y + centerY - rodBaseSize / 2);
        if (i === 0 && abilityRod.maxNumberRods === abilityRod.rodObjects.length) {
            ctx.fillStyle = "gray";
        } else {
            ctx.fillStyle = "white";
        }
        ctx.fillRect(paintX, paintY, rodBaseSize, rodHeight);
    }

    for (let effect of abilityRod.effects) {
        switch (effect) {
            case "connected":
                paintEffectConnected(ctx, abilityRod, cameraPosition);
                break;
            default:
                throw new Error("missing effect case");
        }
    }
}

function getRodConnectionCount(abilityRod: AbilityRod, rod: RodObject): number{
    let counter = 0;
    if(rod.conntetedToId !== undefined ) counter++;
    for(let rodIter of abilityRod.rodObjects){
        if(rodIter.conntetedToId !== undefined && rodIter.conntetedToId === rod.id){
            counter++;
        }
    }

    return counter;
}

function paintEffectConnected(ctx: CanvasRenderingContext2D, abilityRod: AbilityRod, cameraPosition: Position) {
    if (abilityRod.rodObjects.length > 1) {
        let centerX = ctx.canvas.width / 2;
        let centerY = ctx.canvas.height / 2;
        ctx.strokeStyle = "red";
        let rods = abilityRod.rodObjects;
        let paintX: number;
        let paintY: number;

        for (let i = 0; i < rods.length; i++) {
            let rod = rods[i];
            if(rod.conntetedToId === undefined) continue;
            let connectedRod = getRodById(abilityRod, rod.conntetedToId);
            if(connectedRod === undefined){
                console.log("rod connection not cleaned up");
                continue;
            }
            let totalConnection =  getRodConnectionCount(abilityRod, rod) + getRodConnectionCount(abilityRod, connectedRod);
            ctx.lineWidth = totalConnection;

            ctx.beginPath();
            paintX = Math.floor(rod.pos.x - cameraPosition.x + centerX);
            paintY = Math.floor(rod.pos.y - cameraPosition.y + centerY);
            ctx.moveTo(paintX, paintY);
            paintX = Math.floor(connectedRod.pos.x - cameraPosition.x + centerX);
            paintY = Math.floor(connectedRod.pos.y - cameraPosition.y + centerY);
            ctx.lineTo(paintX, paintY);
            ctx.stroke();
        }
    }
}

function getRodById(abilityRod: AbilityRod, id: number): RodObject | undefined{
    for(let rod of abilityRod.rodObjects){
        if(rod.id === id) return rod;
    }
    return undefined;
}

function getNearestRod(abilityRod: AbilityRod, rod: RodObject): RodObject | undefined{
    let rods = abilityRod.rodObjects;
    let currentDistance: number;
    let lowestDistance: number = 0;
    let nearest = undefined;
    for (let i = 0; i < rods.length; i++) {
        if (rods[i] === rod) continue;
        currentDistance = calculateDistance(rods[i].pos, rod.pos);
        if (nearest === undefined || currentDistance < lowestDistance) {
            nearest = rods[i];
            lowestDistance = currentDistance;
        }
    }
    return nearest;
}

function tickEffectConnected(character: Character, abilityRod: AbilityRod, game: Game) {
    if (abilityRod.rodObjects.length > 1) {
        let rods = abilityRod.rodObjects;
        for (let i = 0; i < rods.length; i++) {
            let rod = rods[i];
            if(rod.conntetedToId === undefined) continue;
            let connectedRod = getRodById(abilityRod, rod.conntetedToId);
            if(connectedRod === undefined){
                console.log("rod connection not cleaned up");
                continue;
            }
            let rodConnectionCounter = getRodConnectionCount(abilityRod, rod) + getRodConnectionCount(abilityRod, connectedRod);
            let damageFactor = 0.8 + (rodConnectionCounter * 0.15);

            let characters: Character[] = getCharactersTouchingLine(game, rod.pos, connectedRod.pos);
            for (let char of characters) {
                char.hp -= abilityRod.damage * damageFactor;
                char.wasHitRecently = true;
            }
        }
    }
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
