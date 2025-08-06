import wrapJsTransformation from "./wrap-js-transformation.js";
import wrapCssTransformation from "./wrap-css-transformation.js";
import wrapVueTemplateTransformation from "./wrap-vue-template-transformation.js";

function defineTransformation({ruleName, type, parser, transformAST}) {
    let wrapper;
    if (type === 'js') {
        wrapper = wrapJsTransformation;
    } else if (type === 'css') {
        wrapper = wrapCssTransformation;
    } else if (type === 'vue-template') {
        wrapper = wrapVueTemplateTransformation;
    }
    return wrapper(ruleName, transformAST, parser)
}

export default defineTransformation;