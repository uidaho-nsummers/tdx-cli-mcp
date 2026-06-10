import { expect } from "vitest";

// Bun's test runner provided `toBeArray()` / `toBeString()` matchers out of the
// box. Vitest does not, so we re-implement them here to keep the existing test
// assertions unchanged.
expect.extend({
	toBeArray(received: unknown) {
		const pass = Array.isArray(received);
		return {
			pass,
			message: () =>
				`expected ${this.utils.printReceived(received)} ${
					pass ? "not " : ""
				}to be an array`,
		};
	},
	toBeString(received: unknown) {
		const pass = typeof received === "string";
		return {
			pass,
			message: () =>
				`expected ${this.utils.printReceived(received)} ${
					pass ? "not " : ""
				}to be a string`,
		};
	},
});

declare module "vitest" {
	// biome-ignore lint/suspicious/noExplicitAny: must match Vitest's `Matchers<R = any>` signature for declaration merging
	interface Matchers<_R = any> {
		toBeArray(): void;
		toBeString(): void;
	}
}
