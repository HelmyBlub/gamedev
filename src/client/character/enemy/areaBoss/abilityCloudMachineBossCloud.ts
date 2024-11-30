import { ABILITIES_FUNCTIONS, Ability, AbilityOwner } from "../../../ability/ability.js";
import { createAbilityObjectExplode } from "../../../ability/abilityExplode.js";
import { getNextId } from "../../../game.js";
import { IdCounter, Game, Position } from "../../../gameModel.js";
import { getPointPaintPosition } from "../../../gamePaint.js";
import { nextRandom } from "../../../randomNumberGenerator.js";
import { determineClosestCharacter, getPlayerCharacters } from "../../character.js";

type AbilityCloudMachineBossCloud = Ability & {
    damage: number,
    radius: number,
    tickInterval: number,
    lastTickTime?: number,
    explosionRadius: number,
};

export const ABILITY_NAME_CLOUD_MACHINE_BOSS_CLOUD = "AreaBossCloud";

export function addAbilityCloudMachineBossCloud() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_CLOUD_MACHINE_BOSS_CLOUD] = {
        createAbility: createAbilityCloudMachineBossCloud,
        paintAbility: paintAbility,
        setAbilityToLevel: setAbilityToLevel,
        setAbilityToBossLevel: setAbilityToBossLevel,
        setAbilityToEnemyLevel: setAbilityToEnemyLevel,
        tickAbility: tickAbility,
        canBeUsedByBosses: true,
    };
}

export function createAbilityCloudMachineBossCloud(
    idCounter: IdCounter,
    playerInputBinding?: string,
): AbilityCloudMachineBossCloud {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_CLOUD_MACHINE_BOSS_CLOUD,
        damage: 10,
        radius: 1000,
        passive: true,
        tickInterval: 250,
        upgrades: {},
        explosionRadius: 100,
    };
}

function setAbilityToLevel(ability: Ability, level: number) {
    const cloud = ability as AbilityCloudMachineBossCloud;
    cloud.damage = level * 100;
}

function setAbilityToEnemyLevel(ability: Ability, level: number, damageFactor: number) {
    const cloud = ability as AbilityCloudMachineBossCloud;
    cloud.damage = level / 2 * damageFactor;
}

function setAbilityToBossLevel(ability: Ability, level: number) {
    const cloud = ability as AbilityCloudMachineBossCloud;
    cloud.damage = level * 20;
    cloud.tickInterval = 500 / level;
    cloud.explosionRadius = 70 + 10 * level;
}

function paintAbility(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    const cloud = ability as AbilityCloudMachineBossCloud;
    const paintPos = getPointPaintPosition(ctx, abilityOwner, cameraPosition, game.UI.zoom);
    ctx.globalAlpha = 0.30;
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(
        paintPos.x,
        paintPos.y,
        cloud.radius, 0, 2 * Math.PI
    );
    ctx.fill();
    ctx.globalAlpha = 1;
}

function tickAbility(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const cloud = ability as AbilityCloudMachineBossCloud;
    if (cloud.lastTickTime === undefined) cloud.lastTickTime = game.state.time;
    if (cloud.lastTickTime + cloud.tickInterval < game.state.time) {
        const closest = determineClosestCharacter(abilityOwner, getPlayerCharacters(game.state.players));
        if (closest.minDistance > 2000) return;
        cloud.lastTickTime = game.state.time;
        const strikeDelay = 3000;
        const randomPos: Position = {
            x: abilityOwner.x + nextRandom(game.state.randomSeed) * cloud.radius * 2 - cloud.radius,
            y: abilityOwner.y + nextRandom(game.state.randomSeed) * cloud.radius * 2 - cloud.radius,
        };
        const strikeObject = createAbilityObjectExplode(randomPos, cloud.damage, cloud.explosionRadius, abilityOwner.faction, ability.id, strikeDelay, game);
        game.state.abilityObjects.push(strikeObject);
    }
}
