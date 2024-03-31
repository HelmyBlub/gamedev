import { setCharacterPosition } from "../../character/character.js";
import { Character } from "../../character/characterModel.js";
import { AbilityUpgradeOption, UpgradeOption, UpgradeOptionAndProbability } from "../../character/upgrade.js";
import { BUFF_NAME_BALL_PHYSICS, BuffBallPhysics, createBuffBallPhysics, findBallBuff } from "../../debuff/buffBallPhysics.js";
import { applyDebuff, removeCharacterDebuff } from "../../debuff/debuff.js";
import { calcNewPositionMovedInDirection, calculateDirection, findClientInfoByCharacterId, getNextId } from "../../game.js";
import { Position, Game, IdCounter, FACTION_ENEMY, ClientInfo, FACTION_PLAYER } from "../../gameModel.js";
import { getPointPaintPosition } from "../../gamePaint.js";
import { calculateMovePosition, getFirstBlockingGameMapTilePositionTouchingLine, isMoveFromToBlocking, isPositionBlocking } from "../../map/map.js";
import { playerInputBindingToDisplayValue } from "../../playerInput.js";
import { fixedRandom } from "../../randomNumberGenerator.js";
import { MoreInfoPart, createMoreInfosPart } from "../../moreInfo.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityObject, AbilityOwner, detectSomethingToCharacterHit, getAbilityNameUiText } from "../ability.js";
import { AbilityUpgradesFunctions, pushAbilityUpgradesOptions, pushAbilityUpgradesUiTexts, upgradeAbility } from "../abilityUpgrade.js";
import { ABILITY_LIGHTNING_BALL_UPGRADE_BOUNCE_BONUS, addAbilityLightningBallUpgradeBounceBonus, lightningBallUpgradeBounceBonusGetBonusDamageFactor, lightningBallUpgradeBounceBonusSetBonusDamageFactor } from "./abilityLightningBallUpgradeBounceBonus.js";
import { addAbilityLightningBallUpgradeHpLeach, lightningBallUpgradeHpLeachExecute } from "./abilityLightningBallUpgradeHpLeach.js";
import { ABILITY_LIGHTNING_BALL_UPGRADE_ICE_AURA, addAbilityLightningBallUpgradeIceAura, lightningBallUpgradeIceAuraExecute } from "./abilityLightningBallUpgradeIceAura.js";
import { ABILITY_LIGHTNING_BALL_UPGRADE_LIGHTNING_STRIKES, addAbilityLightningBallUpgradeLightningStrikes, lightningBallUpgradeLightningStirkesExecute } from "./abilityLightningBallUpgradeLightningStrikesBuff.js";
import { AbilityDamageBreakdown } from "../../combatlog.js";
import { ABILITY_NAME_LIGHTNING_STRIKES } from "../abilityLightningStrikes.js";
import { ABILITY_BOUNCE_BALL_UPGRADE_BOUNCE_BONUS_DAMAGE } from "./abilityBounceBallUpgradeBounceBonusDamage.js";
import { ABILITY_NAME_ICE_AURA } from "../abilityIceAura.js";
import { ABILITY_NAME_EXPLODE } from "../abilityExplode.js";

export type AbilityLightningBall = Ability & {
    baseRechargeTime: number,
    nextRechargeTime?: number,
    currentCharges: number,
    maxCharges: number,
    damage: number,
    radius: number,
    moveDirection: number,
    speed: number,
    tickInterval: number,
    nextTickTime?: number,
    firstJumpDelay?: number,
    firstJumpDelayEnd?: number
}

export const ABILITY_NAME_LIGHTNING_BALL = "Lighning Ball";
export const ABILITY_LIGHTNING_BALL_UPGRADE_FUNCTIONS: AbilityUpgradesFunctions = {};
const ENEMY_JUMP_DELAY = 1500;

export function addAbilityLightningBall() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_LIGHTNING_BALL] = {
        activeAbilityCast: castLightningBall,
        createAbility: createAbilityLightningBall,
        createAbilityBossUpgradeOptions: createAbilityBossSpeedBoostUpgradeOptions,
        createDamageBreakDown: createDamageBreakDown,
        executeUpgradeOption: executeAbilityUpgradeOption,
        paintAbility: paintAbility,
        paintAbilityUI: paintAbilityUI,
        createAbilityMoreInfos: createAbilityMoreInfos,
        paintAbilityAccessoire: paintAbilityAccessoire,
        resetAbility: resetAbility,
        setAbilityToLevel: setAbilityToLevel,
        setAbilityToBossLevel: setAbilityToBossLevel,
        setAbilityToEnemyLevel: setAbilityToEnemyLevel,
        tickAbility: tickAbility,
        tickBossAI: tickBossAI,
        abilityUpgradeFunctions: ABILITY_LIGHTNING_BALL_UPGRADE_FUNCTIONS,
        canBeUsedByBosses: true,
    };
    addAbilityLightningBallUpgradeLightningStrikes();
    addAbilityLightningBallUpgradeHpLeach();
    addAbilityLightningBallUpgradeBounceBonus();
    addAbilityLightningBallUpgradeIceAura();
}

export function createAbilityLightningBall(
    idCounter: IdCounter,
    playerInputBinding?: string,
    damage: number = 50,
    radius: number = 30,
): AbilityLightningBall {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_LIGHTNING_BALL,
        damage: damage,
        radius: radius,
        passive: false,
        tickInterval: 250,
        moveDirection: 0,
        baseRechargeTime: 4000,
        currentCharges: 2,
        maxCharges: 2,
        speed: 60,
        upgrades: {},
        playerInputBinding: playerInputBinding,
        tradable: true,
    };
}

export function getDamageAbilityLightningBall(abilityLightningBall: AbilityLightningBall, abilityOwner: AbilityOwner) {
    let damageFactor = 1;
    damageFactor += lightningBallUpgradeBounceBonusGetBonusDamageFactor(abilityLightningBall, abilityOwner);
    return abilityLightningBall.damage * damageFactor;
}

function createDamageBreakDown(damage: number, ability: Ability, abilityObject: AbilityObject | undefined, damageAbilityName: string, game: Game): AbilityDamageBreakdown[] {
    const lightningBall = ability as AbilityLightningBall;
    const damageBreakDown: AbilityDamageBreakdown[] = [];
    let openDamage = damage;
    if (!abilityObject) {
        damageBreakDown.push({
            damage: lightningBall.damage,
            name: "Base Damage",
        });
        openDamage -= lightningBall.damage;
        if (openDamage > 0) {
            damageBreakDown.push({
                damage: openDamage,
                name: ABILITY_LIGHTNING_BALL_UPGRADE_BOUNCE_BONUS,
            });
        }
    } else {
        if (abilityObject.type === ABILITY_NAME_EXPLODE) {
            damageBreakDown.push({
                damage: lightningBall.damage,
                name: ABILITY_LIGHTNING_BALL_UPGRADE_LIGHTNING_STRIKES,
            });
            openDamage -= lightningBall.damage;
            if (openDamage > 0) {
                damageBreakDown.push({
                    damage: openDamage,
                    name: `${ABILITY_LIGHTNING_BALL_UPGRADE_LIGHTNING_STRIKES} bounce bonus`,
                });
            }
        } else if (abilityObject.type === ABILITY_NAME_ICE_AURA) {
            damageBreakDown.push({
                damage: damage,
                name: ABILITY_LIGHTNING_BALL_UPGRADE_ICE_AURA,
            });
        }
    }

    return damageBreakDown;
}

function paintAbilityAccessoire(ctx: CanvasRenderingContext2D, ability: Ability, paintPosition: Position, game: Game) {
    const abilityBall = ability as AbilityLightningBall;
    paintLightningBall(ctx, paintPosition, FACTION_PLAYER, 10, game);
}

function tickBossAI(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilityBall = ability as AbilityLightningBall;
    if (abilityOwner.debuffs) {
        const ballPhysics: BuffBallPhysics | undefined = abilityOwner.debuffs.find((d) => d.name === BUFF_NAME_BALL_PHYSICS) as any;
        if (ballPhysics) return;
    }
    let pos: Position = {
        x: abilityOwner.x,
        y: abilityOwner.y
    };
    if (abilityOwner.moveDirection) {
        pos = calculateMovePosition(abilityOwner, abilityOwner.moveDirection, 1, false);
    }

    castLightningBall(abilityOwner, ability, pos, true, game);
}

function resetAbility(ability: Ability) {
    const ball = ability as AbilityLightningBall;
    ball.nextRechargeTime = undefined;
    ball.currentCharges = ball.maxCharges;
}

function castLightningBall(abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, isKeydown: boolean, game: Game) {
    if (!isKeydown) return;
    const abilityLightningBall = ability as AbilityLightningBall;
    if (abilityLightningBall.currentCharges <= 0) return;
    const buffBallPhyscis = createBuffBallPhysics(ability.id, ability.name);
    applyDebuff(buffBallPhyscis, abilityOwner as any, game);
    abilityLightningBall.moveDirection = calculateDirection(abilityOwner, castPosition);
    abilityLightningBall.currentCharges--;
    if (abilityLightningBall.firstJumpDelay) {
        abilityLightningBall.firstJumpDelayEnd = game.state.time + abilityLightningBall.firstJumpDelay;
    }

    if (abilityLightningBall.nextRechargeTime === undefined) {
        abilityLightningBall.nextRechargeTime = game.state.time + abilityLightningBall.baseRechargeTime;
    }
    lightningBallUpgradeBounceBonusSetBonusDamageFactor(abilityLightningBall, abilityOwner);
    lightningBallUpgradeLightningStirkesExecute(abilityLightningBall, abilityOwner, game);
    const clientInfo: ClientInfo | undefined = findClientInfoByCharacterId(abilityOwner.id, game);
    if (clientInfo) clientInfo.lastMousePosition = castPosition;
}

function createAbilityBossSpeedBoostUpgradeOptions(ability: Ability, character: Character, game: Game): UpgradeOptionAndProbability[] {
    const upgradeOptions: UpgradeOptionAndProbability[] = [];
    pushAbilityUpgradesOptions(ABILITY_LIGHTNING_BALL_UPGRADE_FUNCTIONS, upgradeOptions, ability, character, game);
    return upgradeOptions;
}

function executeAbilityUpgradeOption(ability: Ability, character: Character, upgradeOption: UpgradeOption, game: Game) {
    const abilityUpgradeOption: AbilityUpgradeOption = upgradeOption as AbilityUpgradeOption;
    upgradeAbility(ability, character, abilityUpgradeOption);
}

function setAbilityToLevel(ability: Ability, level: number) {
    const abilityBall = ability as AbilityLightningBall;
    abilityBall.damage = level * 100;
}

function setAbilityToEnemyLevel(ability: Ability, level: number, damageFactor: number) {
    const abilityBall = ability as AbilityLightningBall;
    abilityBall.damage = level / 2 * damageFactor;
    abilityBall.firstJumpDelay = ENEMY_JUMP_DELAY;
}

function setAbilityToBossLevel(ability: Ability, level: number) {
    const abilityBall = ability as AbilityLightningBall;
    abilityBall.damage = level * 10;
    abilityBall.firstJumpDelay = ENEMY_JUMP_DELAY;
}

function paintAbilityUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) {
    const lightningBall = ability as AbilityLightningBall;
    const rectSize = size;

    ctx.lineWidth = 1;
    ctx.strokeStyle = "black";
    ctx.fillStyle = "white";
    ctx.fillRect(drawStartX, drawStartY, rectSize, rectSize);
    ctx.beginPath();
    ctx.rect(drawStartX, drawStartY, rectSize, rectSize);
    ctx.stroke();

    if (lightningBall.nextRechargeTime !== undefined && game.state.time < lightningBall.nextRechargeTime) {
        ctx.fillStyle = "gray";
        const heightFactor = Math.max((lightningBall.nextRechargeTime - game.state.time) / lightningBall.baseRechargeTime, 0);
        ctx.fillRect(drawStartX, drawStartY, rectSize, rectSize * heightFactor);
    }

    const fontSize = Math.floor(size * 0.8);
    ctx.fillStyle = "black";
    ctx.font = fontSize + "px Arial";
    ctx.fillText("" + lightningBall.currentCharges, drawStartX, drawStartY + rectSize - (rectSize - fontSize * 0.9));

    if (lightningBall.playerInputBinding) {
        const keyBind = playerInputBindingToDisplayValue(lightningBall.playerInputBinding, game);
        ctx.fillStyle = "black";
        ctx.font = "10px Arial";
        ctx.fillText(keyBind, drawStartX + 1, drawStartY + 8);
    }
}

function paintAbility(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    const abilityBall = ability as AbilityLightningBall;
    const ballBuff = findBallBuff(abilityOwner, abilityBall);
    if (typeof ballBuff !== "object") {
        if (!ballBuff) {
            const paintPos = getPointPaintPosition(ctx, abilityOwner, cameraPosition);
            paintLightningBall(ctx, paintPos, abilityOwner.faction, 10, game);
        }
        return;
    }
    const paintPos = getPointPaintPosition(ctx, abilityOwner, cameraPosition);
    paintLightningBall(ctx, paintPos, abilityOwner.faction, abilityBall.radius, game);
    delayedPaint(ctx, abilityOwner, abilityBall, cameraPosition, game);
}

function paintLightningBall(ctx: CanvasRenderingContext2D, paintPos: Position, faction: string, radius: number, game: Game) {
    let color = "blue";
    if (faction === FACTION_ENEMY) {
        color = "darkblue";
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(
        paintPos.x,
        paintPos.y,
        radius / 3, 0, 2 * Math.PI
    );
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "blue";
    ctx.beginPath();
    const reps = 6;
    for (let i = 0; i < reps; i++) {
        ctx.moveTo(paintPos.x, paintPos.y);
        let direction = ((i / reps * 6) + game.state.time) % (Math.PI * 2);
        let paintPos2 = calcNewPositionMovedInDirection(paintPos, direction, radius / 2);
        ctx.lineTo(paintPos2.x, paintPos2.y);
        let random = 0.1 + fixedRandom(paintPos.x, paintPos.y, game.state.time);
        let paintPos3 = calcNewPositionMovedInDirection(paintPos2, direction + random, radius / 2);
        let random2 = 0.1 + fixedRandom(paintPos2.x, paintPos2.y, game.state.time);
        let paintPos4 = calcNewPositionMovedInDirection(paintPos2, direction - random2, radius / 2);
        ctx.lineTo(paintPos3.x, paintPos3.y);
        ctx.moveTo(paintPos2.x, paintPos2.y);
        ctx.lineTo(paintPos4.x, paintPos4.y);
    }
    ctx.stroke();
}

function delayedPaint(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, abilityBall: AbilityLightningBall, cameraPosition: Position, game: Game) {
    if (abilityBall.firstJumpDelayEnd && abilityBall.firstJumpDelayEnd > game.state.time) {
        const endPos = calcNewPositionMovedInDirection(abilityOwner, abilityBall.moveDirection, 2000);
        let blockingPosistion = getFirstBlockingGameMapTilePositionTouchingLine(game.state.map, abilityOwner, endPos, game);
        if (!blockingPosistion) {
            blockingPosistion = endPos;
        }
        ctx.globalAlpha = 0.75;
        ctx.strokeStyle = "black";
        ctx.lineWidth = 3;
        ctx.beginPath();
        let paintPos = getPointPaintPosition(ctx, abilityOwner, cameraPosition);
        ctx.moveTo(paintPos.x, paintPos.y);
        paintPos = getPointPaintPosition(ctx, blockingPosistion, cameraPosition);
        ctx.lineTo(paintPos.x, paintPos.y);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
}

function tickAbility(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilityLightningBall = ability as AbilityLightningBall;
    rechargeTick(abilityLightningBall, game);

    const ballBuff = findBallBuff(abilityOwner, abilityLightningBall);
    if (typeof ballBuff !== "object") return;
    if (abilityLightningBall.firstJumpDelayEnd && abilityLightningBall.firstJumpDelayEnd > game.state.time) return;
    const maxJumpDistance = game.state.map.tileSize / 3;
    const jumpTicks = Math.max(1, Math.round(abilityLightningBall.speed / maxJumpDistance));
    const tickDistnace = abilityLightningBall.speed / jumpTicks;
    for (let i = 0; i < jumpTicks; i++) {
        let end = jumpTick(abilityLightningBall, abilityOwner, ballBuff, tickDistnace, game);
        if (end) break;
    }
}

function jumpTick(abilityLightningBall: AbilityLightningBall, abilityOwner: AbilityOwner, ballBuff: BuffBallPhysics, moveDistance: number, game: Game): boolean {
    const newPosition = calculateMovePosition(abilityOwner, abilityLightningBall.moveDirection, moveDistance, false);
    lightningBallUpgradeHpLeachExecute(abilityLightningBall, moveDistance, abilityOwner);
    if (!isMoveFromToBlocking(abilityOwner, newPosition, game.state.map, game)) {
        setCharacterPosition(abilityOwner as Character, newPosition, game.state.map);
        damageTick(abilityLightningBall, abilityOwner, game);
        return false;
    } else {
        lightningBallUpgradeIceAuraExecute(abilityLightningBall, abilityOwner, game);
        removeCharacterDebuff(ballBuff, abilityOwner as any, game);
        return true;
    }
}

function damageTick(abilityLightningBall: AbilityLightningBall, abilityOwner: AbilityOwner, game: Game): number {
    const hitCount = detectSomethingToCharacterHit(
        game.state.map,
        abilityOwner,
        abilityLightningBall.radius * 2,
        abilityOwner.faction,
        getDamageAbilityLightningBall(abilityLightningBall, abilityOwner),
        game.state.players,
        game.state.bossStuff.bosses,
        abilityLightningBall.name,
        abilityLightningBall.id,
        undefined,
        game
    );
    return hitCount;
}

function rechargeTick(abilityLightningBall: AbilityLightningBall, game: Game) {
    if (abilityLightningBall.nextRechargeTime != undefined && abilityLightningBall.nextRechargeTime <= game.state.time) {
        abilityLightningBall.currentCharges++;
        if (abilityLightningBall.currentCharges < abilityLightningBall.maxCharges) {
            abilityLightningBall.nextRechargeTime = game.state.time + abilityLightningBall.baseRechargeTime;
        } else {
            abilityLightningBall.nextRechargeTime = undefined;
        }
    }
}

function createAbilityMoreInfos(ctx: CanvasRenderingContext2D, ability: Ability, game: Game): MoreInfoPart {
    const abilityLightningBall = ability as AbilityLightningBall;
    const textLines: string[] = getAbilityNameUiText(ability);
    textLines.push(
        `Key: ${playerInputBindingToDisplayValue(abilityLightningBall.playerInputBinding!, game)}`,
        `Click to become a lightning ball.`,
        `Move with lightning speed.`,
        `Immune to damage.`,
        `Ends if it hits a wall.`,
        "Ability stats:",
        `Level: ${abilityLightningBall.level?.level}`,
        `Damage: ${abilityLightningBall.damage}`,
    );
    pushAbilityUpgradesUiTexts(ABILITY_LIGHTNING_BALL_UPGRADE_FUNCTIONS, textLines, ability);

    return createMoreInfosPart(ctx, textLines);
}

