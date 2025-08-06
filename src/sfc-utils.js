import CompilerDom from "@vue/compiler-dom";
import VueCompilerCorePkg from "@vue/compiler-core";

const { NodeTypes, TextModes } = VueCompilerCorePkg;

function stringify(sfcDescriptor) {
    const { template, script, scriptSetup, styles, customBlocks } = sfcDescriptor;

    const NEWLINE_OFFSET = -2;
    // add newline to custom blocks which does not have newline
    for (const block of customBlocks) {
        if (block.loc.source.slice(NEWLINE_OFFSET) !== '\n') {
            block.loc.source = block.loc.source + '\n';
        }
    }
    return (
        [template, script, scriptSetup, ...styles, ...customBlocks]
            .filter(block => block !== null)
            .sort((a, b) => a.loc.start.offset - b.loc.start.offset)
            .map(block => {
                const openTag = createOpenTag(block);
                const closeTag = createCloseTag(block);
                const startOfOpenTag = block.loc.start.offset - openTag.length;
                const endOfOpenTag = block.loc.start.offset;
                const startOfCloseTag = block.loc.end.offset;
                const endOfCloseTag = block.loc.end.offset + closeTag.length;
                return {
                    ...block,
                    openTag,
                    closeTag,
                    startOfOpenTag,
                    endOfOpenTag,
                    startOfCloseTag,
                    endOfCloseTag
                };
            })
            // generate sfc source
            .reduce((sfcCode, block, index, array) => {
                if (block.openTag === '') {
                    return sfcCode + block.loc.source;
                } else {
                    return sfcCode + block.openTag + block.content + block.closeTag;
                }
            }, '')
    );
}

function createOpenTag(block) {
    if (!block.attrs) {
        return '';
    }
    let source = '<' + block.type;

    source += Object.keys(block.attrs)
        .sort()
        .map(attrName => {
            const value = block.attrs[attrName];

            if (value === true) {
                return attrName;
            } else {
                return `${attrName}="${value}"`;
            }
        })
        .map(attr => ' ' + attr)
        .join('');

    return source + '>';
}

function createCloseTag(block) {
    if (!block.attrs) {
        return '';
    }
    return `</${block.type}>\n`;
}

function parse(source, { filename = 'anonymous.vue', pad = false, compiler = CompilerDom } = {}) {
    const errors = [];
    const ast = getAst(compiler, source, errors);
    const file = {
        source,
        filename
    };
    let descriptor = getDescriptor(ast, file, pad, errors);
    descriptor = cleanIncorrectScriptUsage(descriptor, errors);

    const result = {
        descriptor,
        errors
    };
    return result;
}

function getAst(compiler, source, errors) {
    return compiler.parse(source, {
        // forces all tags (e.g. <div>, <custom_component>) to be treated as native HTML tags, not vue components
        isNativeTag: () => true,
        // preserves all whitespaces
        isPreTag: () => true,
        getTextMode: ({ tag, props }, parent) => {
            // all top level elements except <template> are parsed as raw text containers
            // <template lang="xxx"> where "xxx" is not "html" should be treated as raw text
            if (
                (!parent && tag !== 'template') ||
                (tag === 'template' && props.some(prop => prop.name === 'lang' && prop.value && prop.value.content !== 'html'))
            ) {
                return TextModes.RAWTEXT;
            }
            return TextModes.DATA;
        },
        onError: err => {
            errors.push(err);
        }
    });
}
function getDescriptor(ast, file, pad, errors) {
    const { source, filename } = file;
    const descriptor = {
        source,
        filename,
        customBlocks: [],
        template: null,
        script: null,
        scriptSetup: null,
        styles: []
    };
    ast.children.forEach(node => {
        if (node.type === NodeTypes.ELEMENT) {
            if (!node.children.length && !hasSrc(node) && node.tag !== 'template') {
                return;
            }
            switch (node.tag) {
                case 'template': {
                    if (!descriptor.template) {
                        const templateBlock = (descriptor.template = createBlock(node, source, pad));
                        templateBlock.ast = node;
                    } else {
                        errors.push(createDuplicateBlockError(node));
                    }
                    break;
                }
                case 'style': {
                    const styleBlock = createBlock(node, source, pad);
                    if (styleBlock.attrs.vars) {
                        errors.push(new SyntaxError('<style vars> cannot be used.'));
                    }
                    descriptor.styles.push(styleBlock);
                    break;
                }
                case 'script': {
                    const scriptBlock = createBlock(node, source, pad);
                    const isSetup = !!scriptBlock.attrs.setup;
                    if (!isSetup && !descriptor.script) {
                        descriptor.script = scriptBlock;
                        break;
                    }
                    if (isSetup && !descriptor.scriptSetup) {
                        descriptor.scriptSetup = scriptBlock;
                        break;
                    }
                    errors.push(createDuplicateBlockError(node, isSetup));
                    break;
                }
                default:
                    descriptor.customBlocks.push(createBlock(node, source, pad));
                    break;
            }
        } else if (node.type === NodeTypes.COMMENT) {
            descriptor.customBlocks.push(node);
        }
    });
    return descriptor;
}

function cleanIncorrectScriptUsage(descriptor, errors) {
    if (descriptor.scriptSetup) {
        if (descriptor.scriptSetup.src) {
            errors.push(new SyntaxError('<script setup> cannot use the "src" attribute because its syntax will be ambiguous outside of the component.'));
            descriptor.scriptSetup = null;
        }
        if (descriptor.script && descriptor.script.src) {
            errors.push(
                new SyntaxError('<script> cannot use the "src" attribute when <script setup> is also present because they must be processed together.')
            );
            descriptor.script = null;
        }
    }
    return descriptor;
}

function createDuplicateBlockError(node, isScriptSetup = false) {
    let err;
    if (isScriptSetup === true) {
        err = new SyntaxError('Single file component can contain only one <' + node.tag + ' setup> element');
    } else {
        err = new SyntaxError('Single file component can contain only one <' + node.tag + '> element');
    }
    err.loc = node.loc;
    return err;
}

function createBlock(node, source, pad) {
    const type = node.tag;
    let content = '';
    let { start, end } = node.loc;
    const childrenLength = node.children.length;
    if (childrenLength > 0) {
        start = node.children[0].loc.start;
        end = node.children[childrenLength - 1].loc.end;
        content = source.slice(start.offset, end.offset);
    }
    const loc = {
        source: content,
        start: start,
        end: end
    };
    const attrs = {};
    const block = {
        type: type,
        content: content,
        loc: loc,
        attrs: attrs
    };
    if (pad) {
        block.content = padContent(source, block, pad) + block.content;
    }
    node.props.forEach(prop => {
        if (prop.type === NodeTypes.ATTRIBUTE) {
            attrs[prop.name] = prop.value ? prop.value.content || true : true;
            if (prop.name === 'lang') {
                block.lang = prop.value && prop.value.content;
            } else if (prop.name === 'src') {
                block.src = prop.value && prop.value.content;
            } else if (type === 'script' && prop.name === 'setup') {
                block.setup = attrs.setup;
            } else if (type === 'style') {
                if (prop.name === 'scoped') {
                    block.scoped = true;
                } else if (prop.name === 'module') {
                    block.module = attrs[prop.name];
                }
            }
        }
    });
    return block;
}

function padContent(content, block, pad) {
    const splitRE = /\r?\n/g;
    const replaceRE = /./g;
    content = content.slice(0, block.loc.start.offset);
    if (pad === 'space') {
        content = content.replace(replaceRE, ' ');
    } else {
        const offset = content.split(splitRE).length;
        const padChar = block.type === 'script' && !block.lang ? '//\n' : '\n';
        content = Array(offset).join(padChar);
    }
    return content;
}

function hasSrc(node) {
    return node.props.some(p => {
        if (p.type !== NodeTypes.ATTRIBUTE) {
            return false;
        }
        return p.name === 'src';
    });
}

export {
    stringify,
    parse
};