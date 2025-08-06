import jscodeshift from "jscodeshift";
import getParser from "jscodeshift/src/getParser.js";
import { parse as parseSFC, stringify as stringifySFC } from "./sfc-utils.js";
import { getCntFunc } from "./report.js";

function runVueTemplateTransformation(fileInfo, transformation, params) {
    const { path, source } = fileInfo;
    const extension = (/\.([^.]*)$/.exec(path) || [])[0];
    let descriptor;
    if (extension === ".vue") {
        const parsedResult = parseSFC(source, { filename: path });
        if (parsedResult.errors.length) {
            throw parsedResult.errors[0];
        }
        descriptor = parsedResult.descriptor;
    } else {
        // skip non .vue files
        return source;
    }
    // skip .vue files without template block
    if (!descriptor.template) {
        return source;
    }
    const contentStart = descriptor.template.ast.children[0].loc.start.offset;
    const contentEnd =
        descriptor.template.ast.children[
            descriptor.template.ast.children.length - 1
        ].loc.end.offset + 1;
    const astStart = descriptor.template.ast.loc.start.offset;
    const astEnd = descriptor.template.ast.loc.end.offset + 1;
    fileInfo.source = descriptor.template.ast.loc.source;

    let out = transformation(fileInfo, params);

    // output is same as input
    if (out === descriptor.template.content) {
        return source; // skipped, don't bother re-stringifying
    }
    // remove useless template tags e.g. <template>xxxxx</template> => xxxxx
    descriptor.template.content = out.slice(
        contentStart - astStart,
        contentEnd - astEnd
    );
    return stringifySFC(descriptor);
}

function runCssTransformation(fileInfo, transformation, params) {
    const { path, source } = fileInfo;
    const extension = (/\.([^.]*)$/.exec(path) || [])[0];
    let descriptor;
    if (
        extension !== ".vue" &&
        extension !== ".scss" &&
        extension !== ".less" &&
        extension !== ".css"
    ) {
        // only consider css transform on vue, css, scss and less files
        return source;
    }
    if (extension === ".vue") {
        const parsedResult = parseSFC(source, { filename: path });
        if (parsedResult.errors.length) {
            throw parsedResult.errors[0];
        }
        descriptor = parsedResult.descriptor; // skip vue files without styles block
        if (!descriptor.styles) {
            return source;
        }
        fileInfo.source = descriptor.styles;
    }
    const out = transformation(fileInfo, params);
    if (!out) {
        return source;
    }
    const cntFunc = getCntFunc(
        transformation.ruleName,
        global.outputReport
    );

    if (extension === ".vue") {
        let isUpdated = false;
        descriptor.styles.forEach((style, index) => {
            if (style.content !== out[index]) {
                cntFunc(path);
                isUpdated = true;
                style.content = out[index];
            }
        });
        if (isUpdated) {
            return stringifySFC(descriptor);
        } else {
            return source;
        }
    } else {
        if (source !== out) {
            cntFunc(path);
            return out;
        } else {
            return source;
        }
    }
}

function runJsTransformation(fileInfo, transformation, params) {
    const { path, source } = fileInfo;
    const extension = (/\.([^.]*)$/.exec(path) || [])[0];
    let lang = extension.slice(1);
    let descriptor;
    if (![".vue", ".js", ".ts"].includes(extension)) {
        // only consider js transform on vue, js and ts files
        return source;
    }

    if (extension === ".vue") {
        const parsedResult = parseSFC(source, { filename: path });
        if (parsedResult.errors.length) {
            throw parsedResult.errors[0];
        }
        descriptor = parsedResult.descriptor;
        // skip vue files without script block
        if (!descriptor.script && !descriptor.scriptSetup) {
            return source;
        }
        if (descriptor.script && descriptor.scriptSetup) {
            fileInfo.source = [descriptor.script.content, descriptor.scriptSetup.content];
            lang = fileInfo.source[0].lang || fileInfo.source[1].lang || "js";
        } else {
            fileInfo.source = [descriptor.script.content || descriptor.scriptSetup.content]
            lang = fileInfo.source[0].lang || "js";
        }
    }

    let parser = getParser();
    let parserOption = transformation.parser;
    if (typeof parserOption === "undefined") {
        if (lang === "ts") {
            parserOption = lang;
        }
    }
    if (parserOption) {
        parser =
            typeof parserOption === "string"
                ? getParser(parserOption)
                : parserOption;
    }
    const j = jscodeshift.withParser(parser);
    const api = {
        j,
        stats: () => {},
        report: () => {},
    };
    const out = transformation(fileInfo, api, params);

    // no output
    if (!out) {
        return source;
    }
    const cntFunc = getCntFunc(
        transformation.ruleName,
        global.outputReport
    );
    if (extension === ".vue") {
        // output is same as input
        if (descriptor.script && descriptor.scriptSetup) {
            if (descriptor.script.content === out[0] && descriptor.scriptSetup.content === out[1]) {
                return source;
            }
            descriptor.script.content = out[0];
            descriptor.scriptSetup.content = out[1];
        } else if (descriptor.script) {
            if (descriptor.script.content === out[0]) {
                return source;
            }
            descriptor.script.content = out[0];
        } else if (descriptor.scriptSetup) {
            if (descriptor.scriptSetup.content === out[0]) {
                return source;
            }
            descriptor.scriptSetup.content = out[0];
        }
        cntFunc(path);
        return stringifySFC(descriptor);
    } else {
        if (out !== source) {
            cntFunc(path);
            return out;
        } else {
            return source;
        }
    }
}

function runTransformation(fileInfo, transformationModule, options = {}) {
    if (transformationModule.type === "vueTemplateTransformation") {
        return runVueTemplateTransformation(fileInfo, transformationModule, options);
    } else if (transformationModule.type === "cssTransformation") {
        return runCssTransformation(fileInfo, transformationModule, options);
    } else if (transformationModule.type === 'jsTransformation') {
        return runJsTransformation(fileInfo, transformationModule, options);
    }
}

export default runTransformation;
