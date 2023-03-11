import { findCharacterById, getCharactersTouchingLine, getPlayerCharacters } from "../character/character.js";
import { Character } from "../character/characterModel.js";
import { calculateDistance, getCameraPosition, getNextId } from "../game.js";
import { Position, Game, IdCounter } from "../gameModel.js";
import { findPlayerByCharacterId } from "../player.js";
import { nextRandom, RandomSeed } from "../randomNumberGenerator.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityFunctions, AbilityObject, AbilityOwner, UpgradeOptionAbility } from "./ability.js";

type AbilityObjectRod = AbilityObject & {
    ownerId: number,
    id: number,
    conntetedToId?: number,
    ability?: Ability,
}

type AbilityRod = Ability & {
    idCounter: number,
    damage: number,
    maxNumberRods: number,
}

const ABILITY_NAME = "Rod";

export function addRodAbility() {
    ABILITIES_FUNCTIONS[ABILITY_NAME] = {
        tickAbility: tickAbilityRod,
        tickAbilityObject: tickAbilityObjectRod,
        createAbiltiyUpgradeOptions: createAbilityRodUpgradeOptions,
        paintAbilityObject: paintAbilityObjectRod,
        paintAbilityUI: paintAbilityRodUI,
        activeAbilityCast: castRod,
        createAbility: createAbilityRod,
        deleteAbilityObject: deleteAbilityObjectRod,
        isPassive: false,
    };
}

export function createAbilityRod(
    playerInputBinding?: string,
    damage: number = 10,
): AbilityRod {
    return {
        name: ABILITY_NAME,
        damage: damage,
        maxNumberRods: 3,
        passive: false,
        playerInputBinding: playerInputBinding,
        idCounter: 0,
    };
}

function createAbilityObjectRod(idCounter: IdCounter, ownerId: number, faction: string, position: Position, ability: Ability | undefined, damage: number, size: number = 8): AbilityObjectRod{
    return {
        type: ABILITY_NAME,
        ownerId: ownerId,
        size: size,
        color: "",
        x: position.x,
        y: position.y,
        id: getNextId(idCounter),
        ability: ability,
        damage: damage,
        paintOrder: "afterCharacterPaint",
        faction: faction,
    }
}

function deleteAbilityObjectRod(abilityObject: AbilityObject, game: Game){
    //nothing to do here, delete happens on cast
    return false;
}

function castRod(abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, game: Game) {
    let abilityRod = ability as AbilityRod;
    let abilityObjects = game.state.abilityObjects;

    if (getRodCountOfOwner(abilityObjects, abilityOwner.id) >= abilityRod.maxNumberRods) {
        let deletedId = deleteOldesRodOfOwnerAndReturnDeletedId(abilityObjects, abilityOwner.id);        
        updateRodsWhichHadDeletedId(abilityObjects, deletedId);
    }

    let rodAbility: Ability | undefined = getRandomPassiveAbility(game.state.randomSeed);
    let newRod: AbilityObjectRod = createAbilityObjectRod(game.state.idCounter, abilityOwner.id, abilityOwner.faction, castPosition, rodAbility, abilityRod.damage);
    let nearest = getNearestRod(abilityObjects, newRod, game.state.randomSeed);
    if(nearest){
        newRod.conntetedToId = nearest.id;
    }
    abilityObjects.push(newRod);
    updateRodObjectAbilityLevels(abilityObjects);
}

function updateRodsWhichHadDeletedId(abilityObjects: AbilityObject[], deletedId: number){
    for(let abilityObject of abilityObjects){
        if(abilityObject.type === ABILITY_NAME){
            let abilityRod = abilityObject as AbilityObjectRod;
            if(abilityRod.conntetedToId !== undefined && abilityRod.conntetedToId === deletedId){
                delete abilityRod.conntetedToId;
            }
        }
    }
}

function findOldesRodOfOwner(abilityObjects: AbilityObject[], ownerId: number): {rod: AbilityObjectRod, index: number} | undefined{
    for(let i = 0; i < abilityObjects.length; i++){
        if(abilityObjects[i].type === ABILITY_NAME){
            let abilityRod = abilityObjects[i] as AbilityObjectRod;
            if(abilityRod.ownerId === ownerId){
                return {rod: abilityRod, index: i};
            }
        }
    }
    return undefined;
}

function deleteOldesRodOfOwnerAndReturnDeletedId(abilityObjects: AbilityObject[], ownerId: number): number{
    let oldestRodIndex = findOldesRodOfOwner(abilityObjects, ownerId)?.index;
    if(oldestRodIndex !== undefined){
        return (abilityObjects.splice(oldestRodIndex,1)[0] as AbilityObjectRod).id;
    }
    debugger;
    throw new Error("id does not exist " + ownerId);
}

function getRodCountOfOwner(abilityObjects: AbilityObject[], ownerId: number): number{
    let counter = 0;
    for(let abilityObject of abilityObjects){
        if(abilityObject.type === ABILITY_NAME){
            let abilityRod = abilityObject as AbilityObjectRod;
            if(abilityRod.ownerId === ownerId){
                counter++;
            }
        }
    }
    return counter;
}

function getRandomPassiveAbility(randomSeed: RandomSeed): Ability | undefined{
    let abilityFunctionKeys = Object.keys(ABILITIES_FUNCTIONS);
    let passiveAbilitiesFunctionKeys: string[] = [];
    for(let abilityFunctionKey of abilityFunctionKeys){
        let abilityFunctions = ABILITIES_FUNCTIONS[abilityFunctionKey];
        if(!abilityFunctions.notInheritable && (abilityFunctions.isPassive || abilityFunctions.hasAutoCast)){
            passiveAbilitiesFunctionKeys.push(abilityFunctionKey);
        }
    }
    if(passiveAbilitiesFunctionKeys.length > 0){
        let random = Math.floor(nextRandom(randomSeed) * passiveAbilitiesFunctionKeys.length);
        let abilityFunctions = ABILITIES_FUNCTIONS[passiveAbilitiesFunctionKeys[random]];
        let ability = abilityFunctions.createAbility();
        if(!abilityFunctions.isPassive) ability.passive = true;
        return ability;
    }

    return undefined;
}

function updateRodObjectAbilityLevels(abilityObjects: AbilityObject[]){
    for(let abilityObject of abilityObjects){
        if(abilityObject.type !== ABILITY_NAME) continue;
        let rod: AbilityObjectRod = abilityObject as AbilityObjectRod;
        let level = getRodConnectionCount(abilityObjects, rod) + 1;
        if(rod.ability){
            let abilityFunctions = ABILITIES_FUNCTIONS[rod.ability.name];
            if(abilityFunctions.setAbilityToLevel){
                abilityFunctions.setAbilityToLevel(rod.ability, level);
            }
        }
    }
}

function paintAbilityObjectRod(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, game: Game) {
    let cameraPosition = getCameraPosition(game);
    let rod = abilityObject as AbilityObjectRod;
    let owner = findPlayerByCharacterId(game.state.players, rod.ownerId);
    let centerX = ctx.canvas.width / 2;
    let centerY = ctx.canvas.height / 2;
    let rodBaseSize = rod.size;

    let rodHeight = rodBaseSize + 5;
    let paintX = Math.floor(rod.x - cameraPosition.x + centerX - rodBaseSize / 2);
    let paintY = Math.floor(rod.y - cameraPosition.y + centerY - rodBaseSize / 2);
    if(owner?.clientId === game.multiplayer.myClientId){
        let ability = owner.character.abilities.find((e)=> e.name === ABILITY_NAME) as AbilityRod;
        if (getRodCountOfOwner(game.state.abilityObjects, rod.ownerId) >= ability.maxNumberRods) {
            let oldestRod = findOldesRodOfOwner(game.state.abilityObjects, rod.ownerId)?.rod;
            if(oldestRod && oldestRod === rod){
                ctx.fillStyle = "black"; 
            }else{
                ctx.fillStyle = "blue"; 
            }
        }else{
            ctx.fillStyle = "blue"; 
        }
    }else{
        ctx.fillStyle = "white"; 
    }
    ctx.fillRect(paintX, paintY, rodBaseSize, rodHeight);

    paintEffectConnected(ctx, rod, cameraPosition, game.state.abilityObjects);

    if(rod.ability){
        let abilityFunction = ABILITIES_FUNCTIONS[rod.ability.name];
        if(abilityFunction.paintAbility){
            abilityFunction.paintAbility(ctx, rod, rod.ability, cameraPosition, game);
        }
    }
}

function getRodConnectionCount(abilityObjects: AbilityObject[], rod: AbilityObjectRod): number{
    let counter = 0;
    if(rod.conntetedToId !== undefined ) counter++;
    for(let abilityObject of abilityObjects){
        if(abilityObject.type === ABILITY_NAME){
            let abilityRod = abilityObject as AbilityObjectRod;
            if(abilityRod.conntetedToId !== undefined && abilityRod.conntetedToId === rod.id){
                counter++;
            }
        }
    }

    return counter;
}

function paintEffectConnected(ctx: CanvasRenderingContext2D, abilityObjectRod: AbilityObjectRod, cameraPosition: Position, abilityObjects: AbilityObject[]) {
    if (abilityObjectRod.conntetedToId !== undefined) {
        let centerX = ctx.canvas.width / 2;
        let centerY = ctx.canvas.height / 2;
        ctx.strokeStyle = "red";
        let paintX: number;
        let paintY: number;

        let connectedRod = getRodById(abilityObjects, abilityObjectRod.conntetedToId);
        if(connectedRod === undefined){
            console.log("rod connection not cleaned up");
            return;
        }
        let totalConnection =  getRodConnectionCount(abilityObjects, abilityObjectRod) + getRodConnectionCount(abilityObjects, connectedRod);
        ctx.lineWidth = totalConnection;

        ctx.beginPath();
        paintX = Math.floor(abilityObjectRod.x - cameraPosition.x + centerX);
        paintY = Math.floor(abilityObjectRod.y - cameraPosition.y + centerY);
        ctx.moveTo(paintX, paintY);
        paintX = Math.floor(connectedRod.x - cameraPosition.x + centerX);
        paintY = Math.floor(connectedRod.y - cameraPosition.y + centerY);
        ctx.lineTo(paintX, paintY);
        ctx.stroke();
    }
}

function getRodById(abilityObjects: AbilityObject[], id: number): AbilityObjectRod | undefined{
    for (let i = 0; i < abilityObjects.length; i++) {
        if (abilityObjects[i].type === ABILITY_NAME){
            let rod: AbilityObjectRod = abilityObjects[i] as AbilityObjectRod;
            if(rod.id === id) return rod;
        }
    }
    return undefined;
}

function getNearestRod(abilityObjects: AbilityObject[], rod: AbilityObjectRod, randomSeed: RandomSeed): AbilityObjectRod | undefined{
    let currentDistance: number;
    let lowestDistance: number = 0;
    let nearest: AbilityObjectRod[] | undefined = undefined;
    for (let i = 0; i < abilityObjects.length; i++) {
        if (abilityObjects[i] === rod) continue;
        if (abilityObjects[i].type !== ABILITY_NAME) continue;
        currentDistance = calculateDistance(abilityObjects[i], rod);
        if (nearest === undefined || currentDistance < lowestDistance) {
            nearest = [abilityObjects[i] as AbilityObjectRod];
            lowestDistance = currentDistance;
        }else if(currentDistance === lowestDistance){
            nearest.push(abilityObjects[i] as AbilityObjectRod);
        }
    }
    if(nearest){
        let randomIndex = nearest.length > 1 ? Math.floor(nextRandom(randomSeed)*nearest.length) : 0;
        return nearest[randomIndex];
    }else{
        return undefined;
    }
}

function tickEffectConnected(abilityObjectRod: AbilityObjectRod, game: Game) {
    if(abilityObjectRod.conntetedToId === undefined) return;
    let abilityObjects = game.state.abilityObjects;
    let connectedRod = getRodById(abilityObjects, abilityObjectRod.conntetedToId);
    if(connectedRod === undefined){
        console.log("rod connection not cleaned up");
        return;
    }
    let rodConnectionCounter = getRodConnectionCount(abilityObjects, abilityObjectRod) + getRodConnectionCount(abilityObjects, connectedRod);
    let damageFactor = 0.7 + (rodConnectionCounter * 0.15);

    let characters: Character[] = getCharactersTouchingLine(game, abilityObjectRod, connectedRod);
    for (let char of characters) {
        char.hp -= abilityObjectRod.damage * damageFactor;
        char.wasHitRecently = true;
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

function tickAbilityRod(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    let abilityRod = ability as AbilityRod;
}

function tickAbilityObjectRod(abilityObject: AbilityObject, game: Game){
    let abilityRod = abilityObject as AbilityObjectRod;
    tickEffectConnected(abilityRod, game);

    if(abilityRod.ability){
        let abilityFunction = ABILITIES_FUNCTIONS[abilityRod.ability.name];
        abilityFunction.tickAbility(abilityRod, abilityRod.ability, game);
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
