import { findCharacterById, getPlayerCharacters } from "../character/character.js";
import { createBuffSlowTrail } from "../debuff/buffSlowTrail.js";
import { createBuffSpeed } from "../debuff/buffSpeed.js";
import { applyDebuff } from "../debuff/debuff.js";
import { getNextId } from "../game.js";
import { Game, IdCounter, Position } from "../gameModel.js";
import { playerInputBindingToDisplayValue } from "../playerInput.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityOwner, AbilityUpgradeOption, paintDefaultAbilityStatsUI } from "./ability.js";

type AbilityMovementSpeed = Ability & {
    speedFactor: number,
    duration: number,
    cooldown: number,
    cooldownFinishTime: number,
}

type AbilityUpgradeSlowTrail = {
    active: boolean,
}

export const ABILITY_NAME_MOVEMENTSPEED = "MovementSpeed";
export const ABILITY_MOVEMENT_SPEED_UPGARDE_SLOW_TRAIL = "Slow Trail";

export function addMovementSpeedAbility() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_MOVEMENTSPEED] = {
        createAbiltiyUpgradeOptions: createAbilityMovementSpeedUpgradeOptions,
        setAbilityToLevel: setAbilityMovementSpeedToLevel,
        createAbility: createAbilityMovementSpeed,
        activeAbilityCast: castMovementSpeed,
        paintAbilityUI: paintAbilityMovementSpeedUI,
        createAbiltiyBossUpgradeOptions: createAbilityBossMovementSpeedUpgradeOptions,
        paintAbilityStatsUI: paintAbilityMovementSpeedStatsUI,
        isPassive: false,
        notInheritable: true,
    };
}

export function createAbilityMovementSpeed(
    idCounter: IdCounter,
    playerInputBinding?: string,
): AbilityMovementSpeed {
    return {
        name: ABILITY_NAME_MOVEMENTSPEED,
        speedFactor: 1.5,
        cooldown: 18000,
        cooldownFinishTime: 0,
        duration: 3000,
        playerInputBinding: playerInputBinding,
        id: getNextId(idCounter),
        passive: false,
        upgrades: {},
    };
}

function castMovementSpeed(abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, isInputdown: boolean, game: Game) {
    const abilityMovementSpeed = ability as AbilityMovementSpeed;
    if (abilityMovementSpeed.cooldownFinishTime <= game.state.time) {
        const speedBuff = createBuffSpeed(abilityMovementSpeed.speedFactor, abilityMovementSpeed.duration, game.state.time);
        const character = findCharacterById(getPlayerCharacters(game.state.players), abilityOwner.id)!;
        applyDebuff(speedBuff, character, game);
        abilityMovementSpeed.cooldownFinishTime = game.state.time + abilityMovementSpeed.cooldown;

        if(ability.upgrades[ABILITY_MOVEMENT_SPEED_UPGARDE_SLOW_TRAIL]){
            const slowTrail = createBuffSlowTrail(abilityMovementSpeed.duration, game.state.time);
            applyDebuff(slowTrail, character, game);
        }
    }
}

function paintAbilityMovementSpeedUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) {
    let abilityMovementSpeed = ability as AbilityMovementSpeed;
    let fontSize = size;
    let rectSize = size;
    ctx.strokeStyle = "black";
    ctx.fillStyle = "white";
    ctx.lineWidth = 1;
    ctx.fillRect(drawStartX, drawStartY, rectSize, rectSize);
    ctx.beginPath();
    ctx.rect(drawStartX, drawStartY, rectSize, rectSize);
    ctx.stroke();
    if (game.state.time < abilityMovementSpeed.cooldownFinishTime) {
        ctx.fillStyle = "gray";
        const heightFactor = Math.max((abilityMovementSpeed.cooldownFinishTime - game.state.time) / abilityMovementSpeed.cooldown, 0);
        ctx.fillRect(drawStartX, drawStartY, rectSize, rectSize * heightFactor);

        ctx.fillStyle = "black";
        const fontSize2 = Math.floor(size * 0.8);
        ctx.font = fontSize2 + "px Arial";
        const cooldownSeconds = Math.ceil((abilityMovementSpeed.cooldownFinishTime - game.state.time) / 1000);
        ctx.fillText("" + cooldownSeconds, drawStartX, drawStartY + rectSize - (rectSize - fontSize2 * 0.9));
    }


    if (abilityMovementSpeed.playerInputBinding) {
        let keyBind = "";
        game.clientKeyBindings[0].keyCodeToActionPressed.forEach((value, key) => {
            if (value.action === abilityMovementSpeed.playerInputBinding) {
                keyBind = value.uiDisplayInputValue;
            }
        });
        ctx.fillStyle = "black";
        ctx.font = "10px Arial";
        ctx.fillText(keyBind, drawStartX + 1, drawStartY + 8);
    }
}

function paintAbilityMovementSpeedStatsUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, game: Game): { width: number, height: number } {
    const abilityMovementSpeed = ability as AbilityMovementSpeed;
    const textLines: string[] = [
        `Ability: ${abilityMovementSpeed.name}`,
        `Key: ${playerInputBindingToDisplayValue(abilityMovementSpeed.playerInputBinding!, game)}`,
        `Ability stats: `,
        `Speed Increase: ${((abilityMovementSpeed.speedFactor - 1) * 100).toFixed()}%`,
        `Speed Duration: ${(abilityMovementSpeed.duration / 1000).toFixed(2)}s`,
        `Speed Cooldown: ${(abilityMovementSpeed.cooldown / 1000).toFixed(2)}s`,
    ];

    return paintDefaultAbilityStatsUI(ctx, textLines, drawStartX, drawStartY);
}

function setAbilityMovementSpeedToLevel(ability: Ability, level: number) {
    let abilityMovementSpeed = ability as AbilityMovementSpeed;
    abilityMovementSpeed.speedFactor = 1.20 + 0.05 * level;
}

function createAbilityMovementSpeedUpgradeOptions(): AbilityUpgradeOption[] {
    let upgradeOptions: AbilityUpgradeOption[] = [];
    upgradeOptions.push({
        name: "MovementSpeed+", probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilityMovementSpeed;
            as.speedFactor += 0.05;
        }
    });

    return upgradeOptions;
}

function createAbilityBossMovementSpeedUpgradeOptions(ability: Ability): AbilityUpgradeOption[] {
    let upgradeOptions: AbilityUpgradeOption[] = [];
    upgradeOptions.push({
        name: "Ability MovementSpeed speed increase +50%", probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilityMovementSpeed;
            as.speedFactor += 0.50;
        }
    });

    upgradeOptions.push({
        name: "Ability MovementSpeed Reduce Cooldown 15%", probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilityMovementSpeed;
            as.cooldown *= 0.85;
        }
    });

    upgradeOptions.push({
        name: "Ability MovementSpeed Duration +1.0s", probabilityFactor: 1, upgrade: (a: Ability) => {
            let as = a as AbilityMovementSpeed;
            as.duration += 1000;
        }
    });

    if(!ability.upgrades[ABILITY_MOVEMENT_SPEED_UPGARDE_SLOW_TRAIL]){
        upgradeOptions.push({
            name: "Slow Trail", probabilityFactor: 1, upgrade: (a: Ability) => {
                let as = a as AbilityMovementSpeed;
                let up: AbilityUpgradeSlowTrail;
                if (as.upgrades[ABILITY_MOVEMENT_SPEED_UPGARDE_SLOW_TRAIL] === undefined) {
                    up = {
                        active: true,
                    }
                    as.upgrades[ABILITY_MOVEMENT_SPEED_UPGARDE_SLOW_TRAIL] = up;
                }
            }
        });
    }

    return upgradeOptions;
}

