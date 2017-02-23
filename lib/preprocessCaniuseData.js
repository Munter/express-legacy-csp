const semver = require('semver');

module.exports = function preprocessCaniuseData(stats) {
    const isSupportedByCaniuseIdAndVersion = {};
    const checkSupportedRangeByCaniuseId = {};
    Object.keys(stats).forEach(caniuseId => {
        isSupportedByCaniuseIdAndVersion[caniuseId] = {};
        Object.keys(stats[caniuseId]).forEach(version => {
            var isSupported = /^y/.test(stats[caniuseId][version]);
            if (version === 'all') {
                (checkSupportedRangeByCaniuseId[caniuseId] = checkSupportedRangeByCaniuseId[caniuseId] || []).push(() => isSupported);
            } else if (/^\d+(\.\d+){0,2}$/.test(version)) {
                // Exact major or major.minor version
                isSupportedByCaniuseIdAndVersion[caniuseId][version] = isSupported;
            } else if (/^\d+(\.\d+){0,2}-\d+(?:\.\d+){0,2}$/.test(version)) {
                const range = new semver.Range(version.replace(/-/g, ' - '));
                (checkSupportedRangeByCaniuseId[caniuseId] = checkSupportedRangeByCaniuseId[caniuseId] || []).push((major, minor, patch) => {
                    if (typeof minor === 'undefined') {
                        minor = 0;
                    }
                    if (typeof patch === 'undefined') {
                        patch = 0;
                    }
                    if (range.test(major + '.' + minor + '.' + patch)) {
                        return isSupported;
                    }
                });
            } else {
                // Ignore unsupported version specifier such as "TP"
            }
        });
    });

    return function checkSupported(caniuseId, major, minor, patch) {
        const isSupportedByVersion = isSupportedByCaniuseIdAndVersion[caniuseId];
        if (isSupportedByVersion) {
            if (typeof patch !== 'undefined') {
                const cspIsSupportedInPatchVersion = isSupportedByCaniuseIdAndVersion[caniuseId][major + '.' + minor + '.' + patch];
                if (typeof cspIsSupportedInPatchVersion === 'boolean') {
                    return cspIsSupportedInPatchVersion;
                }
            }

            const cspIsSupportedInMinorVersion = isSupportedByCaniuseIdAndVersion[caniuseId][major + '.' + minor];
            if (typeof cspIsSupportedInMinorVersion === 'boolean') {
                return cspIsSupportedInMinorVersion;
            }

            const cspIsSupportedInMajorVersion = isSupportedByCaniuseIdAndVersion[caniuseId][major];
            if (typeof cspIsSupportedInMajorVersion === 'boolean') {
                return cspIsSupportedInMajorVersion;
            }
        }
        const ranges = checkSupportedRangeByCaniuseId[caniuseId];
        if (ranges) {
            for (var i = 0 ; i < ranges.length ; i += 1) {
                let isRangeSupported = ranges[i](major, minor, patch);
                if (typeof isRangeSupported === 'boolean') {
                    return isRangeSupported;
                }
            }
        }
    };
};
