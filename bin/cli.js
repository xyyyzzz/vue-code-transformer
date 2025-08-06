/* eslint no-console: 0 */
import path from "node:path";
import chalk from "chalk";
import { program } from "commander";
import vueCodeTransformer from "../src/core.js";

async function bootstrap() {
    program
        .option(
            "-t, --transform-path <transformPath...>",
            "path(s) to transformation module"
        )
        .option(
            "-m, --mode <mode>",
            "transformation mode (in-place, out-place or dry), default: in-place"
        )
        .option(
            "-i, --input-path <inputPath...>",
            "input path(s) of files and/or directories to transformation"
        )
        .option(
            "-o, --output-path <outputPath...>",
            "output path(s) of files and/or directories after transformation"
        )
        .option(
            "-f, --fail-on-error",
            "stop program upon failure"
        )
        .option("-c, --config-path <configPath>", "配置文件路径")
        .action(async function () {
            const options = this.opts();
            console.log('options', options)
            const transformationModules = await Promise.all(
                options.transformPath.map(async (p) => {
                    try {
                        const absolutePath = path.resolve(p);
                        const module = await import(absolutePath);
                        return module.default;
                    } catch (error) {
                        console.error(`Failed to load module: ${p}`, error);
                        throw error; // Rethrow to fail the whole process
                    }
                })
            );
            vueCodeTransformer(transformationModules, options.inputPath, { transformMode: options.mode, outputPaths: options.outputPath, failOnError: options.failOnError })
        });
    program.configureOutput({
        writeErr: (str) => process.stdout.write(str),
        outputError: (str, write) => write(chalk.red(str)),
    });
    program.parse(process.argv);
}

export { bootstrap };
