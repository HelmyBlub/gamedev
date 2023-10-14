import { getCharactersTouchingLine, characterTakeDamage } from "../character/character.js";
import { Character } from "../character/characterModel.js";
import { CHARACTER_TYPE_BOSS_ENEMY } from "../character/enemy/bossEnemy.js";
import { CHARACTER_TYPE_END_BOSS_ENEMY } from "../character/enemy/endBossEnemy.js";
import { AbilityUpgradeOption, UpgradeOption, UpgradeOptionAndProbability } from "../character/upgrade.js";
import { calculateDistance, getCameraPosition, getNextId } from "../game.js";
import { Position, Game, IdCounter, FACTION_ENEMY } from "../gameModel.js";
import { getPointPaintPosition } from "../gamePaint.js";
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
    deleteTime?: number,
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
const BOSS_TOWE_DESPAWN_TIME = 30000;
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
    const maxNumberTowers = 5;
    const keys = getRandomPassiveAbilitiyKeys();
    const availableAbilities = [];
    const orderOfAbilities = [];
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
    const abilityTower = ability as AbilityTower;
    abilityTower.damage = level * 10;
}


function tickBossAI(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilityTower = ability as AbilityTower;
    const buildFrequency = 1000;
    if (abilityTower.lastBuildTime === undefined || abilityTower.lastBuildTime + buildFrequency <= game.state.time) {
        const pos: Position = {
            x: abilityOwner.x + (nextRandom(game.state.randomSeed) * 50 - 25),
            y: abilityOwner.y + (nextRandom(game.state.randomSeed) * 50 - 25)
        };
        castTower(abilityOwner, ability, pos, true, game);
    }
}

function deleteAbilityObjectTower(abilityObject: AbilityObject, game: Game) {
    const abilityObjectTower = abilityObject as AbilityObjectTower;
    if(abilityObjectTower.deleteTime !== undefined && abilityObjectTower.deleteTime <= game.state.time){
        return true;
    }
    return false;
}

function castTower(abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, isKeydown: boolean, game: Game) {
    if (!isKeydown) return;
    const abilityTower = ability as AbilityTower;
    const distance = calculateDistance(abilityOwner, castPosition);
    if (distance > abilityTower.maxClickRange) return;
    const abilityObjects = game.state.abilityObjects;

    if (getTowerCountOfOwner(abilityObjects, abilityOwner.id) >= abilityTower.orderOfAbilities.length) {
        const deletedId = deleteOldesTowerOfOwnerAndReturnDeletedId(abilityObjects, abilityOwner.id);
        updateTowersWhichHadDeletedId(abilityObjects, deletedId);
    }

    const nextAbilityKey = abilityTower.availableAbilityKeys[abilityTower.orderOfAbilities[abilityTower.currentAbilityIndex]];
    const nextAbility: Ability = ABILITIES_FUNCTIONS[nextAbilityKey].createAbility(game.state.idCounter);
    if (!nextAbility.passive) nextAbility.passive = true;
    abilityTower.currentAbilityIndex = (abilityTower.currentAbilityIndex + 1) % abilityTower.orderOfAbilities.length;
    const newTower: AbilityObjectTower = createAbilityObjectTower(game.state.idCounter, abilityOwner.id, abilityOwner.faction, castPosition, nextAbility, abilityTower.damage);
    if (abilityOwner.type === CHARACTER_TYPE_BOSS_ENEMY || abilityOwner.type === CHARACTER_TYPE_END_BOSS_ENEMY) {
        newTower.isBossTower = true;
        newTower.deleteTime = game.state.time + BOSS_TOWE_DESPAWN_TIME;
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
            const abilityTower = abilityObject as AbilityObjectTower;
            if (abilityTower.conntetedToId !== undefined && abilityTower.conntetedToId === deletedId) {
                delete abilityTower.conntetedToId;
            }
        }
    }
}

function findOldesTowerOfOwner(abilityObjects: AbilityObject[], ownerId: number): { tower: AbilityObjectTower, index: number } | undefined {
    for (let i = 0; i < abilityObjects.length; i++) {
        if (abilityObjects[i].type === ABILITY_NAME_TOWER) {
            const abilityTower = abilityObjects[i] as AbilityObjectTower;
            if (abilityTower.ownerId === ownerId) {
                return { tower: abilityTower, index: i };
            }
        }
    }
    return undefined;
}

function deleteOldesTowerOfOwnerAndReturnDeletedId(abilityObjects: AbilityObject[], ownerId: number): number {
    const oldestTowerIndex = findOldesTowerOfOwner(abilityObjects, ownerId)?.index;
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
        const tower: AbilityObjectTower = abilityObject as AbilityObjectTower;
        const level = getTowerConnectionCount(abilityObjects, tower) + 1;
        if (tower.ability) {
            const abilityFunctions = ABILITIES_FUNCTIONS[tower.ability.name];
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
    const paintPos = getPointPaintPosition(ctx, abilityOwner, cameraPosition);
    paintHammer(ctx, abiltiyTower, paintPos.x - 10, paintPos.y, game);
}

function paintHammer(ctx: CanvasRenderingContext2D, abilityTower: AbilityTower, paintX: number, paintY: number, game: Game) {
    const hammerImageRef = GAME_IMAGES[ABILITY_NAME_TOWER];
    loadImage(hammerImageRef);
    if (hammerImageRef.imageRef?.complete) {
        const hammerImage: HTMLImageElement = hammerImageRef.imageRef;
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
    const cameraPosition = getCameraPosition(game);
    const tower = abilityObject as AbilityObjectTower;

    if (paintOrder === "beforeCharacterPaint") {
        paintEffectConnected(ctx, tower, cameraPosition, game.state.abilityObjects);
    } else if (paintOrder === "afterCharacterPaint") {
        const owner = findPlayerByCharacterId(game.state.players, tower.ownerId);
        const towerBaseSize = tower.size;
        const towerHeight = towerBaseSize + 5;
        let paintPos = getPointPaintPosition(ctx, tower, cameraPosition);
        paintPos.x -= towerBaseSize / 2;
        paintPos.y -= towerBaseSize / 2;
        if (owner?.clientId === game.multiplayer.myClientId) {
            const ability = owner.character.abilities.find((e) => e.name === ABILITY_NAME_TOWER) as AbilityTower;
            if (getTowerCountOfOwner(game.state.abilityObjects, tower.ownerId) >= ability.orderOfAbilities.length) {
                const oldestTower = findOldesTowerOfOwner(game.state.abilityObjects, tower.ownerId)?.tower;
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
        ctx.fillRect(paintPos.x, paintPos.y, towerBaseSize, towerHeight);

        if (tower.ability) {
            const abilityFunction = ABILITIES_FUNCTIONS[tower.ability.name];
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
            const abilityTower = abilityObject as AbilityObjectTower;
            if (abilityTower.conntetedToId !== undefined && abilityTower.conntetedToId === tower.id) {
                counter++;
            }
        }
    }

    return counter;
}

function paintEffectConnected(ctx: CanvasRenderingContext2D, abilityObjectTower: AbilityObjectTower, cameraPosition: Position, abilityObjects: AbilityObject[]) {
    if (abilityObjectTower.conntetedToId !== undefined) {
        ctx.strokeStyle = "red";
        const connectedTower = getTowerById(abilityObjects, abilityObjectTower.conntetedToId);
        if (connectedTower === undefined) {
            console.log("tower connection not cleaned up");
            return;
        }
        const totalConnection = getTowerConnectionCount(abilityObjects, abilityObjectTower) + getTowerConnectionCount(abilityObjects, connectedTower);
        ctx.lineWidth = totalConnection;

        ctx.beginPath();
        let paintPos = getPointPaintPosition(ctx, abilityObjectTower, cameraPosition);
        ctx.moveTo(paintPos.x, paintPos.y);
        paintPos = getPointPaintPosition(ctx, connectedTower, cameraPosition);
        ctx.lineTo(paintPos.x, paintPos.y);
        ctx.stroke();
    }
}

function getTowerById(abilityObjects: AbilityObject[], id: number): AbilityObjectTower | undefined {
    for (let i = 0; i < abilityObjects.length; i++) {
        if (abilityObjects[i].type === ABILITY_NAME_TOWER) {
            const tower: AbilityObjectTower = abilityObjects[i] as AbilityObjectTower;
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
        const randomIndex = nearest.length > 1 ? Math.floor(nextRandom(randomSeed) * nearest.length) : 0;
        return nearest[randomIndex];
    } else {
        return undefined;
    }
}

function tickEffectConnected(abilityObjectTower: AbilityObjectTower, game: Game) {
    if (abilityObjectTower.conntetedToId === undefined) return;
    const abilityObjects = game.state.abilityObjects;
    const connectedTower = getTowerById(abilityObjects, abilityObjectTower.conntetedToId);
    if (connectedTower === undefined) {
        console.log("tower connection not cleaned up");
        return;
    }
    const towerConnectionCounter = getTowerConnectionCount(abilityObjects, abilityObjectTower) + getTowerConnectionCount(abilityObjects, connectedTower);
    const damageFactor = 0.7 + (towerConnectionCounter * 0.15);

    const characters: Character[] = getCharactersTouchingLine(game, abilityObjectTower, connectedTower, abilityObjectTower.faction);
    for (let char of characters) {
        characterTakeDamage(char, abilityObjectTower.damage * damageFactor, game);
    }
}

function paintAbilityTowerUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) {
    const tower = ability as AbilityTower;
    const fontSize = 12;
    const rectSize = size;

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
        const keyBind = playerInputBindingToDisplayValue(tower.playerInputBinding, game);
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
        const key = abilityTower.availableAbilityKeys[i];
        let counter = 0;
        for (let j = 0; j < abilityTower.orderOfAbilities.length; j++) {
            if (abilityTower.orderOfAbilities[j] === i) counter++;
        }
        textLines.push(`Max ${key} Tower: ${counter}`);
    }

    return paintDefaultAbilityStatsUI(ctx, textLines, drawStartX, drawStartY);
}

function tickAbilityTower(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilityTower = ability as AbilityTower;
}

function tickAbilityObjectTower(abilityObject: AbilityObject, game: Game) {
    const abilityTower = abilityObject as AbilityObjectTower;
    const mapKeyOfCharacterPosistion = positionToMapKey(abilityObject, game.state.map);
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
        const abilityFunction = ABILITIES_FUNCTIONS[abilityTower.ability.name];
        if (abilityFunction.tickAbility) abilityFunction.tickAbility(abilityTower, abilityTower.ability, game);
    }
}

function createAbilityTowerUpgradeOptionsNew(ability: Ability): UpgradeOptionAndProbability[] {
    const abilityTower = ability as AbilityTower;
    const upgradeOptions: UpgradeOptionAndProbability[] = [];
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
        const abilityOption: AbilityUpgradeOption = {
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
