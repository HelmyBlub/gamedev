import { determineCharactersInDistance } from "../character/character.js";
import { Character } from "../character/characterModel.js";
import { getNextId } from "../game.js";
import { Position, Game, IdCounter, FACTION_ENEMY, FACTION_PLAYER } from "../gameModel.js";
import { getPointPaintPosition } from "../gamePaint.js";
import { nextRandom } from "../randomNumberGenerator.js";
import { ABILITIES_FUNCTIONS, Ability, AbilityOwner, detectSomethingToCharacterHit } from "./ability.js";
import { createAbilityObjectExplode } from "./abilityExplode.js";

export type AbilityLightningStrikes = Ability & {
    damage: number,
    radius: number,
    numberStrikes: number,
    tickInterval: number,
    nextTickTime?: number,
}
export const ABILITY_NAME_LIGHTNING_STRIKES = "Lightning Strikes";

export function addAbilityLightningStrikes() {
    ABILITIES_FUNCTIONS[ABILITY_NAME_LIGHTNING_STRIKES] = {
        createAbility: createAbilityLightningStrikes,
        paintAbility: paintAbility,
        setAbilityToLevel: setAbilityToLevel,
        setAbilityToBossLevel: setAbilityToBossLevel,
        setAbilityToEnemyLevel: setAbilityToEnemyLevel,
        tickAbility: tickAbility,
        canBeUsedByBosses: true,
    };
}

export function createAbilityLightningStrikes(
    idCounter: IdCounter,
    playerInputBinding?: string,
    damage: number = 50,
    radius: number = 30,
    numberStrikes: number = 3,
): AbilityLightningStrikes {
    return {
        id: getNextId(idCounter),
        name: ABILITY_NAME_LIGHTNING_STRIKES,
        damage: damage,
        radius: radius,
        numberStrikes: numberStrikes,
        passive: true,
        tickInterval: 1000,
        upgrades: {},
    };
}

function setAbilityToLevel(ability: Ability, level: number) {
    const abilityLightningStirkes = ability as AbilityLightningStrikes;
    abilityLightningStirkes.damage = level * 100;
    abilityLightningStirkes.radius = 30 + level * 10;
    abilityLightningStirkes.numberStrikes = level * 3;
}

function setAbilityToEnemyLevel(ability: Ability, level: number, damageFactor: number) {
    const abilityLightningStirkes = ability as AbilityLightningStrikes;
    abilityLightningStirkes.damage = level / 2 * damageFactor;
    abilityLightningStirkes.radius = 30 + level * 3;
    abilityLightningStirkes.numberStrikes = level;
}

function setAbilityToBossLevel(ability: Ability, level: number) {
    const abilityLightningStirkes = ability as AbilityLightningStrikes;
    abilityLightningStirkes.damage = level * 10;
    abilityLightningStirkes.radius = 60 + level * 12;
    abilityLightningStirkes.numberStrikes = 3 * level;
}

function paintAbility(ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) {
    const abilityLightning = ability as AbilityLightningStrikes;
    const paintPos = getPointPaintPosition(ctx, abilityOwner, cameraPosition);
    ctx.globalAlpha = 0.30;
    ctx.fillStyle = "white";
    if (abilityOwner.faction === FACTION_ENEMY) {
        ctx.fillStyle = "darkgray";
        ctx.globalAlpha = 0.50;
    }
    if (abilityOwner.faction === FACTION_PLAYER) ctx.globalAlpha *= game.UI.playerGlobalAlphaMultiplier;

    ctx.beginPath();
    ctx.arc(
        paintPos.x,
        paintPos.y,
        10, 0, 2 * Math.PI
    );
    ctx.fill();
    ctx.globalAlpha = 1;
}

function tickAbility(abilityOwner: AbilityOwner, ability: Ability, game: Game) {
    const abilityLightning = ability as AbilityLightningStrikes;

    if (abilityLightning.nextTickTime === undefined) abilityLightning.nextTickTime = game.state.time + abilityLightning.tickInterval;
    if (abilityLightning.nextTickTime <= game.state.time) {
        const strikeRadius = 10;
        let characters: Character[] = [];
        let characterIndex = 0;
        if (abilityOwner.faction === FACTION_PLAYER) {
            characters = determineCharactersInDistance(abilityOwner, game.state.map, game.state.players, game.state.bossStuff.bosses, abilityLightning.radius * 2, abilityOwner.faction);
        }
        for (let i = 0; i < abilityLightning.numberStrikes; i++) {
            let randomPos: Position | undefined= undefined;
            if(characters.length > characterIndex){
                for(let j = characterIndex; j < characters.length; j++){
                    characterIndex++;
                    const character = characters[j];
                    if(!character.isDead){
                        randomPos = {
                            x: character.x,
                            y: character.y,
                        };
                        break;
                    }
                }
            }

            if(!randomPos){
                randomPos = {
                    x: abilityOwner.x + nextRandom(game.state.randomSeed) * abilityLightning.radius * 2 - abilityLightning.radius,
                    y: abilityOwner.y + nextRandom(game.state.randomSeed) * abilityLightning.radius * 2 - abilityLightning.radius,
                }
            }
            const strikeObject = createAbilityObjectExplode(randomPos, abilityLightning.damage, strikeRadius, abilityOwner.faction, ability.id, game);
            game.state.abilityObjects.push(strikeObject);
        }

        abilityLightning.nextTickTime += abilityLightning.tickInterval;
        if (abilityLightning.nextTickTime <= game.state.time) {
            abilityLightning.nextTickTime = game.state.time + abilityLightning.tickInterval;
        }
    }
}