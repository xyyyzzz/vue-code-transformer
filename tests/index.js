import VueCodeTransformer from 'vue-code-transformer';
import transformationMap from './transformations/index.js';

function run() {
    const args = process.argv.slice(2);
    let transformType, transformMode, outputPaths;
    if (args.length === 3) {
        [transformType, transformMode, outputPaths] = args;
    } else if (args.length === 2) {
        [transformType, transformMode] = args;
    }
    console.log(args)
    const transformationNames = [
        ... (transformType === "css" || transformType === "all") ? ["change-css-declaration-migration"] : [],
        ... (transformType === "js" || transformType === "all") ? ["change-js-variable-migration"] : [],
        ... (transformType === "vue" || transformType === "all") ? ["change-vue-tag-migration"] : []
    ]
    const transformationModules = transformationNames.map(key => transformationMap[key]);
    // Run transformations
    VueCodeTransformer(
        transformationModules,
        ["tests/test-fixtures"],  // input paths
        {
            transformMode, // "in-place", "out-place", or "dry"
            outputPaths: outputPaths
        }
    );
}

run();

// // Obtain array of transformation modules
// const transformations = [
//     "change-css-declaration-migration",
//     "change-js-variable-migration",
//     "change-vue-tag-migration"
//   ].map(key => transformationMap[key]);

// // Run transformations
// VueCodeTransformer(
//     transformations,
//     ["tests/test-fixtures"],  // input paths
//     {
//         transformMode: "dry"  // "in-place", "out-place", or "dry"
//     }
// );