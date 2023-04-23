import { IdCounter } from "../../gameModel.js"
import { RandomSeed } from "../../randomNumberGenerator.js"
import { Character } from "../characterModel.js"
import { addAbilityLevelingCharacter } from "./abilityLevelingCharacter.js"
import { addLevelingCharacter } from "./levelingCharacterModel.js"
import { addSniperClass } from "./sniperCharacter.js"
import { addTowerClass } from "./towerCharacterClass.js"

export type PlayerCharacterClass = {
    createPlayerCharacter: (
        idCounter: IdCounter,
        x: number,
        y: number,
        width: number,
        height: number,
        color: string,
        moveSpeed: number,
        hp: number,
        damage: number,
        faction: string,
        seed: RandomSeed,
    ) => Character
}

export type PlayerCharacterClasses = {
    [key: string]: PlayerCharacterClass,
}

export function onDomLoadSetCharacterClasses() {
    addLevelingCharacter();
    addAbilityLevelingCharacter();
    //addShooterClass();
    //addSwordClass();
    //addCasterClass();
    //addSniperClass();
    addTowerClass();
}