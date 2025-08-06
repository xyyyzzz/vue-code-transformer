/**
 * This replaces every tag named "tag1" to "tag2"
 */
import { defineTransformation, createVueTransformAST, VueOperationUtils } from "vue-code-transformer";

export default defineTransformation({
    ruleName: "change-vue-tag-migration",
    type: "vue-template",
    transformAST: createVueTransformAST(
        nodeFilter,
        fix
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
