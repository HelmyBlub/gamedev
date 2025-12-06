import { getCharactersTouchingLine, characterTakeDamage } from "../character/character.js";
import { Character } from "../character/characterModel.js";
import { CHARACTER_TYPE_BOSS_CLONE_ENEMY, CHARACTER_TYPE_BOSS_ENEMY } from "../character/enemy/bossEnemy.js";
import { CHARACTER_TYPE_KING_ENEMY } from "../character/enemy/kingEnemy.js";
import { CHARACTER_TYPE_ENEMY_FIX_RESPAWN_POSITION, FixPositionRespawnEnemyCharacter } from "../character/enemy/fixPositionRespawnEnemyModel.js";
import { AbilityUpgradeOption, UpgradeOption, UpgradeOptionAndProbability } from "../character/upgrade.js";
import { calculateDistance, getCameraPosition, getNextId, rotateAroundPoint } from "../game.js";
import { Position, Game, IdCounter, FACTION_ENEMY, FACTION_PLAYER } from "../gameModel.js";
import { getPointPaintPosition } from "../gamePaint.js";
import { GAME_IMAGES, loadImage } from "../imageLoad.js";
import { positionToMapKey } from "../map/map.js";
import { findPlayerByCharacterId } from "../player.js";
import { PlayerAbilityActionData, playerInputBindingToDisplayValue } from "../input/playerInput.js";
import { nextRandom, RandomSeed } from "../randomNumberGenerator.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityOwner, DefaultAbilityCastData, PaintOrderAbility, abilityResetAbility, addAbilityToCharacter, getAbilityNameUiText, paintAbilityUiKeyBind } from "./ability.js";
import { ABILITY_NAME_FIRE_CIRCLE } from "./abilityFireCircle.js";
import { ABILITY_NAME_ICE_AURA } from "./abilityIceAura.js";
import { ABILITY_NAME_SHOOT } from "./abilityShoot.js";
import { ABILITY_NAME_SINGLETARGET } from "./abilitySingleTarget.js";
import { ABILITY_NAME_SWORD } from "./abilitySword.js";
import { MoreInfoPart, createMoreInfosPart } from "../moreInfo.js";
import { AbilityDamageBreakdown } from "../combatlog.js";
import { CHARACTER_TYPE_CURSE_FOUNTAIN_BOSS } from "../character/enemy/curseFountainBoss.js";
import { createAbilityTowerRotate } from "./abilityTowerRotate.js";
import { GAME_MODE_BASE_DEFENSE } from "../gameModeBaseDefense.js";
import { CHARACTER_TYPE_BOT } from "../character/playerCharacters/characterBot.js";

type AbilityObjectTower = AbilityObject & {
    ownerId: number,
    size: number,
    id: number,
    connectedToId?: number,
    ability?: Ability,
    lineDamageTickFrequency: number,
    lineDamageNextDamageTick?: number,
    isBossTower?: boolean,
    ownerEnemyLevel?: number,
    deleteTime?: number,
    relativePositon?: Position,
}

export type AbilityTower = Ability & {
    idCounter: number,
    damage: number,
    towerDamageFactor: number,
    maxClickRange: number,
    availableAbilityKeys: string[],
    currentAbilityIndex: number,
    maxTowers: number,
    lastBuildTime?: number,
    maxConnectRange?: number,
    subType?: string,
    abilityObjectsAttached?: AbilityObjectTower[],
    rotateClockwise?: boolean,
}

export const ABILITY_NAME_TOWER = "Tower";
const START_MAX_TOWER = 5;
const START_DAMAGE = 50;
const UPGRADE_DAMAGE = 250;
const UPGRADE_TOWER_COUNT_STATIONARY = 5;
const UPGRADE_TOWER_COUNT_ATTACHED = 2;
const UPGRADE_TOWER_FACTOR_PER_LEVEL = 0.15;
const ENEMY_TOWER_DESPAWN_TIME = 30000;
const SUBTYPE_STATIONARY = "Stationary";
const SUBTYPE_ATTACHED = "Attached";

GAME_IMAGES[ABILITY_NAME_TOWER] = {
    imagePath: "/images/hammer.png",
    spriteRowHeights: [20],
    spriteRowWidths: [20],
};

export function addAbilityTower() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_TOWER] = {
        activeAbilityCast: castTower,
        createAbility: createAbilityTower,
        createAbilityUpgradeOptions: createAbilityTowerUpgradeOptions,
        createAbilityMoreInfos: createAbilityTowerMoreInfos,
        createDamageBreakDown: createDamageBreakDown,
        deleteAbilityObject: deleteAbilityObjectTower,
        executeUpgradeOption: executeAbilityTowerUpgradeOption,
        paintAbilityObject: paintAbilityObjectTower,
        paintAbilityUI: paintAbilityTowerUI,
        paintAbility: paintAbilityTower,
        paintAbilityAccessoire: paintAbilityAccessoire,
        resetAbility: resetAbility,
        setAbilityToBossLevel: setAbilityTowerToBossLevel,
        setAbilityToEnemyLevel: setAbilityToEnemyLevel,
        tickAbility: tickAbilityTower,
        tickAbilityObject: tickAbilityObjectTower,
        tickAI: tickAI,
        updateOnCharcterChanges: updateOnCharcterChanges,
        canBeUsedByBosses: true,
    };
}

export function createAbilityTower(
    idCounter: IdCounter,
    playerInputBinding?: string,
    damage: number = START_DAMAGE,
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
        maxTowers: START_MAX_TOWER,
        upgrades: {},
        tradable: true,
        towerDamageFactor: 1,
    };
}

export function abilityTowerSubTypeUpgradeChoices(): UpgradeOptionAndProbability[] {
    const upgradeOptionAndProbabilities: UpgradeOptionAndProbability[] = [];
    const upgradeOption1: AbilityUpgradeOption = {
        displayText: `Stationary Towers`,
        type: "Ability",
        identifier: SUBTYPE_STATIONARY,
        displayMoreInfoText: [
            `Towers placed will stay on position of map.`,
            `Get more additional towers through upgrades.`,
            `Higher range to place towers.`,
        ],
        name: ABILITY_NAME_TOWER,
    };
    upgradeOptionAndProbabilities.push({ option: upgradeOption1, probability: 1 });
    const upgradeOption2: AbilityUpgradeOption = {
        displayText: `Attached Towers`,
        type: "Ability",
        identifier: SUBTYPE_ATTACHED,
        displayMoreInfoText: [`Towers placed will attach relative to player.`],
        name: ABILITY_NAME_TOWER,
    };
    upgradeOptionAndProbabilities.push({ option: upgradeOption2, probability: 1 });
    return upgradeOptionAndProbabilities;
}


function updateOnCharcterChanges(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilityTower = ability as AbilityTower;
    const isBossTower = (abilityOwner.type === CHARACTER_TYPE_BOSS_ENEMY || abilityOwner.type === CHARACTER_TYPE_KING_ENEMY || abilityOwner.type === CHARACTER_TYPE_CURSE_FOUNTAIN_BOSS);
    if (abilityTower.abilityObjectsAttached) {
        for (let object of abilityTower.abilityObjectsAttached) {
            object.isBossTower = isBossTower;
            object.ownerId = abilityOwner.id;
            object.faction = abilityOwner.faction;
        }
    }
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
    abilityTower.rotateClockwise = undefined;
    if (abilityTower.abilityObjectsAttached) {
        for (let attached of abilityTower.abilityObjectsAttached) {
            attached.lineDamageNextDamageTick = undefined;
            if (attached.ability) abilityResetAbility(attached.ability);
        }
    }
}

function createDamageBreakDown(damage: number, ability: Ability, abilityObject: AbilityObject | undefined, damageAbilityName: string, game: Game): AbilityDamageBreakdown[] {
    const tower = ability as AbilityTower;
    const damageBreakDown: AbilityDamageBreakdown[] = [];
    if (abilityObject) {
        damageBreakDown.push({
            damage: damage,
            name: abilityObject.type,
        });
    } else {
        damageBreakDown.push({
            damage: damage,
            name: damageAbilityName,
        });
    }

    return damageBreakDown;
}


function setAbilityToEnemyLevel(ability: Ability, level: number, damageFactor: number) {
    const abilityTower = ability as AbilityTower;
    abilityTower.maxTowers = 3;
    abilityTower.currentAbilityIndex = level % abilityTower.availableAbilityKeys.length;
    abilityTower.damage = level * 2;
    abilityTower.maxConnectRange = 300;
}

function setAbilityTowerToBossLevel(ability: Ability, level: number) {
    const abilityTower = ability as AbilityTower;
    abilityTower.maxTowers = level * 3;
    abilityTower.damage = level * 10;
    abilityTower.maxConnectRange = 800;
    if (abilityTower.abilityObjectsAttached) {
        abilityTower.maxTowers = 2 + level;
        const abilityObjects = abilityTower.abilityObjectsAttached.slice(0, abilityTower.maxTowers);
        updateTowerObjectAbilityLevels(abilityObjects, abilityTower);
        for (let object of abilityObjects) {
            const objectTower = object as AbilityObjectTower;
            objectTower.damage = 10 * level;
        }
    }
}

function tickAI(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilityTower = ability as AbilityTower;
    if (abilityTower.subType === SUBTYPE_ATTACHED) {
        if (abilityTower.maxTowers <= abilityTower.abilityObjectsAttached!.length) {
            return;
        }
    }
    const buildFrequency = 1000;
    if (abilityTower.lastBuildTime === undefined || abilityTower.lastBuildTime + buildFrequency <= game.state.time) {
        if (game.state.gameMode === GAME_MODE_BASE_DEFENSE) {
            if (abilityOwner.type === CHARACTER_TYPE_BOT && abilityTower.subType === SUBTYPE_STATIONARY
                && getTowerCountOfOwner(game.state.abilityObjects, abilityOwner.id) >= Math.min(15, abilityTower.maxTowers)
            ) {
                abilityTower.lastBuildTime = game.state.time + buildFrequency;
                return;
            }
        }
        const pos: Position = {
            x: abilityOwner.x + (nextRandom(game.state.randomSeed) * 50 - 25),
            y: abilityOwner.y + (nextRandom(game.state.randomSeed) * 50 - 25)
        };
        const defaultData: DefaultAbilityCastData = {
            action: "AI",
            isKeydown: true,
            castPosition: pos,
        };
        castTower(abilityOwner, ability, defaultData, game);
    }
}

function deleteAbilityObjectTower(abilityObject: AbilityObject, game: Game) {
    const abilityObjectTower = abilityObject as AbilityObjectTower;
    if (abilityObjectTower.deleteTime !== undefined && abilityObjectTower.deleteTime <= game.state.time) {
        updateTowersWhichHaveDeletedId(game.state.abilityObjects, abilityObjectTower.id);
        return true;
    }
    return false;
}

function castTower(abilityOwner: AbilityOwner, ability: Ability, data: PlayerAbilityActionData, game: Game) {
    if (!data.isKeydown) return;
    const abilityTower = ability as AbilityTower;
    if (abilityTower.subType === undefined && abilityOwner.characterClasses) {
        const charClass = abilityOwner.characterClasses.find(c => c.id === ability.classIdRef);
        if (charClass && charClass.availableSkillPoints && charClass.availableSkillPoints.used > 0) {
            abilityTower.subType = SUBTYPE_STATIONARY;
        } else {
            return;
        }
    }
    const castPosition = (data as DefaultAbilityCastData).castPosition!;
    const distance = calculateDistance(abilityOwner, castPosition);
    if (distance > abilityTower.maxClickRange) return;
    let abilityObjects = game.state.abilityObjects;
    if (abilityTower.subType === SUBTYPE_ATTACHED) {
        abilityObjects = abilityTower.abilityObjectsAttached!;
    }

    if (getTowerCountOfOwner(abilityObjects, abilityOwner.id) >= abilityTower.maxTowers) {
        const deletedId = deleteOldesTowerOfOwnerAndReturnDeletedId(abilityObjects, abilityOwner.id);
        updateTowersWhichHaveDeletedId(abilityObjects, deletedId);
    }

    const nextAbilityKey = abilityTower.availableAbilityKeys[abilityTower.currentAbilityIndex];
    const nextAbility: Ability = ABILITIES_FUNCTIONS[nextAbilityKey].createAbility(game.state.idCounter);
    if (!nextAbility.passive) nextAbility.passive = true;
    nextAbility.id = abilityTower.id;
    abilityTower.currentAbilityIndex = (abilityTower.currentAbilityIndex + 1) % abilityTower.availableAbilityKeys.length;
    const newTower: AbilityObjectTower = createAbilityObjectTower(game.state.idCounter, abilityOwner.id, abilityOwner.faction, castPosition, nextAbility, abilityTower.damage);
    newTower.abilityIdRef = ability.id;
    if (abilityOwner.faction === FACTION_ENEMY) {
        if (abilityOwner.type === CHARACTER_TYPE_BOSS_ENEMY || abilityOwner.type === CHARACTER_TYPE_KING_ENEMY || abilityOwner.type === CHARACTER_TYPE_CURSE_FOUNTAIN_BOSS) {
            newTower.isBossTower = true;
        } else if (abilityOwner.level?.level) {
            newTower.ownerEnemyLevel = abilityOwner.level!.level;
        }
        newTower.deleteTime = game.state.time + ENEMY_TOWER_DESPAWN_TIME;
    }
    const nearest = getNearestTower(abilityObjects, newTower, game.state.randomSeed, abilityTower.maxConnectRange);
    if (nearest) {
        newTower.connectedToId = nearest.id;
    }
    if (abilityTower.subType === SUBTYPE_ATTACHED) {
        newTower.relativePositon = {
            x: newTower.x - abilityOwner.x,
            y: newTower.y - abilityOwner.y,
        };
    }
    abilityObjects.push(newTower);
    abilityTower.lastBuildTime = game.state.time;
    updateTowerObjectAbilityLevels(abilityObjects, abilityTower);
}

function updateTowersWhichHaveDeletedId(abilityObjects: AbilityObject[], deletedId: number) {
    for (let abilityObject of abilityObjects) {
        if (abilityObject.type === ABILITY_NAME_TOWER) {
            const abilityTower = abilityObject as AbilityObjectTower;
            if (abilityTower.connectedToId !== undefined && abilityTower.connectedToId === deletedId) {
                delete abilityTower.connectedToId;
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

function updateTowerObjectAbilityLevels(abilityObjects: AbilityObject[], abilityTower: AbilityTower) {
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
            } else if (tower.faction === FACTION_ENEMY) {
                if (abilityFunctions.setAbilityToEnemyLevel) {
                    const damageFactor = Math.max(tower.ownerEnemyLevel! / 10, 1);
                    const additionalLevel = Math.floor(tower.ownerEnemyLevel! / 5);
                    abilityFunctions.setAbilityToEnemyLevel(tower.ability, level + additionalLevel, damageFactor);
                }
            } else {
                if (abilityFunctions.setAbilityToLevel) {
                    abilityFunctions.setAbilityToLevel(tower.ability, level);
                    const hasDamageAbility = tower.ability as any;
                    if (tower.abilityIdRef === abilityTower.id && abilityTower.towerDamageFactor > 1 && hasDamageAbility.damage != undefined) {
                        hasDamageAbility.damage *= abilityTower.towerDamageFactor;
                    }
                }
            }
        }
    }
}

function paintAbilityTower(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    const abilityTower = ability as AbilityTower;
    const paintPos = getPointPaintPosition(ctx, abilityOwner, cameraPosition, game.UI.zoom);
    paintHammer(ctx, abilityTower, paintPos.x - 10, paintPos.y, game);
    if (ability.disabled) return;
    if (abilityTower.abilityObjectsAttached) {
        let counter = 0;
        for (let tower of abilityTower.abilityObjectsAttached) {
            counter++;
            if (counter > abilityTower.maxTowers) break;
            paintAbilityObjectTower(ctx, tower, "beforeCharacterPaint", game, abilityTower);
        }
        counter = 0;
        for (let tower of abilityTower.abilityObjectsAttached) {
            counter++;
            if (counter > abilityTower.maxTowers) break;
            paintAbilityObjectTower(ctx, tower, "afterCharacterPaint", game, abilityTower);
        }
    }
}

function paintAbilityAccessoire(ctx: CanvasRenderingContext2D, ability: Ability, paintPosition: Position, game: Game) {
    const abilitySnipe = ability as AbilityTower;
    paintHammer(ctx, abilitySnipe, paintPosition.x, paintPosition.y, game);
}

function paintHammer(ctx: CanvasRenderingContext2D, abilityTower: AbilityTower, paintX: number, paintY: number, game: Game) {
    const hammerImageRef = GAME_IMAGES[ABILITY_NAME_TOWER];
    loadImage(hammerImageRef);
    if (hammerImageRef.imageRef?.complete) {
        const hammerImage: HTMLImageElement = hammerImageRef.imageRef;
        const rotation = -Math.PI / 4;
        ctx.save();
        ctx.translate(paintX, paintY);
        ctx.rotate(rotation);
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
        ctx.restore();
    }
}

function paintAbilityObjectTower(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game, abilityTower: AbilityTower | undefined = undefined) {
    const cameraPosition = getCameraPosition(game);
    const tower = abilityObject as AbilityObjectTower;
    let abilityObjects = game.state.abilityObjects;
    if (abilityTower) {
        abilityObjects = abilityTower.abilityObjectsAttached!;
        if (tower.faction === FACTION_ENEMY && abilityObjects.length > abilityTower.maxTowers) {
            abilityObjects = abilityObjects.slice(0, abilityTower.maxTowers);
        }
    }

    if (paintOrder === "beforeCharacterPaint") {
        paintEffectConnected(ctx, tower, cameraPosition, abilityObjects, game);
    } else if (paintOrder === "afterCharacterPaint") {
        const owner = findPlayerByCharacterId(game.state.players, tower.ownerId);
        const towerBaseSize = tower.size;
        const towerHeight = towerBaseSize + 5;
        let paintPos = getPointPaintPosition(ctx, tower, cameraPosition, game.UI.zoom);
        paintPos.x -= towerBaseSize / 2;
        paintPos.y -= towerBaseSize / 2;
        if (owner?.clientId === game.multiplayer.myClientId) {
            const ability = owner.character.abilities.find((e) => e.name === ABILITY_NAME_TOWER) as AbilityTower;
            if (ability && getTowerCountOfOwner(game.state.abilityObjects, tower.ownerId) >= ability.maxTowers) {
                const oldestTower = findOldesTowerOfOwner(abilityObjects, tower.ownerId)?.tower;
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
    if (tower.connectedToId !== undefined) counter++;
    for (let abilityObject of abilityObjects) {
        if (abilityObject.type === ABILITY_NAME_TOWER) {
            const abilityTower = abilityObject as AbilityObjectTower;
            if (abilityTower.connectedToId !== undefined && abilityTower.connectedToId === tower.id) {
                counter++;
            }
        }
    }

    return counter;
}

function paintEffectConnected(ctx: CanvasRenderingContext2D, abilityObjectTower: AbilityObjectTower, cameraPosition: Position, abilityObjects: AbilityObject[], game: Game) {
    if (abilityObjectTower.connectedToId !== undefined) {
        ctx.strokeStyle = "red";
        if (abilityObjectTower.faction === FACTION_ENEMY) {
            ctx.strokeStyle = "black";
        }
        const connectedTower = getTowerById(abilityObjects, abilityObjectTower.connectedToId);
        if (connectedTower === undefined) {
            console.log("tower connection not cleaned up");
            return;
        }
        const totalConnection = getTowerConnectionCount(abilityObjects, abilityObjectTower) + getTowerConnectionCount(abilityObjects, connectedTower);
        ctx.lineWidth = totalConnection;


        if (abilityObjectTower.faction === FACTION_PLAYER) ctx.globalAlpha *= game.UI.playerGlobalAlphaMultiplier;
        ctx.beginPath();
        let paintPos = getPointPaintPosition(ctx, abilityObjectTower, cameraPosition, game.UI.zoom);
        ctx.moveTo(paintPos.x, paintPos.y);
        paintPos = getPointPaintPosition(ctx, connectedTower, cameraPosition, game.UI.zoom);
        ctx.lineTo(paintPos.x, paintPos.y);
        ctx.stroke();
        ctx.globalAlpha = 1;
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

function getNearestTower(abilityObjects: AbilityObject[], tower: AbilityObjectTower, randomSeed: RandomSeed, maxDistance?: number): AbilityObjectTower | undefined {
    let currentDistance: number;
    let lowestDistance: number = 0;
    let nearest: AbilityObjectTower[] | undefined = undefined;
    for (let i = 0; i < abilityObjects.length; i++) {
        const curObj = abilityObjects[i];
        if (curObj.faction !== tower.faction) continue;
        if (curObj === tower) continue;
        if (curObj.type !== ABILITY_NAME_TOWER) continue;
        currentDistance = calculateDistance(curObj, tower);
        if (maxDistance && currentDistance >= maxDistance) continue;
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

function tickEffectConnected(abilityObjectTower: AbilityObjectTower, game: Game, abilityTower: AbilityTower | undefined = undefined) {
    if (abilityObjectTower.connectedToId === undefined) return;
    let abilityObjects = game.state.abilityObjects;
    if (abilityTower) {
        abilityObjects = abilityTower.abilityObjectsAttached!;
        if (abilityObjectTower.faction === FACTION_ENEMY && abilityObjects.length > abilityTower.maxTowers) {
            abilityObjects = abilityObjects.slice(0, abilityTower.maxTowers);
        }
    }

    const connectedTower = getTowerById(abilityObjects, abilityObjectTower.connectedToId);
    if (connectedTower === undefined) {
        console.log("tower connection not cleaned up");
        return;
    }
    const towerConnectionCounter = getTowerConnectionCount(abilityObjects, abilityObjectTower) + getTowerConnectionCount(abilityObjects, connectedTower);
    const damageFactor = 0.7 + (towerConnectionCounter * 0.15);

    const characters: Character[] = getCharactersTouchingLine(game, abilityObjectTower, connectedTower, abilityObjectTower.faction);
    for (let char of characters) {
        characterTakeDamage(char, abilityObjectTower.damage * damageFactor, game, abilityObjectTower.abilityIdRef, abilityObjectTower.type + " Line");
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
    const nextTower = tower.availableAbilityKeys[tower.currentAbilityIndex];
    ctx.fillText(nextTower, drawStartX + 1, drawStartY + rectSize - (rectSize - fontSize) / 2);

    if (tower.playerInputBinding) {
        paintAbilityUiKeyBind(ctx, tower.playerInputBinding, drawStartX, drawStartY, game);
    }
}

function createAbilityTowerMoreInfos(ctx: CanvasRenderingContext2D, ability: Ability, game: Game): MoreInfoPart {
    const abilityTower = ability as AbilityTower;
    const nextTower = abilityTower.availableAbilityKeys[abilityTower.currentAbilityIndex];
    const textLines: string[] = getAbilityNameUiText(ability);
    textLines.push(
        `Key: ${playerInputBindingToDisplayValue(abilityTower.playerInputBinding!, game)}`,
        "Click to place Tower. Tower connects to closest other Tower when placed.",
        "More connections equals stronger Tower. Connection Lines do damage.",
        `Ability of next placed Tower: ${nextTower}.`,
        "Ability stats:",
        `Max Towers: ${abilityTower.maxTowers}`,
        `Max Click Range: ${abilityTower.maxClickRange}`,
        `Line Damage: ${abilityTower.damage}`,
        `Line Damage Increase per Connection: 15%`,
        `Bonus Tower Damage: ${((abilityTower.towerDamageFactor - 1) * 100).toFixed()}%`,
    );

    textLines.push(`Towers Types:`);
    for (let i = 0; i < abilityTower.availableAbilityKeys.length; i++) {
        const key = abilityTower.availableAbilityKeys[i];
        textLines.push(`  - ${key}`);
    }

    return createMoreInfosPart(ctx, textLines);
}

function tickAbilityTower(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilityTower = ability as AbilityTower;
    if (abilityTower.abilityObjectsAttached) {
        let counter = 0;
        for (let objectTower of abilityTower.abilityObjectsAttached) {
            counter++;
            if (counter > abilityTower.maxTowers) break;
            objectTower.x = abilityOwner.x + objectTower.relativePositon!.x;
            objectTower.y = abilityOwner.y + objectTower.relativePositon!.y;
            tickAbilityObjectTower(objectTower, game, abilityTower);
        }
        for (let objectTower of abilityTower.abilityObjectsAttached) {
            if (abilityTower.rotateClockwise) {
                objectTower.relativePositon = rotateAroundPoint(objectTower.relativePositon!, { x: 0, y: 0 }, 0.01);
            } else if (abilityTower.rotateClockwise === false) {
                objectTower.relativePositon = rotateAroundPoint(objectTower.relativePositon!, { x: 0, y: 0 }, -0.01);
            }
        }
    }
}

function tickAbilityObjectTower(abilityObject: AbilityObject, game: Game, abilityTower: AbilityTower | undefined = undefined) {
    const objectTower = abilityObject as AbilityObjectTower;
    const mapKeyOfCharacterPosistion = positionToMapKey(abilityObject, game.state.map);
    if (!game.state.map.activeChunkKeys.includes(mapKeyOfCharacterPosistion)) return;

    if (objectTower.lineDamageNextDamageTick === undefined) objectTower.lineDamageNextDamageTick = game.state.time + objectTower.lineDamageTickFrequency;
    if (objectTower.lineDamageNextDamageTick <= game.state.time) {
        tickEffectConnected(objectTower, game, abilityTower);
        objectTower.lineDamageNextDamageTick += objectTower.lineDamageTickFrequency;
        if (objectTower.lineDamageNextDamageTick <= game.state.time) {
            objectTower.lineDamageNextDamageTick = game.state.time + objectTower.lineDamageTickFrequency;
        }
    }

    if (objectTower.ability) {
        const abilityFunction = ABILITIES_FUNCTIONS[objectTower.ability.name];
        if (abilityFunction.tickAbility) abilityFunction.tickAbility(objectTower, objectTower.ability, game);
    }
}

function createAbilityTowerUpgradeOptions(ability: Ability): UpgradeOptionAndProbability[] {
    const abilityTower = ability as AbilityTower;
    const upgradeOptions: UpgradeOptionAndProbability[] = [];
    const additionalTowers = abilityTower.abilityObjectsAttached ? UPGRADE_TOWER_COUNT_ATTACHED : UPGRADE_TOWER_COUNT_STATIONARY;
    const upgradeCountTower = abilityTower.maxTowers > START_MAX_TOWER ? ` (${(abilityTower.maxTowers - START_MAX_TOWER) / additionalTowers + 1})` : "";
    const upgradeCountDamage = abilityTower.damage > START_DAMAGE ? ` (${(abilityTower.damage - START_DAMAGE) / UPGRADE_DAMAGE + 1})` : "";
    const upgradeCountTowerDamage = abilityTower.towerDamageFactor > 1 ? ` (${((abilityTower.towerDamageFactor - 1) / UPGRADE_TOWER_FACTOR_PER_LEVEL + 1).toFixed()})` : "";
    const option: AbilityUpgradeOption = {
        displayText: `Line Damage +${UPGRADE_DAMAGE}${upgradeCountDamage}`,
        type: "Ability",
        identifier: "Line Damage",
        displayMoreInfoText: [`Increase line damage from ${abilityTower.damage} to ${abilityTower.damage + UPGRADE_DAMAGE}`],
        name: ability.name,
    }
    upgradeOptions.push({
        option: option,
        probability: 1,
    });

    const towerFactor: AbilityUpgradeOption = {
        displayText: `Tower Damage +${UPGRADE_TOWER_FACTOR_PER_LEVEL * 100}%${upgradeCountTowerDamage}`,
        type: "Ability",
        identifier: "Tower Damage Factor",
        displayMoreInfoText: [`Increase bonus tower damage from ${((abilityTower.towerDamageFactor - 1) * 100).toFixed()}% to ${((abilityTower.towerDamageFactor + UPGRADE_TOWER_FACTOR_PER_LEVEL - 1) * 100).toFixed()}%`],
        name: ability.name,
    }
    upgradeOptions.push({
        option: towerFactor,
        probability: 1,
    });

    const abilityOption: AbilityUpgradeOption = {
        displayText: `Max Towers +${additionalTowers}${upgradeCountTower}`,
        identifier: `Max Towers`,
        type: "Ability",
        displayMoreInfoText: [`Increase max towers from ${abilityTower.maxTowers} to ${abilityTower.maxTowers + additionalTowers}`],
        name: ability.name,
    }
    upgradeOptions.push({
        option: abilityOption,
        probability: 4,
    });

    return upgradeOptions;
}

function executeAbilityTowerUpgradeOption(ability: Ability, character: Character, upgradeOption: UpgradeOption, game: Game) {
    const abilityTower = ability as AbilityTower;
    if (upgradeOption.identifier === "Line Damage") {
        abilityTower.damage += UPGRADE_DAMAGE;
        if (abilityTower.abilityObjectsAttached) {
            for (let object of abilityTower.abilityObjectsAttached) {
                object.damage = abilityTower.damage;
            }
        } else if (game.state.gameMode === GAME_MODE_BASE_DEFENSE) {
            for (let object of game.state.abilityObjects) {
                if (object.type === ABILITY_NAME_TOWER) {
                    const tower = object as AbilityObjectTower;
                    if (tower.abilityIdRef === ability.id) object.damage = abilityTower.damage;
                }
            }
        }
        return;
    }
    if (upgradeOption.identifier === "Tower Damage Factor") {
        if (!abilityTower.towerDamageFactor) abilityTower.towerDamageFactor = 1;
        abilityTower.towerDamageFactor += UPGRADE_TOWER_FACTOR_PER_LEVEL;
        if (abilityTower.abilityObjectsAttached) {
            updateTowerObjectAbilityLevels(abilityTower.abilityObjectsAttached, abilityTower);
        } else if (game.state.gameMode === GAME_MODE_BASE_DEFENSE) {
            updateTowerObjectAbilityLevels(game.state.abilityObjects, abilityTower);
        }
        return;
    }
    if (upgradeOption.identifier === "Max Towers") {
        abilityTower.maxTowers += abilityTower.abilityObjectsAttached ? UPGRADE_TOWER_COUNT_ATTACHED : UPGRADE_TOWER_COUNT_STATIONARY;
        return;
    }
    if (upgradeOption.identifier === SUBTYPE_STATIONARY) {
        abilityTower.subType = SUBTYPE_STATIONARY;
        return;
    }
    if (upgradeOption.identifier === SUBTYPE_ATTACHED) {
        abilityTower.subType = SUBTYPE_ATTACHED;
        abilityTower.abilityObjectsAttached = [];
        abilityTower.maxClickRange *= 0.5;
        const charClass = character.characterClasses!.find(c => c.id === abilityTower.classIdRef);
        addAbilityToCharacter(character, createAbilityTowerRotate(game.state.idCounter, "ability2", true), charClass);
        addAbilityToCharacter(character, createAbilityTowerRotate(game.state.idCounter, "ability3", false), charClass);
        return;
    }
}
