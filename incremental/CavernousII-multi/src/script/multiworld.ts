import { Client } from "archipelago.js";

class MultiWorld {
	client: Client;

	constructor() {
		this.client = new Client();

		this.client.messages.on("message", content => {
			console.log(content);
		});
	}

	login() {
		this.client
			.login("localhost:38281", "Player2")
			.then(() => console.log("Connected to the Archipelago server!"))
			.catch(console.error);
	}
}

(window as any).multiworld = new MultiWorld();
