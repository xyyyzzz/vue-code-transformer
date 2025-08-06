function getText(node, source) {
    const start = node?.range[0];
    const end = node?.range[1];
    return source.slice(start, end);
}

function replaceText(node, text) {
    return replaceTextRange(node.range, text);
}

function replaceTextRange(range, text) {
    return {
        range,
        text,
    };
}

function remove(node) {
    return removeRange(node.range);
}

function removeRange(range) {
    return {
        range,
        text: "",
    };
}

function insertTextAfter(node, text) {
    return insertTextAfterRange(node.range, text);
}

function insertTextAfterRange(range, text) {
    return insertTextAt(range[1], text);
}

function insertTextBefore(node, text) {
    return insertTextBeforeRange(node.range, text);
}

function insertTextBeforeRange(range, text) {
    return insertTextAt(range[0], text);
}

function insertTextAt(index, text) {
    return {
        range: [index, index],
        text,
    };
}

export default {
    getText,
    replaceText,
    replaceTextRange,
    remove,
    removeRange,
    insertTextAfter,
    insertTextAfterRange,
    insertTextBefore,
    insertTextBeforeRange,
    insertTextAt,
};
