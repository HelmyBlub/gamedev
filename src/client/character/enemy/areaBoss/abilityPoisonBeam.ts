import { ABILITIES_FUNCTIONS, Ability, AbilityOwner } from "../../../ability/ability.js";
import { calculateDirection, getNextId } from "../../../game.js";
import { FACTION_ENEMY, Game, IdCounter, Position } from "../../../gameModel.js";
import { getPointPaintPosition } from "../../../gamePaint.js";
import { calculateMovePosition } from "../../../map/map.js";
import { characterTakeDamage, determineClosestCharacter, findCharacterById, getCharactersTouchingLine, getPlayerCharacters } from "../../character.js";
import { Character } from "../../characterModel.js";

export const ABILITY_NAME_POISON_BEAM = "PoisonBeam";
export type AbilityPoisonBeam = Ability & {
    cooldown: number,
    lastCastTime?: number,
    lastPlayerMoveTime?: number,
    targetPlayerId?: number,
    beamDirection?: number,
    chargePerCent?: number,
    beamStartTime?: number,
    nextDamageTick?: number,
}

const MAX_DINSTANCE = 1000;
const HP_COST = 1;
const HP_PER_CENT_DAMAGE = 0.1;
const COOLDOWN = 5000;
const STAND_STILL_TIME = 1000;
const MAX_CHARGE_TIME = 3000;
const BEAM_DELAY = 250;
const TURN_SPEED = 0.08;
const BEAM_DURATION = 20000;
const DAMAGE_TICK_INTERVAL = 200;
const BEAM_BONUS_WIDTH = 15;
const BEAM_MIN_WIDTH = 4;

export function addAbilityPoisonBeam() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_POISON_BEAM] = {
        createAbility: createAbilityPoisonBeam,
        paintAbility: paintAbility,
        tickAbility: tickAbility,
        resetAbility: resetAbility,
        canBeUsedByBosses: true,
    };
}

export function createAbilityPoisonBeam(
    idCounter: IdCounter,
): AbilityPoisonBeam {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_POISON_BEAM,
        cooldown: COOLDOWN,
        passive: true,
        upgrades: {},
    };
}

function paintAbility(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    const poisonBeam = ability as AbilityPoisonBeam;
    const paintPos = getPointPaintPosition(ctx, abilityOwner, cameraPosition, game.UI.zoom);
    if (poisonBeam.targetPlayerId === undefined) return;
    ctx.globalAlpha = 0.8;
    if (poisonBeam.beamStartTime !== undefined) {
        ctx.strokeStyle = "black";
        ctx.lineWidth = BEAM_MIN_WIDTH + BEAM_BONUS_WIDTH * poisonBeam.chargePerCent!;
        ctx.beginPath();
        ctx.moveTo(paintPos.x, paintPos.y);
        const beamEnd: Position = calculateMovePosition(paintPos, poisonBeam.beamDirection!, MAX_DINSTANCE, false);
        ctx.lineTo(beamEnd.x, beamEnd.y);
        ctx.stroke();
    } else {
        ctx.fillStyle = "black";
        const beamStart: Position = calculateMovePosition(paintPos, poisonBeam.beamDirection!, 20, false);
        const chargePerCent = Math.min((game.state.time - poisonBeam.lastCastTime!) / MAX_CHARGE_TIME, 1);
        ctx.beginPath();
        ctx.arc(beamStart.x, beamStart.y, BEAM_MIN_WIDTH + BEAM_BONUS_WIDTH * chargePerCent, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

function resetAbility(ability: Ability) {
    const poisonBeam = ability as AbilityPoisonBeam;
    poisonBeam.beamDirection = undefined;
    poisonBeam.beamStartTime = undefined;
    poisonBeam.chargePerCent = undefined;
    poisonBeam.lastCastTime = undefined;
    poisonBeam.lastPlayerMoveTime = undefined;
    poisonBeam.targetPlayerId = undefined;
    poisonBeam.nextDamageTick = undefined;
}

function tickAbility(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const poisonBeam = ability as AbilityPoisonBeam;
    if (poisonBeam.targetPlayerId === undefined) {
        //lock on to target
        const closest = determineClosestCharacter(abilityOwner, getPlayerCharacters(game.state.players));
        if (!closest.minDistanceCharacter || closest.minDistance > MAX_DINSTANCE) {
            poisonBeam.lastPlayerMoveTime = undefined;
            return;
        }
        if (poisonBeam.lastPlayerMoveTime === undefined || closest.minDistanceCharacter.isMoving) {
            poisonBeam.lastPlayerMoveTime = game.state.time;
        }

        if (poisonBeam.lastPlayerMoveTime + STAND_STILL_TIME < game.state.time) {
            poisonBeam.targetPlayerId = closest.minDistanceCharacter.id;
            poisonBeam.beamDirection = calculateDirection(abilityOwner, closest.minDistanceCharacter);
            poisonBeam.lastCastTime = game.state.time;
        }
    } else {
        const target = findCharacterById(getPlayerCharacters(game.state.players), poisonBeam.targetPlayerId);
        if (!target) {
            poisonBeam.targetPlayerId = undefined;
            return;
        }
        if (poisonBeam.chargePerCent === undefined) {
            // charge up beam
            if (target.isMoving || poisonBeam.lastCastTime! + MAX_CHARGE_TIME < game.state.time) {
                poisonBeam.chargePerCent = Math.min((game.state.time - poisonBeam.lastCastTime!) / MAX_CHARGE_TIME, 1);
                poisonBeam.beamStartTime = game.state.time + BEAM_DELAY;
                poisonBeam.nextDamageTick = poisonBeam.beamStartTime;
            }

        } else {
            //fire beam
            if (poisonBeam.beamStartTime! > game.state.time) return;
            if (poisonBeam.beamStartTime! + BEAM_DURATION < game.state.time) {
                resetAbility(ability);
                return;
            }
            const currentDirection = calculateDirection(abilityOwner, target);
            let directionDifference = currentDirection - poisonBeam.beamDirection!;

            if (currentDirection - poisonBeam.beamDirection! < 0 && Math.abs(directionDifference) < Math.PI) {
                poisonBeam.beamDirection! -= TURN_SPEED * poisonBeam.chargePerCent;
                if (poisonBeam.beamDirection! < -Math.PI * 3 / 2) {
                    poisonBeam.beamDirection! += Math.PI * 2;
                }
            } else {
                poisonBeam.beamDirection! += TURN_SPEED * poisonBeam.chargePerCent;
                if (poisonBeam.beamDirection! > Math.PI / 2) {
                    poisonBeam.beamDirection! -= Math.PI * 2;
                }
            }

            if (poisonBeam.nextDamageTick! > game.state.time) return;
            poisonBeam.nextDamageTick! += DAMAGE_TICK_INTERVAL;

            const owner = abilityOwner as Character;
            owner.isDamageImmune = false;
            characterTakeDamage(owner, HP_COST * poisonBeam.chargePerCent, game, undefined, ability.name);
            owner.isDamageImmune = true;

            const beamEnd: Position = calculateMovePosition(abilityOwner, poisonBeam.beamDirection!, MAX_DINSTANCE, false);
            const beamWidth = BEAM_MIN_WIDTH + BEAM_BONUS_WIDTH * poisonBeam.chargePerCent;
            const hitPlayers = getCharactersTouchingLine(game, abilityOwner, beamEnd, FACTION_ENEMY, beamWidth);
            for (let char of hitPlayers) {
                const damage = char.maxHp * HP_PER_CENT_DAMAGE * poisonBeam.chargePerCent;
                characterTakeDamage(char, damage, game, undefined, poisonBeam.name);
            }
        }
    }
}
