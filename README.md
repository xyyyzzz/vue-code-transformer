# Vue Code Transformer

> **Note**: Forked from [vue-codemod](https://github.com/vuejs/vue-codemod) with significant enhancements

![Version Badge](https://img.shields.io/badge/version-1.0.0-blue)
![Vue Support](https://img.shields.io/badge/vue-2.x%20%7C%203.x-green)

Automate Vue migrations and refactorings across entire Vue.js projects. Supports transformations for:
- Vue SFCs
- JavaScript/TypeScript files
- CSS/SCSS/SASS/LESS styles

## Features ✨
1. Multi-Language Transformation Support

|File Type	                 |Engine	         |Parser                  |
|----------------------------|-------------------|------------------------|
|Vue SFC Templates           |vue-eslint-parser  |fixed                   |
|Vue SFC Scripts             |jscodeshift	     |auto-detected JS/TS     |
|Vue SFC Styles	             |PostCSS	         |postcss-scss by default |
|JavaScript/TypeScript Files |jscodeshift	     |auto-detected JS/TS     |
|CSS/SCSS/SASS Files	     |PostCSS	         |postcss-scss by default |

> **Note**: For Vue SFC templates, the parser is fixed to vue-eslint-parser and cannot be customized due to the specialized nature of Vue template parsing.

Custom parsers can be configured per transformation
``` javascript
export default defineTransformation({
    ruleName: "custom-parser-demo",
    type: "js",
    parser: "flow", // Use flow parser instead of default
    transformAST: ({ ast }) => {
        // Transformation logic
    }
})
```

2. Flexible Output System

|Mode          |Use Case	                             |
|--------------|-----------------------------------------|
|`'in-place'`  |directly modify source files
|`'out-place'` |output to new file / directory structure |
|`'dry'`       |preview changes without modifying files  |


## Installation
```
npm install vue-code-transformer
```

## CLI Usage
### Basic Command
```
npx vue-code-transformer \
  -t <transformation_path> \
  -m <mode> \
  -i <input_files> \
  -o <output_files>
```

### Options
|Option               |Description                              |Default     |Required                      |
|---------------------|-----------------------------------------|------------|------------------------------|
|--transform-path, -t |path(s) to transformation module         |            |yes                           |
|--mode, -m           |`'in-place'`, `'out-place'` or `'dry'`   |`'in-place'`|no                            |
|--input, -i          |file paths/directories to process        |            |yes                           |
|--output, -o         |corresponds to input                     |            |required for `out-place` mode |
|--fail-on-error, -f  |abort transformation on first error      |`false`     |no                            |

## API Usage
In addition to the CLI, Vue Code Transformer provides JavaScript API for programmatic use.
### Basic API Usage
``` javascript
import VueCodeTransformer from 'vue-code-transformer';
// Import transformation modules
import transformationModule1 from 'transformations/transformation-module-1.js';
import transformationModule2 from 'transformations/transformation-module-2.js';

// Run transformations
VueCodeTransformer(
    [transformationModule1, transformationModule2],
    ["tests/test-fixtures"],  // input paths
    {
        transformMode: "out-place", // "in-place", "out-place", or "dry"
        outputPaths: ["tests/test-fixtures-output"]
    }
);
```
Refer to more details of how to create transformation modules [below](#creating-transformation-modules).

### API Parameters
`VueCodeTransformer(transformationModules, inputPaths, options)`
|Parameter            |Type          |Description                       |Required               |
|---------------------|--------------|----------------------------------|-----------------------|
|transformations      |Array         |transformation modules to apply   |yes                    |
|inputPaths           |Array         |file paths/directories to process |yes                    |
|options              |Object        |configuration options (see below) |no                     |

### Options Object
|Option               |Type          |Description                            |Default       |Required                     |
|---------------------|--------------|---------------------------------------|------------- |-----------------------------|
|transformMode        |Array         |`'in-place'`, `'out-place'` or `'dry'` |`'in-place'`  |no                           |
|outputPaths          |Array         |corresponds to inputPaths              |-             |required for `out-place` mode|
|failOnError          |Boolean       |abort transformation on first error    |`false`       |no                           |

## Creating Transformation Modules
### JavaScript/TypeScript Transformation (Rename variables)
``` javascript
/**
 * This replaces every variable named "foo" to "bar"
 * e.g. "const foo = 1" -> "const bar = 1"
 */
import { defineTransformation } from "vue-code-transformer";

export default defineTransformation({
    ruleName: "change-js-variable-migration",
    type: "js",
    parser: "js",
    transformAST: ({ ast, j, path, source }, options) => {
        ast
            .findVariableDeclarators("foo")
            .renameTo("bar")
        return ast;
    }
})
```
📚 [JSCodeshift documentation](https://jscodeshift.com/)

### CSS/SCSS Transformation (Update declaration values)
``` javascript
/**
 * This replaces every declaration value to 'red'.
 * e.g. "color: black" -> "color: red"
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
```
[PostCSS documentation](https://postcss.org/docs/)

### Vue Template Transformation (Rename tags)
``` javascript
/**
 * This replaces every tag named "tag1" to "tag2"
 * e.g. "<tag1>xxxxx</tag1>" -> "<tag2>xxxxx</tag2>"
 */
import { defineTransformation, createVueTransformAST, VueOperationUtils } from "vue-code-transformer";

export default defineTransformation({
    ruleName: "change-vue-tag-migration",
    type: "vue-template",
    transformAST: createVueTransformAST( // helper function is used to create transformAST here
        nodeFilter, // this filters out nodes of interest
        fix // this applies fix on the nodes of interest
    )
})

const changeTagConfig = {
    "tag1": "tag2",
};

function nodeFilter(node) {
    return node.type === "VElement" && changeTagConfig[node.name];
}

function fix({ node, path, source }, options) {
    const fixOperations = [];
    changeTagName(fixOperations, node, changeTagConfig[node.name]);
    return fixOperations;
}

// <tag1>: "tag1" starts from first character of "<tag1>"
const START_TAG_NAME_OFFSET = 1;
// </tag1>："tag1" starts from second character of "</tag1>"
const END_TAG_NAME_OFFSET = 2;
function changeTagName(fixOperations, node, newTagName) {
    const oldTagName = node.name;
    const startTagNameRange = [
        node.startTag.range[0] + START_TAG_NAME_OFFSET,
        node.startTag.range[0] + START_TAG_NAME_OFFSET + oldTagName.length,
    ];
    const endTagNameRange = [
        node.endTag.range[0] + END_TAG_NAME_OFFSET,
        node.endTag.range[0] + END_TAG_NAME_OFFSET + oldTagName.length,
    ];
    fixOperations.push(
        VueOperationUtils.replaceTextRange(startTagNameRange, newTagName)
    );
    fixOperations.push(
        VueOperationUtils.replaceTextRange(endTagNameRange, newTagName)
    );
}
```
Refer to more details of vue template operation utilities [below](#vue-template-operation-utils).

## Vue Template Operation Utils

These utilities provide text manipulation for Vue template AST nodes.

### Core Concepts
- Ranges: Array `[start, end]` representing character positions in source code
- Operations: Objects `{ range: [number, number], text: string }` describing changes
- Execution order of operations: Applied sequentially from top to bottom in source code

### API Reference
`getText(node, source)` \
Obtain node in text form
``` javascript
const buttonText = VueOperationUtils.getText(buttonNode, source)
// <button>Click</button> → '<button>Click</button>'
```

`replaceText(node, text)` \
Replaces a node's entire content
``` javascript
VueOperationUtils.replaceText(node, '<div>Updated content</div>')
// Before: <div>Old content</div>
// After: <div>Updated content</div>
```

`replaceTextRange(range, text)` \
Replaces specific range
``` javascript
VueOperationUtils.replaceTextRange([5, 8], 'Updated')
// Before: <div>Old content</div>
// After: <div>Updated content</div>
```

`remove(node)` \
Removes a node entirely
``` javascript
VueOperationUtils.remove(deprecatedNode)
```

`removeRange(range)` \
Removes text within specific range
``` javascript
VueOperationUtils.removeRange([6, 11])
// Before: <div>Hello World</div>
// After: <div>Hello</div>
```

`insertTextAfter(node, text)` \
Inserts text after a node
``` javascript
VueOperationUtils.insertTextAfter(existingNode, '<div>New content</div>')
// Before: <div>Existing content</div>
// After: <div>Existing content</div><div>New content</div>
```
`insertTextAfterRange(range, text)` \
Insert text after a specific range

`insertTextBefore(node, text)` \
Inserts text before a node
``` javascript
VueOperationUtils.insertTextBefore(existingNode, '<div>New content</div>')
// Before: <div>Existing content</div>
// After: <div>New content</div><div>Existing content</div>
```

`insertTextBeforeRange(range, text)` \
Insert text before a specific range

`insertTextAt(position, text)` \
Inserts text at exact position
``` javascript
VueOperationUtils.insertTextAt(0, '<!--- Header -->\n')
// Adds comment at file start
```