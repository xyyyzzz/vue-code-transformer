/**
 * This replaces every declaration value to 'red'.
 */
import scss from "postcss-scss";

import { defineTransformation } from "vue-code-transformer";

export default defineTransformation({
    ruleName: "change-css-declaration-migration",
    type: "css",
    parser: scss,
    transformAST: ({ source, path }, options) => {
        const plugin = (opts = {}) => {
            return {
                postcssPlugin: "change-css-declaration",
                Declaration (decl) {
                    if (decl.value === "black") {
                        decl.value = "red"
                    }
                }
            };
        };
        plugin.postcss = true;
        return plugin;
    }
})
