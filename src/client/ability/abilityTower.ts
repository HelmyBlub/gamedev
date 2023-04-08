import { getCharactersTouchingLine, characterTakeDamage } from "../character/character.js";
import { Character } from "../character/characterModel.js";
import { calculateDistance, getCameraPosition, getNextId } from "../game.js";
import { Position, Game, IdCounter } from "../gameModel.js";
import { positionToMapKey } from "../map/map.js";
import { findPlayerByCharacterId } from "../player.js";
import { nextRandom, RandomSeed } from "../randomNumberGenerator.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityFunctions, AbilityObject, AbilityOwner, PaintOrder, UpgradeOptionAbility } from "./ability.js";

type AbilityObjectTower = AbilityObject & {
    ownerId: number,
    id: number,
    conntetedToId?: number,
    ability?: Ability,
    lineDamageTickFrequency: number,
    lineDamageNextDamageTick?: number,
}

type AbilityTower = Ability & {
    idCounter: number,
    damage: number,
    maxClickRange: number,
    availableAbilityKeys: string[],
    orderOfAbilities: number[],
    currentAbilityIndex: number,
}

const ABILITY_NAME_TOWER = "Tower";

export function addTowerAbility() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_TOWER] = {
        tickAbility: tickAbilityTower,
        tickAbilityObject: tickAbilityObjectTower,
        createAbiltiyUpgradeOptions: createAbilityTowerUpgradeOptions,
        paintAbilityObject: paintAbilityObjectTower,
        paintAbilityUI: paintAbilityTowerUI,
        activeAbilityCast: castTower,
        createAbility: createAbilityTower,
        deleteAbilityObject: deleteAbilityObjectTower,
        paintAbilityStatsUI: paintAbilityTowerStatsUI,
        isPassive: false,
    };
}

export function createAbilityTower(
    playerInputBinding?: string,
    damage: number = 50,
): AbilityTower {
    let maxNumberTowers = 4;
    let keys = getRandomPassiveAbilitiyKeys();
    let availableAbilities = [];
    let orderOfAbilities = [];
    for (let i = 0; i < maxNumberTowers; i++) {
        if (i < keys.length) availableAbilities.push(keys[i]);
        orderOfAbilities.push(i % keys.length);
    }

    return {
        name: ABILITY_NAME_TOWER,
        damage: damage,
        passive: false,
        playerInputBinding: playerInputBinding,
        idCounter: 0,
        maxClickRange: 1500,
        currentAbilityIndex: 0,
        availableAbilityKeys: availableAbilities,
        orderOfAbilities: orderOfAbilities,
    };
}

function createAbilityObjectTower(idCounter: IdCounter, ownerId: number, faction: string, position: Position, ability: Ability | undefined, damage: number, size: number = 8): AbilityObjectTower {
    return {
        type: ABILITY_NAME_TOWER,
        ownerId: ownerId,
        size: size,
        color: "",
        x: position.x,
        y: position.y,
        id: getNextId(idCounter),
        ability: ability,
        damage: damage,
        faction: faction,
        lineDamageTickFrequency: 125,
    }
}

function deleteAbilityObjectTower(abilityObject: AbilityObject, game: Game) {
    //nothing to do here, delete happens on cast
    return false;
}

function castTower(abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, game: Game) {
    let abilityTower = ability as AbilityTower;
    let distance = calculateDistance(abilityOwner, castPosition);
    if (distance > abilityTower.maxClickRange) return;
    let abilityObjects = game.state.abilityObjects;

    if (getTowerCountOfOwner(abilityObjects, abilityOwner.id) >= abilityTower.orderOfAbilities.length) {
        let deletedId = deleteOldesTowerOfOwnerAndReturnDeletedId(abilityObjects, abilityOwner.id);
        updateTowersWhichHadDeletedId(abilityObjects, deletedId);
    }

    let nextAbilityKey = abilityTower.availableAbilityKeys[abilityTower.orderOfAbilities[abilityTower.currentAbilityIndex]];
    let nextAbility: Ability = ABILITIES_FUNCTIONS[nextAbilityKey].createAbility();
    if (!nextAbility.passive) nextAbility.passive = true;
    abilityTower.currentAbilityIndex = (abilityTower.currentAbilityIndex + 1) % abilityTower.orderOfAbilities.length;
    let newTower: AbilityObjectTower = createAbilityObjectTower(game.state.idCounter, abilityOwner.id, abilityOwner.faction, castPosition, nextAbility, abilityTower.damage);
    let nearest = getNearestTower(abilityObjects, newTower, game.state.randomSeed);
    if (nearest) {
        newTower.conntetedToId = nearest.id;
    }
    abilityObjects.push(newTower);
    updateTowerObjectAbilityLevels(abilityObjects);
}

function updateTowersWhichHadDeletedId(abilityObjects: AbilityObject[], deletedId: number) {
    for (let abilityObject of abilityObjects) {
        if (abilityObject.type === ABILITY_NAME_TOWER) {
            let abilityTower = abilityObject as AbilityObjectTower;
            if (abilityTower.conntetedToId !== undefined && abilityTower.conntetedToId === deletedId) {
                delete abilityTower.conntetedToId;
            }
        }
    }
}

function findOldesTowerOfOwner(abilityObjects: AbilityObject[], ownerId: number): { tower: AbilityObjectTower, index: number } | undefined {
    for (let i = 0; i < abilityObjects.length; i++) {
        if (abilityObjects[i].type === ABILITY_NAME_TOWER) {
            let abilityTower = abilityObjects[i] as AbilityObjectTower;
            if (abilityTower.ownerId === ownerId) {
                return { tower: abilityTower, index: i };
            }
        }
    }
    return undefined;
}

function deleteOldesTowerOfOwnerAndReturnDeletedId(abilityObjects: AbilityObject[], ownerId: number): number {
    let oldestTowerIndex = findOldesTowerOfOwner(abilityObjects, ownerId)?.index;
    if (oldestTowerIndex !== undefined) {
        return (abilityObjects.splice(oldestTowerIndex, 1)[0] as AbilityObjectTower).id;
    }
    debugger;
    throw new Error("id does not exist " + ownerId);
}

function getTowerCountOfOwner(abilityObjects: AbilityObject[], ownerId: number): number {
    let counter = 0;
    for (let abilityObject of abilityObjects) {
        if (abilityObject.type === ABILITY_NAME_TOWER) {
            let abilityTower = abilityObject as AbilityObjectTower;
            if (abilityTower.ownerId === ownerId) {
                counter++;
            }
        }
    }
    return counter;
}

function getRandomPassiveAbility(randomSeed: RandomSeed): Ability | undefined {
    let passiveAbilitiesFunctionKeys: string[] = getRandomPassiveAbilitiyKeys();
    if (passiveAbilitiesFunctionKeys.length > 0) {
        let random = Math.floor(nextRandom(randomSeed) * passiveAbilitiesFunctionKeys.length);
        let abilityFunctions = ABILITIES_FUNCTIONS[passiveAbilitiesFunctionKeys[random]];
        let ability = abilityFunctions.createAbility();
        if (!abilityFunctions.isPassive) ability.passive = true;
        return ability;
    }

    return undefined;
}

function getRandomPassiveAbilitiyKeys(): string[] {
    let abilityFunctionKeys = Object.keys(ABILITIES_FUNCTIONS);
    let passiveAbilitiesFunctionKeys: string[] = [];
    for (let abilityFunctionKey of abilityFunctionKeys) {
        let abilityFunctions = ABILITIES_FUNCTIONS[abilityFunctionKey];
        if (!abilityFunctions.notInheritable && (abilityFunctions.isPassive || abilityFunctions.hasAutoCast)) {
            passiveAbilitiesFunctionKeys.push(abilityFunctionKey);
        }
    }
    return passiveAbilitiesFunctionKeys;
}

function updateTowerObjectAbilityLevels(abilityObjects: AbilityObject[]) {
    for (let abilityObject of abilityObjects) {
        if (abilityObject.type !== ABILITY_NAME_TOWER) continue;
        let tower: AbilityObjectTower = abilityObject as AbilityObjectTower;
        let level = getTowerConnectionCount(abilityObjects, tower) + 1;
        if (tower.ability) {
            let abilityFunctions = ABILITIES_FUNCTIONS[tower.ability.name];
            if (abilityFunctions.setAbilityToLevel) {
                abilityFunctions.setAbilityToLevel(tower.ability, level);
            }
        }
    }
}

function paintAbilityObjectTower(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrder, game: Game) {
    let cameraPosition = getCameraPosition(game);
    let tower = abilityObject as AbilityObjectTower;

    if (paintOrder === "beforeCharacterPaint") {
        paintEffectConnected(ctx, tower, cameraPosition, game.state.abilityObjects);
    } else if (paintOrder === "afterCharacterPaint") {
        let owner = findPlayerByCharacterId(game.state.players, tower.ownerId);
        let centerX = ctx.canvas.width / 2;
        let centerY = ctx.canvas.height / 2;
        let towerBaseSize = tower.size;

        let towerHeight = towerBaseSize + 5;
        let paintX = Math.floor(tower.x - cameraPosition.x + centerX - towerBaseSize / 2);
        let paintY = Math.floor(tower.y - cameraPosition.y + centerY - towerBaseSize / 2);
        if (owner?.clientId === game.multiplayer.myClientId) {
            let ability = owner.character.abilities.find((e) => e.name === ABILITY_NAME_TOWER) as AbilityTower;
            if (getTowerCountOfOwner(game.state.abilityObjects, tower.ownerId) >= ability.orderOfAbilities.length) {
                let oldestTower = findOldesTowerOfOwner(game.state.abilityObjects, tower.ownerId)?.tower;
                if (oldestTower && oldestTower === tower) {
                    ctx.fillStyle = "black";
                } else {
                    ctx.fillStyle = "blue";
                }
            } else {
                ctx.fillStyle = "blue";
            }
        } else {
            ctx.fillStyle = "white";
        }
        ctx.fillRect(paintX, paintY, towerBaseSize, towerHeight);

        if (tower.ability) {
            let abilityFunction = ABILITIES_FUNCTIONS[tower.ability.name];
            if (abilityFunction.paintAbility) {
                abilityFunction.paintAbility(ctx, tower, tower.ability, cameraPosition, game);
            }
        }
    }
}

function getTowerConnectionCount(abilityObjects: AbilityObject[], tower: AbilityObjectTower): number {
    let counter = 0;
    if (tower.conntetedToId !== undefined) counter++;
    for (let abilityObject of abilityObjects) {
        if (abilityObject.type === ABILITY_NAME_TOWER) {
            let abilityTower = abilityObject as AbilityObjectTower;
            if (abilityTower.conntetedToId !== undefined && abilityTower.conntetedToId === tower.id) {
                counter++;
            }
        }
    }

    return counter;
}

function paintEffectConnected(ctx: CanvasRenderingContext2D, abilityObjectTower: AbilityObjectTower, cameraPosition: Position, abilityObjects: AbilityObject[]) {
    if (abilityObjectTower.conntetedToId !== undefined) {
        let centerX = ctx.canvas.width / 2;
        let centerY = ctx.canvas.height / 2;
        ctx.strokeStyle = "red";
        let paintX: number;
        let paintY: number;

        let connectedTower = getTowerById(abilityObjects, abilityObjectTower.conntetedToId);
        if (connectedTower === undefined) {
            console.log("tower connection not cleaned up");
            return;
        }
        let totalConnection = getTowerConnectionCount(abilityObjects, abilityObjectTower) + getTowerConnectionCount(abilityObjects, connectedTower);
        ctx.lineWidth = totalConnection;

        ctx.beginPath();
        paintX = Math.floor(abilityObjectTower.x - cameraPosition.x + centerX);
        paintY = Math.floor(abilityObjectTower.y - cameraPosition.y + centerY);
        ctx.moveTo(paintX, paintY);
        paintX = Math.floor(connectedTower.x - cameraPosition.x + centerX);
        paintY = Math.floor(connectedTower.y - cameraPosition.y + centerY);
        ctx.lineTo(paintX, paintY);
        ctx.stroke();
    }
}

function getTowerById(abilityObjects: AbilityObject[], id: number): AbilityObjectTower | undefined {
    for (let i = 0; i < abilityObjects.length; i++) {
        if (abilityObjects[i].type === ABILITY_NAME_TOWER) {
            let tower: AbilityObjectTower = abilityObjects[i] as AbilityObjectTower;
            if (tower.id === id) return tower;
        }
    }
    return undefined;
}

function getNearestTower(abilityObjects: AbilityObject[], tower: AbilityObjectTower, randomSeed: RandomSeed): AbilityObjectTower | undefined {
    let currentDistance: number;
    let lowestDistance: number = 0;
    let nearest: AbilityObjectTower[] | undefined = undefined;
    for (let i = 0; i < abilityObjects.length; i++) {
        if (abilityObjects[i] === tower) continue;
        if (abilityObjects[i].type !== ABILITY_NAME_TOWER) continue;
        currentDistance = calculateDistance(abilityObjects[i], tower);
        if (nearest === undefined || currentDistance < lowestDistance) {
            nearest = [abilityObjects[i] as AbilityObjectTower];
            lowestDistance = currentDistance;
        } else if (currentDistance === lowestDistance) {
            nearest.push(abilityObjects[i] as AbilityObjectTower);
        }
    }
    if (nearest) {
        let randomIndex = nearest.length > 1 ? Math.floor(nextRandom(randomSeed) * nearest.length) : 0;
        return nearest[randomIndex];
    } else {
        return undefined;
    }
}

function tickEffectConnected(abilityObjectTower: AbilityObjectTower, game: Game) {
    if (abilityObjectTower.conntetedToId === undefined) return;
    let abilityObjects = game.state.abilityObjects;
    let connectedTower = getTowerById(abilityObjects, abilityObjectTower.conntetedToId);
    if (connectedTower === undefined) {
        console.log("tower connection not cleaned up");
        return;
    }
    let towerConnectionCounter = getTowerConnectionCount(abilityObjects, abilityObjectTower) + getTowerConnectionCount(abilityObjects, connectedTower);
    let damageFactor = 0.7 + (towerConnectionCounter * 0.15);

    let characters: Character[] = getCharactersTouchingLine(game, abilityObjectTower, connectedTower);
    for (let char of characters) {
        characterTakeDamage(char, abilityObjectTower.damage * damageFactor, game);
    }
}

function paintAbilityTowerUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) {
    let tower = ability as AbilityTower;
    let fontSize = 12;
    let rectSize = size;

    ctx.lineWidth = 1;
    ctx.strokeStyle = "black";
    ctx.fillStyle = "white";
    ctx.fillRect(drawStartX, drawStartY, rectSize, rectSize);
    ctx.beginPath();
    ctx.rect(drawStartX, drawStartY, rectSize, rectSize);
    ctx.stroke();

    ctx.fillStyle = "black";
    ctx.font = fontSize + "px Arial";
    const nextTower = tower.availableAbilityKeys[tower.orderOfAbilities[tower.currentAbilityIndex]];
    ctx.fillText(nextTower, drawStartX + 1, drawStartY + rectSize - (rectSize - fontSize)/2);

    if (tower.playerInputBinding) {
        let keyBind = "";
        game.clientKeyBindings[0].keyCodeToActionPressed.forEach((value, key) => {
            if (value.action === tower.playerInputBinding) {
                keyBind = value.uiDisplayInputValue;
            }
        });
        ctx.fillStyle = "black";
        ctx.font = "10px Arial";
        ctx.fillText(keyBind, drawStartX + 1, drawStartY + 8);
    }
}

function paintAbilityTowerStatsUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, game: Game): { width: number, height: number } {
    let abilityTower = ability as AbilityTower;
    const abilityTowerDescription = ["Click to place Tower. Tower always connects to closest other Tower."];
    abilityTowerDescription.push("More connections equals more damage. Towers have random");
    abilityTowerDescription.push("Abilities. Abilities are Sword, Shoot or FireCircle.");
    abilityTowerDescription.push("Abilities get more powerfull per connection");
    const fontSize = 14;
    const width = 425;
    const height = 200;
    ctx.fillStyle = "white";
    ctx.fillRect(drawStartX, drawStartY, width, height);
    ctx.font = fontSize + "px Arial";
    ctx.fillStyle = "black";
    let textLineCounter = 1;
    ctx.fillText("Ability:" + abilityTower.name, drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);
    for (let desc of abilityTowerDescription) {
        ctx.fillText(desc, drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);
    }

    textLineCounter++;
    ctx.fillText("Ability stats: ", drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);
    ctx.fillText("Max Towers: " + abilityTower.orderOfAbilities.length, drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);
    ctx.fillText("Max Click Range: " + abilityTower.maxClickRange, drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);
    ctx.fillText("Line Damage: " + abilityTower.damage, drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);
    ctx.fillText("Line Damage Increase per Connection: 15%", drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);

    for(let i = 0; i< abilityTower.availableAbilityKeys.length;i++){
        let key = abilityTower.availableAbilityKeys[i];
        let counter = 0;
        for(let j = 0; j< abilityTower.orderOfAbilities.length;j++){
            if(abilityTower.orderOfAbilities[j] === i) counter++;
        }
        ctx.fillText(`Max ${key} Tower: ${counter}`, drawStartX + 2, drawStartY + fontSize * textLineCounter++ + 2);
    }

    return { width, height };
}

function tickAbilityTower(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    let abilityTower = ability as AbilityTower;
}

function tickAbilityObjectTower(abilityObject: AbilityObject, game: Game) {
    let abilityTower = abilityObject as AbilityObjectTower;
    let mapKeyOfCharacterPosistion = positionToMapKey(abilityObject, game.state.map);
    if(!game.state.map.activeChunkKeys.includes(mapKeyOfCharacterPosistion)) return;

    if(abilityTower.lineDamageNextDamageTick === undefined) abilityTower.lineDamageNextDamageTick = game.state.time + abilityTower.lineDamageTickFrequency;
    if(abilityTower.lineDamageNextDamageTick <= game.state.time){
        tickEffectConnected(abilityTower, game);
        abilityTower.lineDamageNextDamageTick += abilityTower.lineDamageTickFrequency;
        if(abilityTower.lineDamageNextDamageTick <= game.state.time){
            abilityTower.lineDamageNextDamageTick = game.state.time + abilityTower.lineDamageTickFrequency;
        }
    }

    if (abilityTower.ability) {
        let abilityFunction = ABILITIES_FUNCTIONS[abilityTower.ability.name];
        abilityFunction.tickAbility(abilityTower, abilityTower.ability, game);
    }
}

function createAbilityTowerUpgradeOptions(ability: Ability): UpgradeOptionAbility[] {
    let abilityTower = ability as AbilityTower;
    let upgradeOptions: UpgradeOptionAbility[] = [];
    upgradeOptions.push({
        name: "Line Damage+50", probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilityTower;
            as.damage += 50;
        }
    });
    for(let i = 0; i < abilityTower.availableAbilityKeys.length; i++){
        upgradeOptions.push({
            name: `Tower ${abilityTower.availableAbilityKeys[i]}+`, probabilityFactor: 1, upgrade: (a: Ability) => {
                let as = a as AbilityTower;                
                as.orderOfAbilities.splice(as.currentAbilityIndex,0,i);
            }
        });
    }

    return upgradeOptions;
}
