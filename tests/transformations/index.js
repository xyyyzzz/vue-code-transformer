import changeCssDeclarationMigration from "./change-css-declaration-migration.js";
import changeJsVariableMigration from "./change-js-variable-migration.js";
import changeVueTagMigration from "./change-vue-tag-migration.js";

const transformationMap = {
    "change-css-declaration-migration": changeCssDeclarationMigration,
    "change-js-variable-migration": changeJsVariableMigration,
    "change-vue-tag-migration": changeVueTagMigration
};

export default transformationMap;