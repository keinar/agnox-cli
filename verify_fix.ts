
import { playwrightDockerfile, PLAYWRIGHT_ENTRYPOINT, PYTEST_ENTRYPOINT } from "./src/templates.js";

console.log("----- DOCKERFILE -----");
console.log(playwrightDockerfile("1.50.0"));
console.log("----------------------");

console.log("\n----- PLAYWRIGHT ENTRYPOINT -----");
console.log(PLAYWRIGHT_ENTRYPOINT);
console.log("----------------------");

console.log("\n----- PYTEST ENTRYPOINT -----");
console.log(PYTEST_ENTRYPOINT);
console.log("----------------------");
