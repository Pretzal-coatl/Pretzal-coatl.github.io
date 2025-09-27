import { Client } from "archipelago.js";
import readline from "node:readline";


class MultiWorld {
	client: Client;

	constructor() {
		// Using the node readline module, create an interface for intercepting any user input.
		const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });

		this.client = new Client();

		this.client.messages.on("message", content => {
			console.log(content);
		});
		
		// Add an event listener for when a "line" is entered into the standard input (e.g., the console/terminal window).
		rl.on("line", async (line) => {
			// Send the input!
			await this.client.messages.say(line)
		});

	}

	login() {
		this.client
			.login("localhost:38281", "Player2")
			.then(() => console.log("Connected to the Archipelago server!"))
			.catch(console.error);
	}
}

export const multiworld = new MultiWorld();
