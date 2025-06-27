import { zodToJsonSchema } from "zod-to-json-schema";
import {
	type BuildBooleanQueryPromptArgs,
	BuildBooleanQueryPromptArgsSchema,
} from "../types.js";
import type { Prompt, PromptDefinition, PromptHandler } from "./base.js";

export const buildBooleanQueryPrompt: Prompt = {
	getDefinition(): PromptDefinition {
		return {
			name: "build-boolean-query",
			description:
				"Generate a valid Boolean query string using Boolean operators, quoted terms, proximity, and field selectors",
			arguments: [
				{
					name: "instructions",
					description:
						"What the Boolean query should match, e.g., 'Mentions about NASA in English from the US or Canada'",
					required: true,
				},
			],
		};
	},

	createHandler(): PromptHandler {
		return {
			async handle(args: unknown) {
				const parsedArgs = BuildBooleanQueryPromptArgsSchema.parse(
					args,
				) as BuildBooleanQueryPromptArgs;

				return {
					messages: [
						{
							role: "user",
							content: {
								type: "text",
								text: `You are generating a valid Boolean query string using the following rules:
                  1. Combine clauses using AND, OR, and NOT. Wrap mixed clauses in parentheses.
                  2. A clause can be:
                     - A term: single word (e.g. NASA)
                     - A quoted term: multiple words in quotes (e.g. "Space Station")
                     - A nested query in parentheses: (NASA AND innovation)
                  3. Use "-" or "NOT" to negate clauses. No space after "-".
                  4. Use wildcards: * matches multiple chars, ? matches one char.
                  5. Use quoted terms with ~N (1 ≤ N ≤ 6) to allow proximity: "Mars Rover"~3
                  6. Use NEAR/N operator: "Mars" NEAR/2 "Rover"
                  7. Use selectors to restrict where clauses match:
                     - url:nasa.gov
                     - source_country:(US OR CA)
                     - lang:en
                     - title:"SpaceX"
                     - body:exploration
                     - source:twitter
                     - twitter_followers:1000
                     - -has:source_country
                  8. Punctuation matters in quoted terms. If uncertain, match all forms.
                  9. Restrictions:
                     - Max 1700 characters
                     - No negative-only queries
                     - No negation inside OR
                     - Stop words alone not allowed in OR
                     - Max term length: 128 chars
                  Generate a Boolean query for the following:
                  ${parsedArgs.instructions}
                `,
							},
						},
					],
				};
			},
		};
	},
};
