import { ABILITIES_FUNCTIONS, createAbility, setAbilityToBossLevel } from "../../../ability/ability.js";
import { applyDebuff, removeCharacterDebuffs, tickCharacterDebuffs } from "../../../debuff/debuff.js";
import { calculateDirection, calculateDistance, getNextId } from "../../../game.js";
import { IdCounter, Game, Position, FACTION_ENEMY } from "../../../gameModel.js";
import { determineClosestCharacter, calculateAndSetMoveDirectionToPositionWithPathing, getPlayerCharacters, moveCharacterTick } from "../../character.js";
import { CHARACTER_TYPE_FUNCTIONS, Character, IMAGE_SLIME, createCharacter } from "../../characterModel.js";
import { paintCharacterAbilties } from "../../characterPaint.js";
import { PathingCache } from "../../pathing.js";
import { paintKingHpBar } from "../kingEnemy.js";
import { GameMapGodArea, getGodAreaMiddlePosition } from "../../../map/mapGodArea.js";
import { ABILITY_NAME_SEEKER, addGodAbilitySeeker } from "./abilitySeeker.js";
import { ABILITY_NAME_MOVING_FIRE, addGodAbilityMovingFire } from "./abilityMovingFire.js";
import { ABILITY_NAME_TILE_EXPLOSION, addGodAbilityTileExplosion } from "./abilityTileExplosions.js";
import { ABILITY_NAME_MELEE, AbilityMelee } from "../../../ability/abilityMelee.js";
import { GodAbility, setGodAbilityPickUpPosition } from "./godAbility.js";
import { createDebuffDamageTaken } from "../../../debuff/debuffDamageTaken.js";
import { ABILITY_NAME_GOD_IMMUNITY, addGodAbilityGodImmunity } from "./abilityGodImmunity.js";
import { getPointPaintPosition } from "../../../gamePaint.js";
import { MoreInfosPartContainer, createCharacterMoreInfosPartContainer } from "../../../moreInfo.js";
import { doDamageMeterSplit } from "../../../combatlog.js";
import { addMoneyAmountToPlayer, calculateMoneyForKingMaxHp } from "../../../player.js";


const FIRST_PICK_UP_DELAY = 3000;
export type GodEnemyCharacter = Character & {
    pickUpAbilityIndex?: number,
    pickUpCount: number,
    allAbilitiesPickedUp?: boolean,
    firstAttackedTime?: number,
    animationState: {
        state: "sleeping" | "waking up" | "angry",
        data: any[],
    }
    hardModeActivated?: boolean,
};

export const CHARACTER_TYPE_GOD_ENEMY = "GodEnemyCharacter";

export function addGodEnemyType() {
    CHARACTER_TYPE_FUNCTIONS[CHARACTER_TYPE_GOD_ENEMY] = {
        tickFunction: tickEnemyCharacter,
        paintCharacterType: paint,
    }
    addGodAbilityGodImmunity();
    addGodAbilitySeeker();
    addGodAbilityMovingFire();
    addGodAbilityTileExplosion();
}

export function godEnemyHardModeConditionFullfiled(game: Game): boolean {
    if (!game.state.bossStuff.godFightStarted) return false;
    const god = game.state.bossStuff.bosses.find(b => b.type === CHARACTER_TYPE_GOD_ENEMY);
    if (!god) return false;
    for (let ability of god.abilities) {
        if ((ability as GodAbility).pickedUp === undefined) continue;
        if ((ability as GodAbility).pickedUp === true) return false;
    }
    return true;
}

export function godEnemyActivateHardMode(game: Game) {
    const god: GodEnemyCharacter = game.state.bossStuff.bosses.find(b => b.type === CHARACTER_TYPE_GOD_ENEMY) as GodEnemyCharacter;
    if (!game.state.bossStuff.normalModeMoneyAwarded) {
        const moneyGain = calculateMoneyForKingMaxHp(god.maxHp) * 2;
        addMoneyAmountToPlayer(moneyGain, game.state.players, game);
        game.UI.moneyGainedThisRun.push({
            amount: moneyGain,
            text: `for God kill`,
        });
        game.state.bossStuff.normalModeMoneyAwarded = true;

    }
    god.maxHp *= 100;
    god.hp = god.maxHp;
    god.isDead = false;
    const hardModeAbilityLevel = 5;
    for (let ability of god.abilities) {
        if ((ability as GodAbility).pickedUp === false) {
            const godAbility = ability as GodAbility;
            godAbility.pickedUp = true;
            setAbilityToBossLevel(godAbility, hardModeAbilityLevel);
        }
    }
    if (!god.isDamageImmune) god.isDebuffImmune = false;
}

export function spawnGodEnemy(godArea: GameMapGodArea, game: Game) {
    const spawn: Position = getGodAreaMiddlePosition(godArea, game.state.map)!;
    const king = createGodEnemy(game.state.idCounter, spawn, game);
    game.state.bossStuff.bosses.push(king);
    doDamageMeterSplit("God Fight", game);
}

export function applyExponentialStackingDamageTakenDebuff(target: Character, game: Game) {
    const factor = 2;
    const duration = 30000;
    const debuffDamageTaken = createDebuffDamageTaken(factor, duration, game.state.time, true);
    applyDebuff(debuffDamageTaken, target, game);
}

export function godCreateMoreInfos(game: Game, heading: string): MoreInfosPartContainer | undefined {
    if (!game.ctx) return;
    if (!game.state.bossStuff.godFightStarted) return;
    let god = game.state.bossStuff.bosses[game.state.bossStuff.bosses.length - 1];
    return createCharacterMoreInfosPartContainer(game.ctx, god, game.UI.moreInfos, game, heading);
}

function createGodEnemy(idCounter: IdCounter, spawnPosition: Position, game: Game): GodEnemyCharacter {
    const bossSize = 60;
    const color = "black";
    const moveSpeed = 1;
    const hp = 5 * 1000 * 1000 * 1000;
    const experienceWorth = 0;
    const character = createCharacter(getNextId(idCounter), spawnPosition.x, spawnPosition.y, bossSize, bossSize, color, moveSpeed, hp, FACTION_ENEMY, CHARACTER_TYPE_GOD_ENEMY, experienceWorth);
    const godCharacter: GodEnemyCharacter = {
        ...character,
        pickUpCount: 0,
        animationState: {
            state: "sleeping",
            data: [],
        }
    };
    const abilityMelee = createAbility(ABILITY_NAME_MELEE, game.state.idCounter) as AbilityMelee;
    abilityMelee.damage = 50;
    godCharacter.abilities.push(abilityMelee);
    godCharacter.abilities.push(createAbility(ABILITY_NAME_SEEKER, game.state.idCounter));
    godCharacter.abilities.push(createAbility(ABILITY_NAME_MOVING_FIRE, game.state.idCounter));
    godCharacter.abilities.push(createAbility(ABILITY_NAME_TILE_EXPLOSION, game.state.idCounter));
    godCharacter.abilities.push(createAbility(ABILITY_NAME_GOD_IMMUNITY, game.state.idCounter));
    godCharacter.paint.image = IMAGE_SLIME;
    if (game.debug.lowKingHp) {
        godCharacter.hp = 50000;
        godCharacter.maxHp = 50000;
    }
    godCharacter.isRootImmune = true;
    setGodAbilityPickUpPosition(godCharacter, game);
    return godCharacter;
}

function tickEnemyCharacter(character: Character, game: Game, pathingCache: PathingCache | null) {
    const enemy = character as GodEnemyCharacter;
    if (enemy.isDead) return;
    if (enemy.firstAttackedTime === undefined) {
        if (enemy.hp < enemy.maxHp) {
            enemy.firstAttackedTime = game.state.time;
            enemy.animationState.state = "waking up";
        }
        return;
    }

    let pickUpAbility = false;
    if (!enemy.allAbilitiesPickedUp) {
        if (enemy.pickUpCount === 0 && enemy.firstAttackedTime !== undefined && enemy.firstAttackedTime + FIRST_PICK_UP_DELAY <= game.state.time) {
            enemy.animationState.state = "angry";
            pickUpAbility = true;
        } else if (enemy.pickUpCount > 0 && enemy.pickUpCount <= (1 - enemy.hp / enemy.maxHp) * 10) {
            pickUpAbility = true;
        }
    }
    if (pickUpAbility) {
        const godAbilityToPickUp = getAbilityToPickUp(enemy);
        if (godAbilityToPickUp) {
            enemy.isMoving = true;
            enemy.isDebuffImmune = true;
            removeCharacterDebuffs(enemy, game);
            enemy.moveDirection = calculateDirection(enemy, godAbilityToPickUp.pickUpPosition!);
        }
    } else {
        const playerCharacters = getPlayerCharacters(game.state.players);
        const closest = determineClosestCharacter(enemy, playerCharacters);
        calculateAndSetMoveDirectionToPositionWithPathing(enemy, closest.minDistanceCharacter, game.state.map, pathingCache, game.state.idCounter, game.state.time, game);
    }

    moveCharacterTick(enemy, game.state.map, game.state.idCounter, game);
    if (pickUpAbility) {
        const godAbilityToPickUp = getAbilityToPickUp(enemy);
        if (godAbilityToPickUp) {
            const distance = calculateDistance(enemy, godAbilityToPickUp.pickUpPosition!);
            if (distance < enemy.width + 10) {
                godAbilityToPickUp.pickedUp = true;
                if (!enemy.isDamageImmune) enemy.isDebuffImmune = false;
                enemy.pickUpCount++;
                enemy.pickUpAbilityIndex = undefined;
                setAbilityToBossLevel(godAbilityToPickUp, enemy.pickUpCount);
            }
        }
    }

    for (let ability of enemy.abilities) {
        const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        if (abilityFunctions) {
            if (abilityFunctions.tickBossAI) abilityFunctions.tickBossAI(enemy, ability, game);
        }
    }
    tickCharacterDebuffs(enemy, game);
}

function getAbilityToPickUp(enemy: GodEnemyCharacter): GodAbility | undefined {
    if (enemy.pickUpAbilityIndex === undefined) {
        let closestNotPickedUpAbilityIndex: number | undefined = undefined;
        let closestDistance = 0;
        for (let i = 0; i < enemy.abilities.length; i++) {
            const godAbility = enemy.abilities[i] as GodAbility;
            if (godAbility.pickedUp === undefined || godAbility.pickedUp) continue;
            if (closestNotPickedUpAbilityIndex === undefined) {
                closestNotPickedUpAbilityIndex = i;
                closestDistance = calculateDistance(godAbility.pickUpPosition!, enemy);
            } else {
                const tempDistance = calculateDistance(godAbility.pickUpPosition!, enemy);
                if (tempDistance < closestDistance) {
                    closestNotPickedUpAbilityIndex = i;
                    closestDistance = tempDistance;
                }
            }
        }
        if (closestNotPickedUpAbilityIndex === undefined) {
            enemy.allAbilitiesPickedUp = true;
            return undefined;
        } else {
            enemy.pickUpAbilityIndex = closestNotPickedUpAbilityIndex;
        }
    }
    return enemy.abilities[enemy.pickUpAbilityIndex] as GodAbility;
}

function paint(ctx: CanvasRenderingContext2D, character: Character, cameraPosition: Position, game: Game) {
    if (character.isDead) return;
    const god = character as GodEnemyCharacter;
    const animation = god.animationState;
    const paintPos = getPointPaintPosition(ctx, character, cameraPosition);
    paintPos.y -= 20;
    const width = 30;
    const height = 80;
    //body
    ctx.beginPath();
    ctx.fillStyle = "black";
    ctx.strokeStyle = "black";
    ctx.ellipse(paintPos.x, paintPos.y, width, height, 0, 0, Math.PI);
    ctx.fill();
    //eye setup
    const eyeWidth = 10;
    const eyePupilSize = 5;
    let eyeTopSpacing = 12;
    let eyeRotation = 1;
    let eyeOpen = true;
    let pupilDirection = character.moveDirection;
    let pupilOffset: Position = {
        x: Math.cos(pupilDirection) * 2.5,
        y: Math.sin(pupilDirection) * 2.5,
    }
    if (animation.state === "sleeping") {
        eyeRotation = 0;
        eyeOpen = false;
    } else if (animation.state === "waking up" && god.firstAttackedTime !== undefined) {
        const wakingUpPerCent = Math.min((game.state.time - god.firstAttackedTime) / 1500, 1);
        pupilOffset.x = 0;
        pupilOffset.y = 0;
        eyeRotation = 1 * wakingUpPerCent;
    }
    ctx.lineWidth = 1;
    ctx.strokeStyle = "white";
    //eye left
    ctx.beginPath();
    ctx.fillStyle = "white";
    ctx.ellipse(paintPos.x - eyeWidth, paintPos.y + eyeTopSpacing, eyeWidth, 7, eyeRotation, 0, Math.PI);
    if (eyeOpen) {
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = "black";
        ctx.arc(paintPos.x - eyeWidth * 1.3 + pupilOffset.x, paintPos.y + eyeTopSpacing + pupilOffset.y, eyePupilSize, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.stroke();
    }
    //eye right
    ctx.beginPath();
    ctx.fillStyle = "white";
    ctx.ellipse(paintPos.x + eyeWidth, paintPos.y + eyeTopSpacing, eyeWidth, 7, -eyeRotation, 0, Math.PI);
    if (eyeOpen) {
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = "black";
        ctx.arc(paintPos.x + eyeWidth * 1.3 + pupilOffset.x, paintPos.y + eyeTopSpacing + pupilOffset.y, eyePupilSize, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.stroke();
    }

    paintCharacterAbilties(ctx, character, cameraPosition, game);
    paintKingHpBar(ctx, character);
}
