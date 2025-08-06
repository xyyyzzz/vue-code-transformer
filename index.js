import defineTransformation from "./src/define-transformation.js";
import { createTransformAST as createVueTransformAST } from "./src/wrap-vue-template-transformation.js";
import VueOperationUtils from "./src/vue-operation-utils.js";
import VueCodeTransformer from "./src/core.js";

export {
    defineTransformation,
    createVueTransformAST,
    VueOperationUtils
}
export default VueCodeTransformer;