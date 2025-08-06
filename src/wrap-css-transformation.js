import postcss from "postcss";
import scss from "postcss-scss";

function astTransformationToPostcssModule(ruleName, transformAST, parser = scss) {
    const processResult = (plugin, content) => {
        return postcss([plugin]).process(content, {
            from: undefined,
            to: undefined,
            parser: parser,
        }).css;
    }

    const transform = (file, options) => {
        const extension = (/\.([^.]*)$/.exec(file.path) || [])[0];
        if (extension === ".vue") {
            const results = [];
            // vue files can have multiple <style> tags
            file.source.forEach((source) => {
                const plugin = transformAST(
                        {
                            source: source.content,
                            path: file.path,
                        },
                        options
                    );
                const result = processResult(plugin, source.content);
                results.push(result);
            });
            return results;
        } else {
            const plugin = transformAST(
                {
                    source: file.source,
                    path: file.path
                },
                options
            );
            const result = processResult(plugin, file.source);
            return result;
        }
    };

    transform.type = "cssTransformation";
    transform.ruleName = ruleName;

    return transform;
}

export default astTransformationToPostcssModule;
