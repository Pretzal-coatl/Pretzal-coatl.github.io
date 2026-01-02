"use strict";
class Challenge {
    constructor(name, description, multPerRock = 0, maxMult = Infinity) {
        this.locked = true;
        this.index = -1;
        this.mult = null;
        this.machineCompletions = 0;
        this.completed = false;
        this.name = name;
        this.description = description;
        this.multPerRock = multPerRock;
        this.node = null;
        this.maxMult = maxMult;
        this.index = realms.length;
    }
    unlock() {
        this.locked = false;
        this.display();
    }
    complete() {
        this.completed = true;
        this.node?.parentNode?.removeChild(this.node);
        this.node = null;
        routes = routes.filter(r => r.realm !== this.index);
        zones.forEach(z => (z.routes = z.routes.filter(r => r.realm !== this.index)));
        grindRoutes = grindRoutes.filter(r => r.realm !== this.index);
    }
    display() {
        if (!this.node && !this.completed) {
            const challengeTemplate = document.querySelector("#challenge-template");
            if (challengeTemplate === null)
                throw new Error("No challenge template found");
            this.node = challengeTemplate.cloneNode(true);
            this.node.removeAttribute("id");
            this.node.querySelector(".name").innerHTML = this.name;
            this.node.querySelector(".description").innerHTML = this.description + '<div class="extra-description"></div>';
            let realmSelect = document.querySelector("#challenge-select");
            if (realmSelect === null)
                throw new Error("No challenge select found");
            realmSelect.appendChild(this.node);
            this.node.onclick = () => {
                if (settings.grindStats)
                    toggleGrindStats();
                if (settings.grindMana)
                    toggleGrindMana();
                changeRealms(this.index);
            };
        }
    }
}
const challenges = [];
challenges.push(
// Default realm, no special effects. /* Prestige have clones.length remove prestige bonus clones from cost */
new Challenge("Core Realm", "Where you started.  Hopefully, how you'll leave this cave complex."));
//# sourceMappingURL=challenges.js.map