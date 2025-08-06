import parser from "vue-eslint-parser";
import { getCntFunc } from "./report.js";

function createTransformAST(nodeFilter, fix) {
    function findNodes(ast) {
        const nodesToFix = [];
        parser.AST.traverseNodes(ast, {
            enterNode(node) {
                if (nodeFilter(node)) {
                    nodesToFix.push(node);
                }
            },
            leaveNode(node) {},
        });

        return nodesToFix;
    }

    const transformAST = ({ ast, path, source }, opts) => {
        let fixOperations = [];
        const nodesToFix = findNodes(ast);
        nodesToFix.forEach((node) => {
            const operations = fix({ node, path, source }, opts);
            if (operations.length) {
                fixOperations = fixOperations.concat(operations);
            }
        });
        return fixOperations;
    };

    return transformAST;
}

function astTransformationToVueTransformationModule(ruleName, transformAST) {
    const transform = (file, opts) => {
        const { path, source } = file;
        const ast = parser.parse(source, { sourceType: "module" }).templateBody;
        const fixOperations = transformAST({ ast, path, source }, opts);
        const isUpdated = fixOperations.length > 0;
        if (isUpdated) {
            const cntFunc = getCntFunc(ruleName, global.outputReport);
            cntFunc(file.path);
            return applyOperation(source, fixOperations)
        }
        return file.source;
    };
    transform.type = "vueTemplateTransformation";
    transform.ruleName = ruleName;

    return transform;
}

function applyOperation(sourceCode, tempOperations) {
    const BOM = "\uFEFF";
    const bom = sourceCode.startsWith(BOM) ? BOM : "",
        text = bom ? sourceCode.slice(1) : sourceCode;
    let lastPos = Number.MIN_VALUE,
        output = bom;

    const applyOperations = [];
    const tempOperation = mergeOperations(tempOperations, text);
    if (tempOperation) {
        applyOperations.push(tempOperation);
    }

    for (const operation of applyOperations.sort(compareOperationsByRange)) {
        attemptOperation(operation);
    }

    output += text.slice(Math.max(0, lastPos));

    return output;

    function attemptOperation(operation) {
        const [start, end] = operation.range;

        if (lastPos >= start || start > end) {
            return false;
        }

        if (
            (start < 0 && end >= 0) ||
            (start === 0 && operation.text.startsWith(BOM))
        ) {
            output = "";
        }

        output += text.slice(Math.max(0, lastPos), Math.max(0, start));
        output += operation.text;
        lastPos = end;
        return true;
    }
}

function mergeOperations(operations, sourceCode) {
    if (operations.length === 0) {
        return null;
    } else if (operations.length === 1) {
        return operations[0];
    }
    operations.sort(compareOperationsByRange);

    const originalText = sourceCode;
    const startOperationsRange = operations[0].range[0];
    const endOperationsRange = operations[operations.length - 1].range[1];
    let text = "";
    let lastPosition = Number.MIN_SAFE_INTEGER;

    for (const operation of operations) {
        if (operation.range[0] < lastPosition) {
            continue;
        }

        if (operation.range[0] >= 0) {
            text += originalText.slice(
                Math.max(0, startOperationsRange, lastPosition),
                operation.range[0]
            );
        }
        text += operation.text;
        lastPosition = operation.range[1];
    }
    text += originalText.slice(
        Math.max(0, startOperationsRange, lastPosition),
        endOperationsRange
    );
    return {
        range: [startOperationsRange, endOperationsRange],
        text,
    };
}

function compareOperationsByRange(a, b) {
    const [aStart, aEnd] = a.range;
    const [bStart, bEnd] = b.range;
    return aStart - bStart || aEnd - bEnd;
}

export {
    createTransformAST,
    applyOperation,
};

export default astTransformationToVueTransformationModule;
