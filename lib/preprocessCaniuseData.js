const semver = require('semver');

function buildVersion(major, minor, patch) {
    if (typeof minor === 'undefined') {
        minor = 0;
    }
    if (typeof patch === 'undefined') {
        patch = 0;
    }
    return [major, minor, patch].join('.');
}

function addZeroesIfMinorOrPatchIsMissing(version) {
    version = String(version);
    version += '.0'.repeat(3 - version.split('.').length);
    return version;
}

module.exports = function preprocessCaniuseData(stats) {
    const isSupportedByCaniuseIdAndVersion = {};
    const checkSupportedRangeByCaniuseId = {};
    Object.keys(stats).forEach(caniuseId => {
        let highestVersionSeen;
        let highestVersionIsSupported;

        function registerHighVersion(version, isSupported) {
            version = addZeroesIfMinorOrPatchIsMissing(version);
            if (!highestVersionSeen || semver.gt(version, highestVersionSeen)) {
                highestVersionSeen = version;
                highestVersionIsSupported = isSupported;
            }
        }

        isSupportedByCaniuseIdAndVersion[caniuseId] = {};
        Object.keys(stats[caniuseId]).forEach(version => {
            const isSupported = /^y/.test(stats[caniuseId][version]);
            if (version === 'all') {
                (checkSupportedRangeByCaniuseId[caniuseId] = checkSupportedRangeByCaniuseId[caniuseId] || []).push(() => isSupported);
            } else if (/^\d+(\.\d+){0,2}$/.test(version)) {
                // Exact major or major.minor or major.minor.patch version
                isSupportedByCaniuseIdAndVersion[caniuseId][version] = isSupported;
                registerHighVersion(version, isSupported);
            } else {
                const matchRange = version.match(/^(\d+(?:\.\d+){0,2})-(\d+(?:\.\d+){0,2})$/);
                if (matchRange) {
                    registerHighVersion(matchRange[2], isSupported);
                    const range = new semver.Range(matchRange[1] + ' - ' + matchRange[2]);
                    (checkSupportedRangeByCaniuseId[caniuseId] = checkSupportedRangeByCaniuseId[caniuseId] || []).push((major, minor, patch) => {
                        if (range.test(buildVersion(major, minor, patch))) {
                            return isSupported;
                        }
                    });
                } else {
                    // Ignore unsupported version specifier such as "TP"
                }
            }
        });
        if (highestVersionSeen) {
            (checkSupportedRangeByCaniuseId[caniuseId] = checkSupportedRangeByCaniuseId[caniuseId] || []).push((major, minor, patch) => {
                if (semver.gt(buildVersion(major, minor, patch), highestVersionSeen)) {
                    return highestVersionIsSupported;
                }
            });
        }
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
