import { getCharactersTouchingLine, characterTakeDamage } from "../character/character.js";
import { Character } from "../character/characterModel.js";
import { CHARACTER_TYPE_BOSS_ENEMY } from "../character/enemy/bossEnemy.js";
import { CHARACTER_TYPE_END_BOSS_ENEMY } from "../character/enemy/endBossEnemy.js";
import { AbilityUpgradeOption, UpgradeOption, UpgradeOptionAndProbability } from "../character/upgrade.js";
import { calculateDistance, getCameraPosition, getNextId } from "../game.js";
import { Position, Game, IdCounter, FACTION_ENEMY } from "../gameModel.js";
import { GAME_IMAGES, loadImage } from "../imageLoad.js";
import { positionToMapKey } from "../map/map.js";
import { findPlayerByCharacterId } from "../player.js";
import { playerInputBindingToDisplayValue } from "../playerInput.js";
import { nextRandom, RandomSeed } from "../randomNumberGenerator.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityOwner, PaintOrderAbility, getAbilityNameUiText, paintDefaultAbilityStatsUI } from "./ability.js";
import { ABILITY_NAME_FIRE_CIRCLE } from "./abilityFireCircle.js";
import { ABILITY_NAME_ICE_AURA } from "./abilityIceAura.js";
import { ABILITY_NAME_SHOOT } from "./abilityShoot.js";
import { ABILITY_NAME_SINGLETARGET } from "./abilitySingleTarget.js";
import { ABILITY_NAME_SWORD } from "./abilitySword.js";

type AbilityObjectTower = AbilityObject & {
    ownerId: number,
    size: number,
    id: number,
    conntetedToId?: number,
    ability?: Ability,
    lineDamageTickFrequency: number,
    lineDamageNextDamageTick?: number,
    isBossTower?: boolean,
}

type AbilityTower = Ability & {
    idCounter: number,
    damage: number,
    maxClickRange: number,
    availableAbilityKeys: string[],
    orderOfAbilities: number[],
    currentAbilityIndex: number,
    lastBuildTime?: number,
}

export const ABILITY_NAME_TOWER = "Tower";
GAME_IMAGES[ABILITY_NAME_TOWER] = {
    imagePath: "/images/hammer.png",
    spriteRowHeights: [20],
    spriteRowWidths: [20],
};

export function addAbilityTower() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_TOWER] = {
        tickAbility: tickAbilityTower,
        tickAbilityObject: tickAbilityObjectTower,
        createAbilityUpgradeOptions: createAbilityTowerUpgradeOptionsNew,
        executeUpgradeOption: executeAbilityTowerUpgradeOption,
        paintAbilityObject: paintAbilityObjectTower,
        paintAbilityUI: paintAbilityTowerUI,
        paintAbility: paintAbilityTower,
        activeAbilityCast: castTower,
        createAbility: createAbilityTower,
        deleteAbilityObject: deleteAbilityObjectTower,
        paintAbilityStatsUI: paintAbilityTowerStatsUI,
        setAbilityToBossLevel: setAbilityTowerToBossLevel,
        tickBossAI: tickBossAI,
        resetAbility: resetAbility,
        canBeUsedByBosses: true,
    };
}

export function createAbilityTower(
    idCounter: IdCounter,
    playerInputBinding?: string,
    damage: number = 50,
): AbilityTower {
    let maxNumberTowers = 5;
    let keys = getRandomPassiveAbilitiyKeys();
    let availableAbilities = [];
    let orderOfAbilities = [];
    for (let i = 0; i < maxNumberTowers; i++) {
        if (i < keys.length) availableAbilities.push(keys[i]);
        orderOfAbilities.push(i % keys.length);
    }

    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_TOWER,
        damage: damage,
        passive: false,
        playerInputBinding: playerInputBinding,
        idCounter: 0,
        maxClickRange: 1500,
        currentAbilityIndex: 0,
        availableAbilityKeys: availableAbilities,
        orderOfAbilities: orderOfAbilities,
        upgrades: {},
        tradable: true,
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

function resetAbility(ability: Ability) {
    const abilityTower = ability as AbilityTower;
    abilityTower.lastBuildTime = undefined;
}

function setAbilityTowerToBossLevel(ability: Ability, level: number) {
    let abilityTower = ability as AbilityTower;
    abilityTower.damage = level * 10;
}


function tickBossAI(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilityTower = ability as AbilityTower;
    const buildFrequency = 1000;
    if (abilityTower.lastBuildTime === undefined || abilityTower.lastBuildTime + buildFrequency <= game.state.time) {
        let pos: Position = {
            x: abilityOwner.x + (nextRandom(game.state.randomSeed) * 50 - 25),
            y: abilityOwner.y + (nextRandom(game.state.randomSeed) * 50 - 25)
        };
        castTower(abilityOwner, ability, pos, true, game);
        console.log("Boss ai build tower");
    }
}

function deleteAbilityObjectTower(abilityObject: AbilityObject, game: Game) {
    //nothing to do here, delete happens on cast
    return false;
}

function castTower(abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, isKeydown: boolean, game: Game) {
    if (!isKeydown) return;
    const abilityTower = ability as AbilityTower;
    let distance = calculateDistance(abilityOwner, castPosition);
    if (distance > abilityTower.maxClickRange) return;
    let abilityObjects = game.state.abilityObjects;

    if (getTowerCountOfOwner(abilityObjects, abilityOwner.id) >= abilityTower.orderOfAbilities.length) {
        let deletedId = deleteOldesTowerOfOwnerAndReturnDeletedId(abilityObjects, abilityOwner.id);
        updateTowersWhichHadDeletedId(abilityObjects, deletedId);
    }

    let nextAbilityKey = abilityTower.availableAbilityKeys[abilityTower.orderOfAbilities[abilityTower.currentAbilityIndex]];
    let nextAbility: Ability = ABILITIES_FUNCTIONS[nextAbilityKey].createAbility(game.state.idCounter);
    if (!nextAbility.passive) nextAbility.passive = true;
    abilityTower.currentAbilityIndex = (abilityTower.currentAbilityIndex + 1) % abilityTower.orderOfAbilities.length;
    const newTower: AbilityObjectTower = createAbilityObjectTower(game.state.idCounter, abilityOwner.id, abilityOwner.faction, castPosition, nextAbility, abilityTower.damage);
    if (abilityOwner.type === CHARACTER_TYPE_BOSS_ENEMY || abilityOwner.type === CHARACTER_TYPE_END_BOSS_ENEMY) {
        newTower.isBossTower = true;
    }
    const nearest = getNearestTower(abilityObjects, newTower, game.state.randomSeed);
    if (nearest) {
        newTower.conntetedToId = nearest.id;
    }
    abilityObjects.push(newTower);
    abilityTower.lastBuildTime = game.state.time;
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

function getRandomPassiveAbilitiyKeys(): string[] {    
    return [
        ABILITY_NAME_SHOOT,
        ABILITY_NAME_FIRE_CIRCLE,
        ABILITY_NAME_SWORD,
        ABILITY_NAME_ICE_AURA,
        ABILITY_NAME_SINGLETARGET
    ];
}

function updateTowerObjectAbilityLevels(abilityObjects: AbilityObject[]) {
    for (let abilityObject of abilityObjects) {
        if (abilityObject.type !== ABILITY_NAME_TOWER) continue;
        let tower: AbilityObjectTower = abilityObject as AbilityObjectTower;
        let level = getTowerConnectionCount(abilityObjects, tower) + 1;
        if (tower.ability) {
            let abilityFunctions = ABILITIES_FUNCTIONS[tower.ability.name];
            if (tower.isBossTower) {
                if (abilityFunctions.setAbilityToBossLevel) {
                    abilityFunctions.setAbilityToBossLevel(tower.ability, level);
                }
            } else {
                if (abilityFunctions.setAbilityToLevel) {
                    abilityFunctions.setAbilityToLevel(tower.ability, level);
                }
            }
        }
    }
}

function paintAbilityTower(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    const abiltiyTower = ability as AbilityTower;
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;
    const paintX = Math.floor(abilityOwner.x - cameraPosition.x + centerX);
    const paintY = Math.floor(abilityOwner.y - cameraPosition.y + centerY);
    paintHammer(ctx, abiltiyTower, paintX - 10, paintY, game);
}

function paintHammer(ctx: CanvasRenderingContext2D, abilityTower: AbilityTower, paintX: number, paintY: number, game: Game) {
    let hammerImageRef = GAME_IMAGES[ABILITY_NAME_TOWER];
    loadImage(hammerImageRef);
    if (hammerImageRef.imageRef?.complete) {
        let hammerImage: HTMLImageElement = hammerImageRef.imageRef;
        ctx.translate(paintX, paintY);
        ctx.rotate(-Math.PI / 4);
        ctx.translate(-paintX, -paintY);
        paintX -= Math.floor(hammerImage.width / 2);
        paintY -= Math.floor(hammerImage.height / 2) - 2;

        ctx.drawImage(
            hammerImage,
            0,
            0,
            hammerImage.width,
            hammerImage.height,
            paintX,
            paintY,
            hammerImage.width,
            hammerImage.height
        )
        ctx.resetTransform();
    }
}

function paintAbilityObjectTower(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) {
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
                    ctx.fillStyle = "darkblue";
                } else {
                    ctx.fillStyle = "blue";
                }
            } else {
                ctx.fillStyle = "blue";
            }
        } else {
            if (abilityObject.faction === FACTION_ENEMY) {
                ctx.fillStyle = "black";
            } else {
                ctx.fillStyle = "white";
            }
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
        const curObj = abilityObjects[i];
        if (curObj.faction !== tower.faction) continue;
        if (curObj === tower) continue;
        if (curObj.type !== ABILITY_NAME_TOWER) continue;
        currentDistance = calculateDistance(curObj, tower);
        if (nearest === undefined || currentDistance < lowestDistance) {
            nearest = [curObj as AbilityObjectTower];
            lowestDistance = currentDistance;
        } else if (currentDistance === lowestDistance) {
            nearest.push(curObj as AbilityObjectTower);
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

    let characters: Character[] = getCharactersTouchingLine(game, abilityObjectTower, connectedTower, abilityObjectTower.faction);
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
    ctx.fillText(nextTower, drawStartX + 1, drawStartY + rectSize - (rectSize - fontSize) / 2);

    if (tower.playerInputBinding) {
        let keyBind = playerInputBindingToDisplayValue(tower.playerInputBinding, game);
        ctx.fillStyle = "black";
        ctx.font = "10px Arial";
        ctx.fillText(keyBind, drawStartX + 1, drawStartY + 8);
    }
}

function paintAbilityTowerStatsUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, game: Game): { width: number, height: number } {
    const abilityTower = ability as AbilityTower;
    const nextTower = abilityTower.availableAbilityKeys[abilityTower.orderOfAbilities[abilityTower.currentAbilityIndex]];
    const textLines: string[] = getAbilityNameUiText(ability);
    textLines.push(
        `Key: ${playerInputBindingToDisplayValue(abilityTower.playerInputBinding!, game)}`,
        "Click to place Tower. Tower connects to closest other Tower when placed.",
        "More connections equals stronger Tower. Connection Lines do damage.",
        `Ability of next placed Tower: ${nextTower}.`,
        "Ability stats:",
        `Max Towers: ${abilityTower.orderOfAbilities.length}`,
        `Max Click Range: ${abilityTower.maxClickRange}`,
        `Line Damage: ${abilityTower.damage}`,
        `Line Damage Increase per Connection: 15%`,
    );

    for (let i = 0; i < abilityTower.availableAbilityKeys.length; i++) {
        let key = abilityTower.availableAbilityKeys[i];
        let counter = 0;
        for (let j = 0; j < abilityTower.orderOfAbilities.length; j++) {
            if (abilityTower.orderOfAbilities[j] === i) counter++;
        }
        textLines.push(`Max ${key} Tower: ${counter}`);
    }

    return paintDefaultAbilityStatsUI(ctx, textLines, drawStartX, drawStartY);
}

function tickAbilityTower(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    let abilityTower = ability as AbilityTower;
}

function tickAbilityObjectTower(abilityObject: AbilityObject, game: Game) {
    let abilityTower = abilityObject as AbilityObjectTower;
    let mapKeyOfCharacterPosistion = positionToMapKey(abilityObject, game.state.map);
    if (!game.state.map.activeChunkKeys.includes(mapKeyOfCharacterPosistion)) return;

    if (abilityTower.lineDamageNextDamageTick === undefined) abilityTower.lineDamageNextDamageTick = game.state.time + abilityTower.lineDamageTickFrequency;
    if (abilityTower.lineDamageNextDamageTick <= game.state.time) {
        tickEffectConnected(abilityTower, game);
        abilityTower.lineDamageNextDamageTick += abilityTower.lineDamageTickFrequency;
        if (abilityTower.lineDamageNextDamageTick <= game.state.time) {
            abilityTower.lineDamageNextDamageTick = game.state.time + abilityTower.lineDamageTickFrequency;
        }
    }

    if (abilityTower.ability) {
        let abilityFunction = ABILITIES_FUNCTIONS[abilityTower.ability.name];
        if (abilityFunction.tickAbility) abilityFunction.tickAbility(abilityTower, abilityTower.ability, game);
    }
}

function createAbilityTowerUpgradeOptionsNew(ability: Ability): UpgradeOptionAndProbability[] {
    let abilityTower = ability as AbilityTower;
    let upgradeOptions: UpgradeOptionAndProbability[] = [];
    const option: AbilityUpgradeOption = {
        displayText: "Line Damage+50",
        type: "Ability",
        identifier: "Line Damage+50",
        name: ability.name,
    }
    upgradeOptions.push({
        option: option,
        probability: 1,
    });

    for (let i = 0; i < abilityTower.availableAbilityKeys.length; i++) {
        let abilityOption: AbilityUpgradeOption = {
            displayText: `Tower ${abilityTower.availableAbilityKeys[i]}+`,
            identifier: abilityTower.availableAbilityKeys[i],
            type: "Ability",
            name: ability.name,
        }
        upgradeOptions.push({
            option: abilityOption,
            probability: 1,
        });
    }

    return upgradeOptions;
}

function executeAbilityTowerUpgradeOption(ability: Ability, character: Character, upgradeOption: UpgradeOption, game: Game) {
    const abilityTower = ability as AbilityTower;
    if (upgradeOption.identifier === "Line Damage+50") {
        abilityTower.damage += 50;
        return;
    }
    for (let i = 0; i < abilityTower.availableAbilityKeys.length; i++) {
        const key = abilityTower.availableAbilityKeys[i];
        if (key === upgradeOption.identifier) {
            const addIndex = (abilityTower.currentAbilityIndex + 1) % abilityTower.orderOfAbilities.length;
            abilityTower.orderOfAbilities.splice(addIndex, 0, i);
            return;
        }
    }
}
