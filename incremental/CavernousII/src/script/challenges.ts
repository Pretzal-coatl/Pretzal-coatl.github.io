class Challenge {
	name: string;
	description: string;
	multPerRock: number;
	locked: boolean = true;
	node: HTMLElement | null;
	index: number = -1;
	mult: number | null = null;
	machineCompletions: number = 0;
	maxMult: number;
	completed: boolean = false;

	constructor(name: string, description: string, multPerRock: number = 0, maxMult: number = Infinity) {
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
			if (challengeTemplate === null) throw new Error("No challenge template found");
			this.node = challengeTemplate.cloneNode(true) as HTMLElement;
			this.node.removeAttribute("id");
			this.node.querySelector(".name")!.innerHTML = this.name;
			this.node.querySelector(".description")!.innerHTML = this.description + '<div class="extra-description"></div>';
			let realmSelect = document.querySelector("#challenge-select");
			if (realmSelect === null) throw new Error("No challenge select found");
			realmSelect.appendChild(this.node);
			this.node.onclick = () => {
				if (settings.grindStats) toggleGrindStats();
				if (settings.grindMana) toggleGrindMana();
				changeRealms(this.index);
			};
		}
	}
}

const challenges: Challenge[] = [];
challenges.push(
	// Default realm, no special effects. /* Prestige have clones.length remove prestige bonus clones from cost */
	new Challenge("Core Realm", "Where you started.  Hopefully, how you'll leave this cave complex.")
);
