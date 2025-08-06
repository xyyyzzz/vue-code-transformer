/**
 * This replaces every variable named "foo" to "bar"
 */
import { defineTransformation } from "vue-code-transformer";

export default defineTransformation({
    ruleName: "change-js-variable-migration",
    type: "js",
    transformAST: ({ ast, j, path, source }, options) => {
        ast
            .findVariableDeclarators("foo")
            .renameTo("bar")
        return ast;
    }
})