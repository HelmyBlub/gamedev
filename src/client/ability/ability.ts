import { determineCharactersInDistance, characterTakeDamage } from "../character/character.js"
import { Character } from "../character/characterModel.js"
import { BossEnemyCharacter } from "../character/enemy/bossEnemy.js"
import { calculateDistance, getCameraPosition, takeTimeMeasure } from "../game.js"
import { FACTION_ENEMY, FACTION_PLAYER, Game, IdCounter, Position } from "../gameModel.js"
import { GameMap } from "../map/map.js"
import { findPlayerByCharacterId, Player } from "../player.js"
import { addAbilityDeathCircle } from "./abilityDeathCircle.js"
import { addAbilityFireCircle } from "./abilityFireCircle.js"
import { addAbilityLesh } from "./abilityLeash.js"
import { addAbilityTower } from "./abilityTower.js"
import { addAbilityShoot } from "./abilityShoot.js"
import { addAbilitySword } from "./abilitySword.js"
import { addAbilityHpRegen } from "./abilityHpRegen.js"
import { addAbilityMelee } from "./abilityMelee.js"
import { addAbilityIceAura } from "./abilityIceAura.js"
import { addAbilitySingleTarget } from "./abilitySingleTarget.js"
import { addAbilitySnipe } from "./snipe/abilitySnipe.js"
import { addAbilitySpeedBoost } from "./speedBoost/abilitySpeedBoost.js"
import { addAbilitySlowTrail } from "./abilitySlowTrail.js"
import { addAbilityFireLine } from "./abilityFireLine.js"
import { AbilityUpgradesFunctions } from "./abilityUpgrade.js"
import { addAbilityExplode } from "./abilityExplode.js"
import { addAbilityFeedPet } from "./petTamer/abilityFeedPet.js"
import { addAbilityLovePet } from "./petTamer/abilityLovePet.js"
import { addAbilityPetBreath } from "./petTamer/abilityPetBreath.js"
import { addAbilityPetPainter } from "./petTamer/abilityPetPainter.js"
import { addAbilityPetDash } from "./petTamer/abilityPetDash.js"
import { UpgradeOption, UpgradeOptionAndProbability } from "../character/upgrade.js"
import { getPointPaintPosition } from "../gamePaint.js"
import { addAbilityBounceBall } from "./ball/abilityBounceBall.js"
import { addAbilityLightningBall } from "./ball/abilityLightningBall.js"
import { addAbilityLightningStrikes } from "./abilityLightningStrikes.js"

export type Ability = {
    id: number,
    name: string,
    passive: boolean,
    playerInputBinding?: string,
    leveling?: {
        level: number,
        experience: number,
        experienceForLevelUp: number,
    }
    bossSkillPoints?: number,
    upgrades: {
        [key: string]: any,
    },
    tradable?: boolean,
    unique?: boolean,
    gifted?: boolean,
    disabled?: boolean,
}
export type PaintOrderAbility = "beforeCharacterPaint" | "afterCharacterPaint";
export type AbilityObject = Position & {
    type: string,
    color: string,
    damage: number,
    faction: string,
    abilityRefId?: number,
    isLeveling?: boolean,
}

export type AbilityObjectCircle = AbilityObject & {
    radius: number,
}

export type AbilityOwner = Position & Partial<Character> & {
    faction: string,
    id: number,
}

export type AbilityFunctions = {
    activeAbilityCast?: (abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, isKeydown: boolean, game: Game) => void,
    canObjectHitMore?: (abilityObject: AbilityObject) => boolean,
    createAbility: (idCounter: IdCounter, playerInputBinding?: string) => Ability,
    createAbilityUpgradeOptions?: (ability: Ability) => UpgradeOptionAndProbability[],
    createAbilityBossUpgradeOptions?: (ability: Ability, character: Character, game: Game) => UpgradeOptionAndProbability[],
    deleteAbilityObject?: (abilityObject: AbilityObject, game: Game) => boolean,
    executeUpgradeOption?: (ability: Ability, character: Character, upgradeOption: UpgradeOption, game: Game) => void,
    getLongDescription?: () => string[],
    paintAbility?: (ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) => void,
    paintAbilityObject?: (ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) => void,
    paintAbilityUI?: (ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) => void,
    paintAbilityStatsUI?: (ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, game: Game) => { width: number, height: number },
    onHit?: (ability: Ability, targetCharacter: Character, game: Game) => void,
    onObjectHit?: (abilityObject: AbilityObject, targetCharacter: Character, game: Game) => void,
    resetAbility?: (ability: Ability) => void,
    setAbilityToLevel?: (ability: Ability, level: number) => void,
    setAbilityToEnemyLevel?: (ability: Ability, level: number, damageFactor: number) => void,
    setAbilityToBossLevel?: (ability: Ability, level: number) => void,
    tickAbility?: (abilityOwner: AbilityOwner, ability: Ability, game: Game) => void,
    tickBossAI?: (abilityOwner: AbilityOwner, ability: Ability, game: Game) => void,
    tickAbilityObject?: (abilityObject: AbilityObject, game: Game) => void,
    abilityUpgradeFunctions?: AbilityUpgradesFunctions,
    canBeUsedByBosses?: boolean,
}

export type AbilitiesFunctions = {
    [key: string]: AbilityFunctions,
}

export const ABILITIES_FUNCTIONS: AbilitiesFunctions = {};

export function onDomLoadSetAbilitiesFunctions() {
    addAbilityShoot();
    addAbilityFireCircle();
    addAbilitySword();
    addAbilityTower();
    addAbilityDeathCircle();
    addAbilityLesh();
    addAbilityHpRegen();
    addAbilityMelee();
    addAbilityIceAura();
    addAbilitySingleTarget();
    addAbilitySnipe();
    addAbilitySpeedBoost();
    addAbilitySlowTrail();
    addAbilityFireLine();
    addAbilityExplode();
    addAbilityFeedPet();
    addAbilityLovePet();
    addAbilityPetBreath();
    addAbilityPetPainter();
    addAbilityPetDash();
    addAbilityBounceBall();
    addAbilityLightningBall();
    addAbilityLightningStrikes();
}

export function addAbilityToCharacter(character: Character, ability: Ability) {
    if (ability.unique) {
        const dupIndex = character.abilities.findIndex((a) => a.name === ability.name);
        if (dupIndex !== -1) {
            if (!character.abilities[dupIndex].gifted) {
                return;
            } else {
                character.abilities.splice(dupIndex, 1);
            }
        }
    }
    character.abilities.push(ability);
}

export function paintAbilityObjects(ctx: CanvasRenderingContext2D, abilityObjects: AbilityObject[], game: Game, paintOrder: PaintOrderAbility) {
    paintAbilityObjectsForFaction(ctx, abilityObjects, game, paintOrder, FACTION_PLAYER);
    paintAbilityObjectsForFaction(ctx, abilityObjects, game, paintOrder, FACTION_ENEMY);
}

export function setAbilityToBossLevel(ability: Ability, level: number) {
    const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
    if (abilityFunctions.setAbilityToBossLevel) {
        abilityFunctions.setAbilityToBossLevel(ability, level);
        const upgradeFunctions = abilityFunctions.abilityUpgradeFunctions;
        if(upgradeFunctions){
            const upgradeKeys = Object.keys(ability.upgrades);
            for(let upKey of upgradeKeys){
                let upFunction = upgradeFunctions[upKey];
                if(upFunction && upFunction.setUpgradeToBossLevel){
                    upFunction.setUpgradeToBossLevel(ability, level);
                }
            }
        }
    } else {
        console.log("function setAbilityToBossLevel missing for" + ability.name);
    }
}

export function createAbility(abilityName: string, idCounter: IdCounter, isLeveling: boolean = false, getsBossSkillPoints: boolean = false, playerInputBinding: string | undefined = undefined): Ability {
    const abilityFunctions = ABILITIES_FUNCTIONS[abilityName];
    const ability = abilityFunctions.createAbility(idCounter, playerInputBinding);

    if (isLeveling) {
        ability.leveling = { experience: 0, experienceForLevelUp: 10, level: 1 };
    }
    if (getsBossSkillPoints) {
        if (abilityFunctions.createAbilityBossUpgradeOptions) {
            ability.bossSkillPoints = 0;
        } else {
            console.log(`${abilityName} is missing bossUpgradeOptions`);
        }
    }
    return ability;
}

export function tickAbilityObjects(abilityObjects: AbilityObject[], game: Game) {
    takeTimeMeasure(game.debug, "", "tickAbilityObjects");
    for (let i = abilityObjects.length - 1; i >= 0; i--) {
        const abilityFunctions = ABILITIES_FUNCTIONS[abilityObjects[i].type];
        if (abilityFunctions.tickAbilityObject !== undefined) {
            abilityFunctions.tickAbilityObject(abilityObjects[i], game);
        } else {
            throw new Error("tickAbilityObject not defined for " + abilityObjects[i].type);
        }
        if (abilityFunctions.deleteAbilityObject !== undefined) {
            if (abilityFunctions.deleteAbilityObject(abilityObjects[i], game)) {
                abilityObjects.splice(i, 1);
            }
        } else {
            throw new Error("deleteAbilityObject not defined for " + abilityObjects[i].type);
        }
    }
    takeTimeMeasure(game.debug, "tickAbilityObjects", "");
}

export function levelingAbilityXpGain(ability: Ability, experience: number, game: Game) {
    if (ability.leveling) {
        const owner = findAbilityOwnerByAbilityId(ability.id, game);
        if (!owner || owner.isDead || owner.isPet) return;
        ability.leveling.experience += experience;
        while (ability.leveling.experience >= ability.leveling.experienceForLevelUp) {
            levelUp(ability);
        }
    }
}

export function findAbilityOwnerByAbilityId(abilityId: number, game: Game): Character | undefined {
    for (let player of game.state.players) {
        const ability = player.character.abilities.find(a => a.id === abilityId);
        if (ability) return player.character;
        if (player.character.pets) {
            for (let pet of player.character.pets) {
                const abilityPet = pet.abilities.find(a => a.id === abilityId);
                if (abilityPet) return pet;
            }
        }
    }
    return undefined;
}

export function findAbilityAndOwnerById(abilityId: number, game: Game): { ability: Ability, owner: AbilityOwner } | undefined {
    for (let player of game.state.players) {
        const result = findAbilityAndOwnerInCharacterById(player.character, abilityId);
        if (result) return result;
    }
    for (let pastChar of game.state.pastPlayerCharacters.characters) {
        if (!pastChar) continue;
        const result = findAbilityAndOwnerInCharacterById(pastChar, abilityId);
        if (result) return result;
    }
    for (let i = 0; i < game.state.bossStuff.bosses.length; i++) {
        const boss = game.state.bossStuff.bosses[i];
        const result = findAbilityAndOwnerInCharacterById(boss, abilityId);
        if (result) return result;
    }
    const map = game.state.map;
    for (let i = 0; i < map.activeChunkKeys.length; i++) {
        const chunkChars = map.chunks[map.activeChunkKeys[i]].characters;
        for(let character of chunkChars){
            const result = findAbilityAndOwnerInCharacterById(character, abilityId);
            if (result) return result;
        }
    }
    return undefined;
}

export function findAbilityById(abilityId: number, game: Game): Ability | undefined {
    const result = findAbilityAndOwnerById(abilityId, game);
    if (result) return result.ability;
    return undefined;
}

export function findAbilityOwnerById(abilityId: number, game: Game): AbilityOwner | undefined {
    const result = findAbilityAndOwnerById(abilityId, game);
    if (result) return result.owner;
    return undefined;
}

export function resetAllCharacterAbilities(character: Character) {
    for (let ability of character.abilities) {
        const abililtyFunctions = ABILITIES_FUNCTIONS[ability.name];
        if (abililtyFunctions && abililtyFunctions.resetAbility) {
            abililtyFunctions.resetAbility(ability);
            const upgradesFunctions = abililtyFunctions.abilityUpgradeFunctions;
            if (!upgradesFunctions) continue;
            const keys = Object.keys(ability.upgrades);
            for (let key of keys) {
                const functions = upgradesFunctions[key];
                if (functions.reset) {
                    functions.reset(ability);
                }
            }
        }
    }
    if (character.pets) {
        for (let pet of character.pets) {
            resetAllCharacterAbilities(pet);
        }
    }
}

export function paintDefaultAbilityStatsUI(ctx: CanvasRenderingContext2D, textLines: string[], drawStartX: number, drawStartY: number): { width: number, height: number } {
    const fontSize = 14;
    ctx.font = fontSize + "px Arial";
    let width = 0;
    for (let text of textLines) {
        let currentWidth = ctx.measureText(text).width + 4;
        if (currentWidth > width) width = currentWidth;
    }
    const height = textLines.length * fontSize + 6;
    ctx.fillStyle = "white";
    ctx.fillRect(drawStartX, drawStartY, width, height);
    ctx.fillStyle = "black";
    for (let i = 0; i < textLines.length; i++) {
        ctx.fillText(textLines[i], drawStartX + 2, drawStartY + fontSize * (i + 1) + 2);
    }
    return { width, height };
}

export function getAbilityNameUiText(ability: Ability): string[] {
    const text: string[] = [`Ability: ${ability.name}`];
    if (ability.gifted) {
        text[0] += " (gifted)";
        text.push("gifted abilities can not get stronger");
    }
    return text;
}

export function detectAbilityObjectCircleToCharacterHit(map: GameMap, abilityObject: AbilityObjectCircle, game: Game) {
    detectCircleCharacterHit(map, abilityObject, abilityObject.radius, abilityObject.faction, abilityObject.abilityRefId!, abilityObject.damage, game, abilityObject);
}

export function detectCircleCharacterHit(map: GameMap, circleCenter: Position, circleRadius: number, faction: string, abilityId: number, damage: number, game: Game, abilityObject: AbilityObject | undefined = undefined, ability: Ability | undefined = undefined) {
    const maxEnemySizeEstimate = 40;

    const characters = determineCharactersInDistance(circleCenter, map, game.state.players, game.state.bossStuff.bosses, circleRadius * 2 + maxEnemySizeEstimate, faction);
    for (let charIt = characters.length - 1; charIt >= 0; charIt--) {
        const c = characters[charIt];
        if (c.isDead || c.faction === faction) continue;
        const distance = calculateDistance(c, circleCenter);
        if (distance < circleRadius + c.width / 2) {
            characterTakeDamage(c, damage, game, abilityId);
            if (abilityObject) {
                const abilityFunction = ABILITIES_FUNCTIONS[abilityObject.type];
                if (abilityFunction.onObjectHit) {
                    abilityFunction.onObjectHit(abilityObject, c, game);
                    if (abilityFunction.canObjectHitMore && !abilityFunction.canObjectHitMore(abilityObject)) {
                        break;
                    }
                }
            } else if (ability) {
                const abilityFunction = ABILITIES_FUNCTIONS[ability.name];
                if (abilityFunction.onHit) {
                    abilityFunction.onHit(ability, c, game);
                }
            }
        }
    }
}

export function detectSomethingToCharacterHit(
    map: GameMap,
    position: Position,
    size: number,
    faction: string,
    damage: number,
    players: Player[],
    bosses: BossEnemyCharacter[],
    abilityRefId: number | undefined,
    onHitAndReturnIfContinue: ((target: Character) => boolean) | undefined,
    game: Game,
): number {
    const maxEnemySizeEstimate = 40;
    let hitCount = 0;

    const characters = determineCharactersInDistance(position, map, players, bosses, size + maxEnemySizeEstimate);
    for (let charIt = characters.length - 1; charIt >= 0; charIt--) {
        const c = characters[charIt];
        if (c.isDead || c.faction === faction) continue;
        const distance = calculateDistance(c, position);
        if (distance < size / 2 + c.width / 2) {
            characterTakeDamage(c, damage, game, abilityRefId);
            hitCount++;
            if (onHitAndReturnIfContinue) {
                const continueHitDetection = onHitAndReturnIfContinue(c);
                if (!continueHitDetection) break;
            }
        }
    }
    return hitCount;
}

export function paintUiForAbilities(ctx: CanvasRenderingContext2D, game: Game) {
    if (game.camera.characterId === undefined) return;
    const player = findPlayerByCharacterId(game.state.players, game.camera.characterId);
    if (!player) return;

    const size = 40;
    let startX = ctx.canvas.width / 2 - 20;
    const startY = ctx.canvas.height - size - 2;
    for (let ability of player.character.abilities) {
        let abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        if (abilityFunctions?.paintAbilityUI !== undefined) {
            abilityFunctions.paintAbilityUI(ctx, ability, startX, startY, size, game);
            startX += size;
        }
    }
}

function findAbilityAndOwnerInCharacterById(character: Character, abilityId: number): { ability: Ability, owner: AbilityOwner } | undefined {
    for (let ability of character.abilities) {
        if (ability.id === abilityId) return { ability: ability, owner: character };
    }
    if (character.pets) {
        for (let pet of character.pets) {
            for (let ability of pet.abilities) {
                if (ability.id === abilityId) return { ability: ability, owner: pet };
            }
        }
    }
    return undefined;
}

function paintAbilityObjectsForFaction(ctx: CanvasRenderingContext2D, abilityObjects: AbilityObject[], game: Game, paintOrder: PaintOrderAbility, faction: string) {
    for (let abilityObject of abilityObjects) {
        if (abilityObject.faction === faction) {
            let abilityFunctions = ABILITIES_FUNCTIONS[abilityObject.type];
            if (abilityFunctions?.paintAbilityObject !== undefined) {
                abilityFunctions.paintAbilityObject(ctx, abilityObject, paintOrder, game);
            } else {
                paintDefault(ctx, abilityObject, getCameraPosition(game), paintOrder, game);
            }
        }
    }
}

function paintDefault(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, cameraPosition: Position, paintOrder: PaintOrderAbility, game: Game) {
    if (paintOrder === "afterCharacterPaint") {
        const circle = abilityObject as AbilityObjectCircle;
        if (!circle.radius) return;
        const paintPos = getPointPaintPosition(ctx, abilityObject, cameraPosition);
        if(abilityObject.faction === FACTION_PLAYER) ctx.globalAlpha *= game.UI.playerGlobalAlphaMultiplier;
        ctx.fillStyle = abilityObject.faction === FACTION_ENEMY ? "black" : abilityObject.color;
        ctx.beginPath();
        ctx.arc(
            paintPos.x,
            paintPos.y,
            circle.radius, 0, 2 * Math.PI
        );
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

function levelUp(ability: Ability) {
    if (ability.leveling) {
        ability.leveling.level++;
        ability.leveling.experience -= ability.leveling.experienceForLevelUp;
        ability.leveling.experienceForLevelUp += ability.leveling.level * 5;
        if (ability.leveling.level > 100) {
            ability.leveling.experienceForLevelUp = Math.floor(ability.leveling.experienceForLevelUp * 1.01);
        }
        const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        if (abilityFunctions.setAbilityToLevel) {
            abilityFunctions.setAbilityToLevel(ability, ability.leveling.level);
        } else {
            throw new Error("Ability missing function 'setAbilityToLevel' " + ability.name);
        }
    }
}
