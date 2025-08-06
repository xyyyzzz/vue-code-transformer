function astTransformationToJSCodeshiftModule(ruleName, transformAST, parser) {
    const transform = (file, api, opts) => {
        const j = api.j;
        const extension = (/\.([^.]*)$/.exec(file.path) || [])[0];
        const results = [];
        if (extension === ".vue") {
            // vue files can have both <script> and <script setup> tags
            file.source.forEach((source) => {
                const ast = j(source);
                transformAST({ ast, j, path: file.path, source }, opts);
                results.push(ast.toSource({ lineTerminator: "\n" }));
            })
            return results;
        } else {
            const ast = j(file.source);
            transformAST({ ast, j, path: file.path, source: file.source }, opts);
            return ast.toSource({ lineTerminator: "\n" });
        }
    };
    transform.type = "jsTransformation";
    transform.ruleName = ruleName;
    transform.parser = parser;
    return transform;
}

export default astTransformationToJSCodeshiftModule;