import { determineCharactersInDistance, characterTakeDamage } from "../character/character.js"
import { Character } from "../character/characterModel.js"
import { BossEnemyCharacter } from "../character/enemy/bossEnemy.js"
import { calculateDistance, getCameraPosition, levelUpIncreaseExperienceRequirement, takeTimeMeasure } from "../game.js"
import { SkillPoints, FACTION_ENEMY, FACTION_PLAYER, Game, IdCounter, Legendary, Position } from "../gameModel.js"
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
import { getPointPaintPosition, paintTextWithOutline } from "../gamePaint.js"
import { addAbilityBounceBall } from "./ball/abilityBounceBall.js"
import { addAbilityLightningBall } from "./ball/abilityLightningBall.js"
import { addAbilityLightningStrikes } from "./abilityLightningStrikes.js"
import { addAbilitySnipeReload } from "./snipe/abilitySnipeReload.js"
import { playerInputBindingToDisplayValue } from "../input/playerInput.js"
import { addAbilityUnleashPet } from "./petTamer/abilityUnleashPet.js"
import { Leveling } from "../character/playerCharacters/levelingCharacter.js"
import { AbilityUiRectangle, CharacterClass } from "../character/playerCharacters/playerCharacters.js"
import { MoreInfoPart, paintMoreInfosPart } from "../moreInfo.js"
import { AbilityDamageBreakdown, addDamageBreakDownToDamageMeter } from "../combatlog.js"
import { addAbilityMusicSheet } from "./musician/abilityMusicSheet.js"
import { addAbilityCircleAround } from "./abilityCircleAround.js"
import { GAME_IMAGES, getImage, loadImage } from "../imageLoad.js"
import { TamerPetCharacter } from "../character/playerCharacters/tamer/tamerPetCharacter.js"
import { addAbilityCloud } from "./abilityCloud.js"
import { Curse, doCurseDamageBreakDown } from "../curse/curse.js"
import { addAbilityPoisonTile } from "./abilityPoisonTile.js"
import { CHARACTER_PET_TYPE_CLONE } from "../character/playerCharacters/characterPetTypeClone.js"
import { addAbilityPetBoomerang } from "./petTamer/abilityPetBoomerang.js"

export type Ability = {
    id: number,
    name: string,
    passive: boolean,
    playerInputBinding?: string,
    level?: Leveling,
    bossSkillPoints?: SkillPoints,
    upgrades: {
        [key: string]: any,
    },
    legendary?: Legendary,
    tradable?: boolean,
    unique?: boolean,
    gifted?: boolean,
    disabled?: boolean,
    classIdRef?: number,
    doDamageBreakDown?: boolean,
}
export type PaintOrderAbility = "beforeCharacterPaint" | "afterCharacterPaint";
export type AbilityObject = Position & {
    type: string,
    color: string,
    damage: number,
    faction: string,
    abilityIdRef?: number,
    id?: number,
    abilityRefTypeDoOnHit?: string,
    specificDamageForFactionPlayer?: number,
}

export type AbilityObjectCircle = AbilityObject & {
    radius: number,
}

export type AbilityOwner = Position & Partial<Character> & {
    faction: string,
    id: number,
}

export type AbilityFunctions = {
    activeAbilityCast?: (abilityOwner: AbilityOwner, ability: Ability, castPosition: Position, castPositionRelativeToCharacter: Position | undefined, isKeydown: boolean, game: Game) => void,
    canObjectHitMore?: (abilityObject: AbilityObject) => boolean,
    createAbility: (idCounter: IdCounter, playerInputBinding?: string) => Ability,
    createAbilityUpgradeOptions?: (ability: Ability) => UpgradeOptionAndProbability[],
    createAbilityBossUpgradeOptions?: (ability: Ability, character: Character, game: Game) => UpgradeOptionAndProbability[],
    createAbilityMoreInfos?: (ctx: CanvasRenderingContext2D, ability: Ability, game: Game) => MoreInfoPart,
    createDamageBreakDown?: (damage: number, ability: Ability, abilityObject: AbilityObject | undefined, damageAbilityName: string, game: Game, faction: string) => AbilityDamageBreakdown[],
    deleteAbilityObject?: (abilityObject: AbilityObject, game: Game) => boolean,
    executeUpgradeOption?: (ability: Ability, character: Character, upgradeOption: UpgradeOption, game: Game) => void,
    getMoreInfosText?: () => string[],
    paintAbility?: (ctx: CanvasRenderingContext2D, abilityOwner: AbilityOwner, ability: Ability, cameraPosition: Position, game: Game) => void,
    paintAbilityObject?: (ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, paintOrder: PaintOrderAbility, game: Game) => void,
    paintAbilityUI?: (ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) => void,
    paintAbilityAccessoire?: (ctx: CanvasRenderingContext2D, ability: Ability, paintPosition: Position, game: Game) => void,
    onHit?: (ability: Ability, targetCharacter: Character, game: Game) => void,
    onObjectHit?: (abilityObject: AbilityObject, targetCharacter: Character, game: Game) => void,
    resetAbility?: (ability: Ability) => void,
    setAbilityToLevel?: (ability: Ability, level: number) => void,
    setAbilityToEnemyLevel?: (ability: Ability, level: number, damageFactor: number) => void,
    setAbilityToBossLevel?: (ability: Ability, level: number) => void,
    setUpAbilityForEnemy?: (abilityOwner: AbilityOwner, ability: Ability, game: Game) => void,
    tickAbility?: (abilityOwner: AbilityOwner, ability: Ability, game: Game) => void,
    tickAI?: (abilityOwner: AbilityOwner, ability: Ability, game: Game) => void,
    tickAbilityObject?: (abilityObject: AbilityObject, game: Game) => void,
    abilityUpgradeFunctions?: AbilityUpgradesFunctions,
    canBeUsedByBosses?: boolean,
    positionNotRquired?: boolean,
    selfLatePaint?: boolean, // e.g.: used for paint after darkness map modifier for music sheet
    tickWhenDisabled?: boolean,
}

export type AbilitiesFunctions = {
    [key: string]: AbilityFunctions,
}

export const ABILITY_DEFAULT_SMALL_GROUP = "SmallGroup";
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
    addAbilitySnipeReload();
    addAbilitySpeedBoost();
    addAbilitySlowTrail();
    addAbilityFireLine();
    addAbilityExplode();
    addAbilityFeedPet();
    addAbilityLovePet();
    addAbilityPetBreath();
    addAbilityPetPainter();
    addAbilityPetDash();
    addAbilityPetBoomerang();
    addAbilityBounceBall();
    addAbilityLightningBall();
    addAbilityLightningStrikes();
    addAbilityUnleashPet();
    addAbilityMusicSheet();
    addAbilityCircleAround();
    addAbilityCloud();
    addAbilityPoisonTile();
}

export function doAbilityDamageBreakDown(damage: number, ability: Ability | undefined, abilityObject: AbilityObject | undefined, damageAbilityName: string, clientId: number, petName: string | undefined, game: Game, faction: string) {
    if (!ability || !ability.doDamageBreakDown) return;
    let abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
    if (abilityFunctions && abilityFunctions.createDamageBreakDown) {
        const breakdowns = abilityFunctions.createDamageBreakDown(damage, ability, abilityObject, damageAbilityName, game, faction);
        addDamageBreakDownToDamageMeter(game.UI.damageMeter, ability, breakdowns, clientId, petName);
    }
}

export function doAbilityDamageBreakDownForAbilityId(damage: number, abilityId: number, abilityObject: AbilityObject | undefined, damageAbilityName: string, game: Game) {
    let ability: Ability | undefined = undefined;
    let clientId = -1;
    let petName: string | undefined = undefined;
    for (let player of game.state.players) {
        const result = findAbilityOrCurseInCharacterById(player.character, abilityId);
        if (result) {
            if (result.ability) {
                ability = result.ability;
                clientId = player.clientId;
                if (result.owner.paint?.color) {
                    const pet = result.owner as TamerPetCharacter;
                    petName = pet.paint.color;
                    if (pet.gifted) petName += "[g]";
                    if (pet.legendary) petName += "[L]";
                }
                if (result.owner.type === CHARACTER_PET_TYPE_CLONE) petName = "Clone";
                if (!ability) return;
                doAbilityDamageBreakDown(damage, ability, abilityObject, damageAbilityName, clientId, petName, game, player.character.faction);
                return;
            }
            if (result.curse) {
                doCurseDamageBreakDown(damage, result.curse, clientId, game);
            }
        }
    }
}

export function addAbilityToCharacter(character: Character, ability: Ability, charClass: CharacterClass | undefined = undefined) {
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
    if (character.faction === FACTION_PLAYER) {
        let abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        if (abilityFunctions && abilityFunctions.createDamageBreakDown) {
            ability.doDamageBreakDown = true;
        }
    }
    character.abilities.push(ability);
    if (charClass) ability.classIdRef = charClass.id;
}

export function paintAbilityObjects(ctx: CanvasRenderingContext2D, abilityObjects: AbilityObject[], game: Game, paintOrder: PaintOrderAbility) {
    paintAbilityObjectsFaction(ctx, abilityObjects, game, paintOrder, true);
    paintAbilityObjectsFaction(ctx, abilityObjects, game, paintOrder, false);
}

export function setAbilityToLevel(ability: Ability, level: number) {
    const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
    if (abilityFunctions && abilityFunctions.setAbilityToLevel) {
        abilityFunctions.setAbilityToLevel(ability, level);
    }
}

export function setAbilityToBossLevel(ability: Ability, level: number) {
    const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
    if (abilityFunctions.setAbilityToBossLevel) {
        abilityFunctions.setAbilityToBossLevel(ability, level);
        const upgradeFunctions = abilityFunctions.abilityUpgradeFunctions;
        if (upgradeFunctions) {
            const upgradeKeys = Object.keys(ability.upgrades);
            for (let upKey of upgradeKeys) {
                let upFunction = upgradeFunctions[upKey];
                if (upFunction && upFunction.setUpgradeToBossLevel) {
                    upFunction.setUpgradeToBossLevel(ability, level);
                }
            }
        }
    }
}

export function createAbility(abilityName: string, idCounter: IdCounter, isLeveling: boolean = false, getsBossSkillPoints: boolean = false, playerInputBinding: string | undefined = undefined): Ability {
    const abilityFunctions = ABILITIES_FUNCTIONS[abilityName];
    const ability = abilityFunctions.createAbility(idCounter, playerInputBinding);

    if (isLeveling) {
        ability.level = {
            level: 1,
            leveling: {
                experience: 0, experienceForLevelUp: 10
            }
        };
    }
    if (getsBossSkillPoints) {
        if (abilityFunctions.createAbilityBossUpgradeOptions) {
            ability.bossSkillPoints = { available: 0, used: 0 };
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

export function levelingAbilityXpGain(ability: Ability, owner: Character, experience: number, game: Game) {
    if (ability.level?.leveling) {
        if (!owner) return;
        if (ability.legendary && ability.legendary.levelCap <= ability.level.level) return;
        ability.level.leveling.experience += experience * (owner.experienceGainFactor ?? 1);
        while (ability.level.leveling.experience >= ability.level.leveling.experienceForLevelUp) {
            levelUp(ability);
        }
    }
}

export function findAbilityOwnerByAbilityIdInPlayers(abilityId: number, game: Game): { abilityOwner: Character, petOwner?: Character } | undefined {
    for (let player of game.state.players) {
        const ability = player.character.abilities.find(a => a.id === abilityId);
        if (ability) return { abilityOwner: player.character };
        if (player.character.pets) {
            for (let pet of player.character.pets) {
                const abilityPet = pet.abilities.find(a => a.id === abilityId);
                if (abilityPet) return { abilityOwner: pet, petOwner: player.character };
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
        for (let character of chunkChars) {
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
                if (functions && functions.reset) {
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

export function getAbilityNameUiText(ability: Ability): string[] {
    const text: string[] = [`Ability: ${ability.name}`];
    if (ability.gifted) {
        text[0] += " (gifted)";
    }
    if (ability.legendary) {
        text.push(`Legendary: Ability levels and upgrades are permanent.`);
        if (ability.bossSkillPoints) {
            text.push(`  Skill Point Cap: ${ability.bossSkillPoints.used}/${ability.legendary.skillPointCap}`);
            if (ability.level) text.push(`  Level Cap: ${ability.level.level}/${ability.legendary.levelCap}`);
            let blessings = "  Blessings: ";
            if (ability.legendary.blessings.length === 0) {
                blessings += "none";
            } else {
                for (let i = 0; i < ability.legendary.blessings.length; i++) {
                    if (i > 0) blessings += ", ";
                    blessings += ability.legendary.blessings[i];
                }
            }
            text.push(blessings);
        }
    };

    return text;
}

export function detectAbilityObjectCircleToCharacterHit(map: GameMap, abilityObject: AbilityObjectCircle, game: Game) {
    detectCircleCharacterHit(map, abilityObject, abilityObject.radius, abilityObject.faction, abilityObject.abilityIdRef!, abilityObject.damage, game, abilityObject, undefined, abilityObject.specificDamageForFactionPlayer);
}

export function detectCircleCharacterHit(map: GameMap, circleCenter: Position, circleRadius: number, faction: string, abilityId: number, damage: number, game: Game, abilityObject: AbilityObject | undefined = undefined, ability: Ability | undefined = undefined, specificDamageForFactionPlayer: number | undefined = undefined) {
    const maxEnemySizeEstimate = 40;

    const characters = determineCharactersInDistance(circleCenter, map, game.state.players, game.state.bossStuff.bosses, circleRadius * 2 + maxEnemySizeEstimate, faction);
    for (let charIt = characters.length - 1; charIt >= 0; charIt--) {
        const c = characters[charIt];
        if (c.state === "dead" || c.faction === faction) continue;
        const distance = calculateDistance(c, circleCenter);
        if (distance < circleRadius + c.width / 2) {
            let abilityName = "Unknown";
            if (abilityObject) {
                abilityName = abilityObject.type;
            } else if (ability) {
                abilityName = ability.name;
            }
            let takeDamage = damage;
            if (specificDamageForFactionPlayer !== undefined && c.faction === FACTION_PLAYER) takeDamage = specificDamageForFactionPlayer;
            characterTakeDamage(c, takeDamage, game, abilityId, abilityName, abilityObject);
            if (abilityObject) {
                let abilityFunction = ABILITIES_FUNCTIONS[abilityObject.type];
                if (abilityObject.abilityRefTypeDoOnHit) {
                    abilityFunction = ABILITIES_FUNCTIONS[abilityObject.abilityRefTypeDoOnHit];
                }
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
    abilityName: string,
    abilityIdRef: number | undefined,
    onHitAndReturnIfContinue: ((target: Character) => boolean) | undefined,
    game: Game,
    abilityObject: AbilityObject | undefined = undefined,
): number {
    const maxEnemySizeEstimate = 40;
    let hitCount = 0;

    const characters = determineCharactersInDistance(position, map, players, bosses, size + maxEnemySizeEstimate);
    for (let charIt = characters.length - 1; charIt >= 0; charIt--) {
        const c = characters[charIt];
        if (c.state === "dead" || c.faction === faction) continue;
        const distance = calculateDistance(c, position);
        if (distance < size / 2 + c.width / 2) {
            characterTakeDamage(c, damage, game, abilityIdRef, abilityName, abilityObject);
            hitCount++;
            if (onHitAndReturnIfContinue) {
                const continueHitDetection = onHitAndReturnIfContinue(c);
                if (!continueHitDetection) break;
            }
        }
    }
    return hitCount;
}

export function createMoreInfosAbilities(ctx: CanvasRenderingContext2D, abilities: Ability[], game: Game): MoreInfoPart[] {
    const result: MoreInfoPart[] = [];
    for (let ability of abilities) {
        const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        if (abilityFunctions.createAbilityMoreInfos) {
            result.push(abilityFunctions.createAbilityMoreInfos(ctx, ability, game));
        }
    }
    return result;
}

export function findAbilityOrCurseInCharacterById(character: Character, sourceId: number): { ability?: Ability, curse?: Curse, owner: AbilityOwner } | undefined {
    for (let ability of character.abilities) {
        if (ability.id === sourceId) return { ability: ability, owner: character };
    }
    if (character.curses) {
        for (let curse of character.curses) {
            if (curse.id === sourceId) return { curse: curse, owner: character };
        }
    }
    if (character.pets) {
        for (let pet of character.pets) {
            for (let ability of pet.abilities) {
                if (ability.id === sourceId) return { ability: ability, owner: pet };
            }
        }
    }
    return undefined;
}


export function findAbilityAndOwnerInCharacterById(character: Character, abilityId: number): { ability: Ability, owner: AbilityOwner } | undefined {
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

function calculateAbilityUiRectangles(ctx: CanvasRenderingContext2D, player: Player, game: Game) {
    if (!game.UI.playerCharacterAbilityUI || game.UI.playerCharacterAbilityUI.charClassRefId !== player.character.id) {
        game.UI.playerCharacterAbilityUI = {
            abilityVisualizedCounter: player.character.abilities.length,
            charClassRefId: player.character.id,
        }
    }
    const abilityUiRectangles: AbilityUiRectangle[] = [];
    const usedInputs: string[] = [];

    for (let ability of player.character.abilities) {
        if (ability.playerInputBinding) {
            const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
            if (game.UI.inputType === "touch") {
                const usedInputIndex = usedInputs.indexOf(ability.playerInputBinding);
                if (usedInputIndex !== -1) {
                    if (abilityUiRectangles[usedInputIndex].positionNotRequired
                        && !abilityFunctions.positionNotRquired
                    ) {
                        abilityUiRectangles.splice(usedInputIndex, 1, {
                            abilityRefId: ability.id,
                            positionNotRequired: abilityFunctions.positionNotRquired,
                            height: 0,
                            width: 0,
                            topLeft: { x: 0, y: 0 },
                        });
                    }
                    continue;
                }
                usedInputs.push(ability.playerInputBinding);
            }
            abilityUiRectangles.push({
                abilityRefId: ability.id,
                positionNotRequired: abilityFunctions.positionNotRquired,
                height: 0,
                width: 0,
                topLeft: { x: 0, y: 0 },
            });
        }
    }
    if (game.UI.inputType === "touch") {
        const spacing = 10;
        const size = 60;
        const mobileAbilityUiPosition: Position[] = [
            { x: ctx.canvas.width - (size + spacing) * 2, y: ctx.canvas.height - size - spacing },
            { x: ctx.canvas.width - (size + spacing), y: ctx.canvas.height - size - spacing },
            { x: ctx.canvas.width - (size + spacing), y: ctx.canvas.height - (size + spacing) * 2 },
        ];
        for (let i = 0; i < abilityUiRectangles.length; i++) {
            if (i >= mobileAbilityUiPosition.length) break;
            abilityUiRectangles[i].topLeft.x = mobileAbilityUiPosition[i].x;
            abilityUiRectangles[i].topLeft.y = mobileAbilityUiPosition[i].y;
            abilityUiRectangles[i].height = size;
            abilityUiRectangles[i].width = size;
        }
    } else {
        const spacing = 2;
        const size = 40;
        const totalWidth = (abilityUiRectangles.length * (size + spacing) - spacing);
        let startX = ctx.canvas.width / 2 - totalWidth / 2;
        const startY = ctx.canvas.height - size - 2;
        for (let rectangle of abilityUiRectangles) {
            rectangle.topLeft.x = startX;
            rectangle.topLeft.y = startY;
            rectangle.height = size;
            rectangle.width = size;
            startX += size + spacing;
        }
    }
    game.UI.playerCharacterAbilityUI.rectangles = abilityUiRectangles;
}

export function paintUiForAbilities(ctx: CanvasRenderingContext2D, game: Game) {
    if (game.camera.characterId === undefined) return;
    const player = findPlayerByCharacterId(game.state.players, game.camera.characterId);
    if (!player) return;
    calculateAbilityUiRectangles(ctx, player, game);
    const abilityUi = game.UI.playerCharacterAbilityUI;
    if (!abilityUi || !abilityUi.rectangles) return;
    if (!game.UI.playerCharacterAbilityUI || game.UI.playerCharacterAbilityUI.charClassRefId !== player.character.id) {
        game.UI.playerCharacterAbilityUI = {
            abilityVisualizedCounter: player.character.abilities.length,
            charClassRefId: player.character.id,
        }
    }
    const shouldAnimate = game.UI.playerCharacterAbilityUI.abilityVisualizedCounter < abilityUi.rectangles.length;
    let animateIndex = player.character.abilities.length + 1;
    let animationPerCent = 0;
    if (shouldAnimate) {
        animateIndex = game.UI.playerCharacterAbilityUI.abilityVisualizedCounter;
        if (game.UI.playerCharacterAbilityUI.abilityVisualizeStartTime === undefined) game.UI.playerCharacterAbilityUI.abilityVisualizeStartTime = game.state.time;
        const animationTime = 500;
        animationPerCent = (game.state.time - game.UI.playerCharacterAbilityUI.abilityVisualizeStartTime) / animationTime;
        if (animationPerCent >= 1) {
            game.UI.playerCharacterAbilityUI.abilityVisualizeStartTime = undefined;
            game.UI.playerCharacterAbilityUI.abilityVisualizedCounter++;
        }
    }

    for (let i = 0; i < abilityUi.rectangles.length; i++) {
        const rectangle = abilityUi.rectangles[i];
        const ability = player.character.abilities.find((a) => a.id === rectangle.abilityRefId);
        if (!ability) continue;
        let yOffset = 0;
        if (animateIndex === i) {
            yOffset = (1 - animationPerCent) * 300;
        } else if (i > animateIndex) break;
        const paintX = rectangle.topLeft.x;
        const paintY = rectangle.topLeft.y - yOffset;
        let abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        if (abilityFunctions?.paintAbilityUI !== undefined) {
            abilityFunctions.paintAbilityUI(ctx, ability, paintX, paintY, rectangle.height, game);
        } else if (ability.playerInputBinding) {
            paintKeyBindingUI(ctx, ability, paintX, paintY, rectangle.height, game);
        } else {
            continue;
        }
        paintAbilityMoreInfosIfMouseHovered(ctx, ability, paintX, paintY, rectangle.height, game);
    }
}

export function paintAbilityUiKeyBind(ctx: CanvasRenderingContext2D, playerInputBinding: string, drawStartX: number, drawStartY: number, game: Game) {
    let keyBind = playerInputBindingToDisplayValue(playerInputBinding, game);
    ctx.fillStyle = "black";
    const fontSize = keyBind.length > 4 ? 10 : 12;
    ctx.font = `bold ${fontSize}px Arial`;
    if (keyBind === "Mouse Left") {
        const keyImageSize = 15;
        const mouse0Image = GAME_IMAGES["mouse0Key"];
        loadImage(mouse0Image);
        if (mouse0Image.imageRef?.complete) {
            ctx.drawImage(
                mouse0Image.imageRef,
                0,
                0,
                20,
                20,
                drawStartX - 2,
                drawStartY - 2,
                keyImageSize,
                keyImageSize
            );
        }
    } else {
        paintTextWithOutline(ctx, "white", "black", keyBind, drawStartX + 1, drawStartY + fontSize - 1, false, 2);
    }
}

export function paintAbilityUiDefault(
    ctx: CanvasRenderingContext2D,
    ability: Ability,
    drawStartX: number,
    drawStartY: number,
    size: number,
    game: Game,
    imageName: string | undefined = undefined,
    grayFillPercent: number = 0,
    counter: number | undefined = undefined,
) {
    const rectSize = size;

    ctx.lineWidth = 1;
    ctx.strokeStyle = "black";
    ctx.fillStyle = "white";
    ctx.fillRect(drawStartX, drawStartY, rectSize, rectSize);
    ctx.beginPath();
    ctx.rect(drawStartX, drawStartY, rectSize, rectSize);
    ctx.stroke();

    if (grayFillPercent > 0 && grayFillPercent <= 1) {
        ctx.fillStyle = "gray";
        ctx.fillRect(drawStartX, drawStartY, rectSize, rectSize * grayFillPercent);
    }
    if (imageName) {
        const image = getImage(imageName);
        if (image) {
            ctx.drawImage(image, 0, 0, 40, 40, drawStartX, drawStartY, rectSize, rectSize);
        }
    }

    if (counter !== undefined) {
        const fontSize = size - 4;
        ctx.font = fontSize + "px Arial";
        paintTextWithOutline(ctx, "white", "black", counter.toFixed(), Math.floor(drawStartX + size / 2), drawStartY + rectSize - (rectSize - fontSize), true);
    }
    paintAbilityInputBinding(ctx, ability, drawStartX, drawStartY, rectSize, game);
}

export function paintAbilityInputBinding(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, rectSize: number, game: Game) {
    if (ability.playerInputBinding) {
        if (game.UI.inputType === "touch") {
            const abilityUi = game.UI.playerCharacterAbilityUI;
            if (abilityUi
                && abilityUi.selectedRectangleIndex !== undefined
                && abilityUi.rectangles !== undefined
            ) {
                const rectangle = abilityUi.rectangles[abilityUi.selectedRectangleIndex];
                if (ability.id === rectangle.abilityRefId) {
                    ctx.globalAlpha = 0.5;
                    ctx.fillStyle = "green";
                    ctx.fillRect(drawStartX, drawStartY, rectSize, rectSize);
                    ctx.globalAlpha = 1;
                }
            }
        } else {
            paintAbilityUiKeyBind(ctx, ability.playerInputBinding, drawStartX, drawStartY, game);
        }
    }
}

function paintAbilityMoreInfosIfMouseHovered(ctx: CanvasRenderingContext2D, ability: Ability, startX: number, startY: number, size: number, game: Game) {
    if (game.UI.displayMoreInfos) return;
    const mousePos = game.mouseRelativeCanvasPosition;
    if (mousePos.y > startY && mousePos.y < startY + size
        && mousePos.x > startX && mousePos.x < startX + size
    ) {
        const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        if (abilityFunctions.createAbilityMoreInfos) {
            const statUI = abilityFunctions.createAbilityMoreInfos(ctx, ability, game);
            const spacing = 5;
            paintMoreInfosPart(ctx, statUI, startX, startY - statUI.height - spacing);
        }
    }
}

function paintKeyBindingUI(ctx: CanvasRenderingContext2D, ability: Ability, drawStartX: number, drawStartY: number, size: number, game: Game) {
    if (!ability.playerInputBinding) return;
    const rectSize = size;
    ctx.strokeStyle = "black";
    ctx.fillStyle = "white";
    ctx.lineWidth = 1;
    ctx.fillRect(drawStartX, drawStartY, rectSize, rectSize);
    ctx.beginPath();
    ctx.rect(drawStartX, drawStartY, rectSize, rectSize);
    ctx.stroke();
    paintAbilityUiKeyBind(ctx, ability.playerInputBinding, drawStartX, drawStartY, game);
}

function paintAbilityObjectsFaction(ctx: CanvasRenderingContext2D, abilityObjects: AbilityObject[], game: Game, paintOrder: PaintOrderAbility, ifIsPlayerFaction: boolean) {
    var playerObjectCounter = 0;
    for (let abilityObject of abilityObjects) {
        if (ifIsPlayerFaction && abilityObject.faction === FACTION_PLAYER) {
            playerObjectCounter++;
            if (playerObjectCounter > game.UI.maxPaintPlayerObjects) return;
            let abilityFunctions = ABILITIES_FUNCTIONS[abilityObject.type];
            if (abilityFunctions?.paintAbilityObject !== undefined) {
                abilityFunctions.paintAbilityObject(ctx, abilityObject, paintOrder, game);
            } else {
                if (paintOrder === "beforeCharacterPaint") {
                    paintDefault(ctx, abilityObject, getCameraPosition(game), paintOrder, game);
                }
            }
        } else if (!ifIsPlayerFaction && abilityObject.faction !== FACTION_PLAYER) {
            let abilityFunctions = ABILITIES_FUNCTIONS[abilityObject.type];
            if (abilityFunctions?.paintAbilityObject !== undefined) {
                abilityFunctions.paintAbilityObject(ctx, abilityObject, paintOrder, game);
            } else {
                if (paintOrder === "afterCharacterPaint") {
                    paintDefault(ctx, abilityObject, getCameraPosition(game), paintOrder, game);
                }
            }
        }
    }
}

function paintDefault(ctx: CanvasRenderingContext2D, abilityObject: AbilityObject, cameraPosition: Position, paintOrder: PaintOrderAbility, game: Game) {
    const circle = abilityObject as AbilityObjectCircle;
    if (!circle.radius) return;
    const paintPos = getPointPaintPosition(ctx, abilityObject, cameraPosition, game.UI.zoom);
    if (abilityObject.faction === FACTION_PLAYER) ctx.globalAlpha *= game.UI.playerGlobalAlphaMultiplier;
    ctx.fillStyle = abilityObject.faction === FACTION_ENEMY ? "black" : abilityObject.color;
    ctx.beginPath();
    ctx.arc(
        paintPos.x,
        paintPos.y,
        circle.radius, 0, 2 * Math.PI
    );
    ctx.fill();
    if (abilityObject.faction === FACTION_ENEMY) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = "white";
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
}

function levelUp(ability: Ability) {
    if (ability.level?.leveling) {
        ability.level.level++;
        ability.level.leveling.experience -= ability.level.leveling.experienceForLevelUp;
        levelUpIncreaseExperienceRequirement(ability.level);
        const abilityFunctions = ABILITIES_FUNCTIONS[ability.name];
        if (abilityFunctions.setAbilityToLevel) {
            abilityFunctions.setAbilityToLevel(ability, ability.level.level);
        } else {
            throw new Error("Ability missing function 'setAbilityToLevel' " + ability.name);
        }
    }
}
