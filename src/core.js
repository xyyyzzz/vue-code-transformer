import fs from "node:fs";
import path from "node:path";
import chalk from "chalk";
import runTransformation from "./run-transformation.js";

global.outputReport = {};
global.processFilePath = [];
global.errors = new Map();

// get all file paths in output directory
function getFilesFromDir(dir) {
    const resolvedPaths = [];
    fs.readdirSync(dir, { recursive: true }).forEach((pathString) => {
        const resolvedPath = path.resolve(dir, pathString);
        if (fs.lstatSync(resolvedPath).isFile()) {
            resolvedPaths.push(resolvedPath);
        }
    });
    return resolvedPaths;
}

function resolvePaths(paths) {
  return paths.flatMap(path => {
    const stat = fs.statSync(path);
    if (stat.isFile()) return [path];
    if (stat.isDirectory()) return getFilesFromDir(path);
    throw new Error(`Unsupported path type: ${path}`);
  });
}

function copyToOutputPath(inputPath, outputPath) {
    const absInputPath = path.resolve(inputPath);
    const absOutputPath = path.resolve(outputPath);
    if (!fs.existsSync(absInputPath)) {
        throw new Error(`Input path ${inputPath} does not exist`);
    }
    fs.cpSync(absInputPath, absOutputPath, { recursive: true });
}

function validateInput(transformationModules, inputPaths, { transformMode, outputPaths, failOnError }) {
    // validate transformationModules
    if (!(typeof transformationModules === "function" ||
        (Array.isArray(transformationModules) && transformationModules.every(fn => typeof fn === "function")))) {
        throw new TypeError(
        "transformationModules must be a function or an array of functions"
        );
    }

    // validate transformMode
    const validTransformModes = ["in-place", "out-place", "dry"];
    if (!validTransformModes.includes(transformMode)) {
        throw new Error(
        `transformMode must be either "in-place", "out-place" or "dry". Received: "${transformMode}"`
        );
    }

    // validate inputPaths
    if (!(typeof inputPaths === "string" ||
        (Array.isArray(inputPaths) && inputPaths.length > 0 && inputPaths.every(p => typeof p === "string")))) {
        throw new TypeError(
        "inputPaths must be a non-empty string or non-empty array of strings"
        );
    }

    // validate output-place transform mode
    if (transformMode === "out-place") {
        // validate outputPaths exists and has correct type
        if (!(typeof outputPaths === "string" ||
            (Array.isArray(outputPaths) && outputPaths.length > 0 && outputPaths.every(p => typeof p === "string")))) {
            throw new TypeError(
                "options.outputPaths must be a non-empty string or non-empty array of strings for out-place transformations"
            );
        }

        // check matching lengths
        const inputPathsLength = Array.isArray(inputPaths) ? inputPaths.length : 1;
        const outputPathsLength = Array.isArray(outputPaths) ? outputPaths.length : 1;

        if (inputPathsLength !== outputPathsLength) {
            throw new Error(
                "inputPaths and options.outputPaths arrays must have the same length. " +
                `Received: inputPaths(${inputPathsLength}), options.outputPaths(${outputPathsLength})`
            );
        }
    }

    if (typeof failOnError !== "boolean") {
        throw new TypeError("options.failOnError must be a boolean");
    }
}

function formatContent(content) {
    const output =
`${chalk.dim("┌───")}
${content.split("\n").map(line => chalk.dim("│ ") + line).join("\n")}
${chalk.dim("└───")}`
    console.log(output);
}

function showTransformationSummary(numFilesProcessed, numFilesUpdated, numFilesFailed) {
    console.log(chalk.bold("┌────────────────────────────────────────┐"));
    console.log(chalk.bold("│         TRANSFORMATION SUMMARY         │"));
    console.log(chalk.bold("└────────────────────────────────────────┘"));
    // Files processed
    console.log(chalk.bold(`\n  Files processed:     ${chalk.cyan(numFilesProcessed)}`));
    // Successful transformations
    console.log(chalk.bold(`  Files updated:       ${chalk.green(numFilesUpdated)}`));
    // Failures
    if (numFilesFailed > 0) {
        console.log(chalk.bold(`  Files failed:        ${chalk.red(numFilesFailed)}`));
        console.log("\n");
        showErrors();
    }
    console.log("\n");
}

function showErrors() {
    if (global.errors.size === 0) {
        return;
    }
    console.log(chalk.bold.red("\u{274C} Transformation failures:"));
    let index = 1;
    for (const [key, value] of global.errors.entries()) {
        console.log(chalk.green(`${index}. ${key}`));
        for (const entry of value) {
            console.log(chalk.red(`  - ${entry.transformRule}: ${entry.err}`));
        }
        console.log("\n");
        index++;
    }
}

function vueCodeTransformer(transformationModules, inputPaths, options) {
    const DEFAULT_OPTIONS = {
        transformMode: "in-place",
        outputPaths: undefined,
        failOnError: false
    }
    let {
        transformMode = DEFAULT_OPTIONS.transformMode,
        outputPaths = DEFAULT_OPTIONS.outputPaths,
        failOnError = DEFAULT_OPTIONS.failOnError,
    } = options;
    validateInput(transformationModules, inputPaths, { transformMode, outputPaths, failOnError });
    // convert single transformationModule to array
    if (typeof transformationModules === "function") {
        transformationModules = [transformationModules]
    }
    // convert single inputPath and outputPath to array
    if (typeof inputPaths === "string") {
        inputPaths = [inputPaths];
    }
    if (typeof outputPaths === "string") {
        outputPaths = [outputPaths];
    }
    if (transformMode === "out-place") {
        for (let i = 0; i < inputPaths.length; i++) {
            copyToOutputPath(inputPaths[i], outputPaths[i]);
        }
    } else {
        outputPaths = inputPaths;
    }
    let resolvedPaths = resolvePaths(outputPaths);
    for (const transformationModule of transformationModules) {
        let transformRule = transformationModule.ruleName;
        console.log(chalk.bold.magenta(`\u{1F3D7}  Running ${transformRule}`));
        const extensions = [
            ".js",
            ".ts",
            ".vue",
            ".jsx",
            ".tsx",
            ".scss",
            ".css",
            ".less",
        ];
        for (const path of resolvedPaths) {
            const retainedSource = fs
                .readFileSync(path)
                .toString()
                .split("\r\n")
                .join("\n");
            const fileInfo = {
                path: path,
                source: retainedSource,
            };
            const extension = (/\.([^.]*)$/.exec(fileInfo.path) || [])[0];
            if (!extensions.includes(extension)) {
                continue;
            }
            try {
                const result = runTransformation(fileInfo, transformationModule, { transformMode, outputPaths, failOnError });
                if (retainedSource !== result) {
                    if (transformMode === "dry") {
                        console.log(`${chalk.green("\u{2714}")} ${chalk.green(fileInfo.path)}:`);
                        formatContent(result);
                    } else {
                        fs.writeFileSync(path, result);
                    }
                    // add path to list of processed file paths
                    if (global.processFilePath.indexOf(path) === -1) {
                        global.processFilePath.push(path);
                    }
                }
            } catch (err) {
                if (failOnError) {
                    throw err;
                }
                if (global.errors.has(path)) {
                    const pathErrors = global.errors.get(path);
                    pathErrors.push({ transformRule, err });
                } else {
                    global.errors.set(path, [{ transformRule, err }]);
                }
            }
        }

        const transformFiles = global.outputReport[transformRule];
        const numFilesTransformed = transformFiles?.length === undefined ? 0 : transformFiles.length;
        console.log(
            chalk.bold.blue(
                `\u{1F3C1} ${transformRule} completed, ${numFilesTransformed} ${numFilesTransformed === 1 ? "file" : "files" } updated.`
            )
        );
        if (transformMode !== "dry") {
            console.log(chalk.bold.blue("\u{1F3C1} Updated file paths:"), transformFiles);
        }
        console.log("\n")
    }
    let numFilesProcessed = resolvedPaths.length;
    let numFilesUpdated = global.processFilePath.length;
    let numFilesFailed = global.errors.size;
    showTransformationSummary(numFilesProcessed, numFilesUpdated, numFilesFailed);
}

export default vueCodeTransformer;