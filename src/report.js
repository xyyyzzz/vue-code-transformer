const ENABLE_LOG = false;

function getCntFunc(key, outputObj) {
    if (!outputObj) {
        outputObj = {};
    }
    if (!outputObj[key]) {
        outputObj[key] = [];
    }

    function cntFunc(filePath) {
        if (!outputObj[key].includes(filePath)) {
            outputObj[key].push(filePath);
        }
    }
    return cntFunc;
}

function log(...args) {
    if (ENABLE_LOG) {
        // eslint-disable-next-line no-console
        console.log(...args);
    }
}

export {
    getCntFunc
};
