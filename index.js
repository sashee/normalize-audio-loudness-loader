const path = require("path");
const os = require("os");
const {promises: fs, constants, createWriteStream} = require("fs");
const {getOptions} = require("loader-utils");
const pjson = require("./package.json");
const findCacheDir = require("find-cache-dir");
const crypto = require("crypto");
const util = require("util");
const child_process = require("child_process");
const normalize = require("ffmpeg-normalize");

const exec = util.promisify(child_process.exec);

const thunk = findCacheDir({name: pjson.name, thunk: true});

const sha = (x) => crypto.createHash("sha256").update(x).digest("hex");

const fileExists = async (file) => {
	try {
		await fs.access(file, constants.F_OK);
		return true;
	}catch(e) {
		return false;
	}
};

const withTempDir = async (fn) => {
	const dir = await fs.mkdtemp(await fs.realpath(os.tmpdir()) + path.sep);
	try {
		return await fn(dir);
	}finally {
		fs.rmdir(dir, {recursive: true});
	}
};

const getVersionHash = (() => {
	let prom = undefined;

	return () => prom = (prom || (async () => {
		const {stdout: versionString} = await exec("ffmpeg -version");

		return sha(sha(versionString) + sha(pjson.version));
	})());
})();

const getCacheDir = (() => {
	const cacheDir = thunk();

	let prom = undefined;
	return () => prom = (prom || (async () => {
		await fs.mkdir(cacheDir, {recursive: true});

		return cacheDir;
	})());
})();

module.exports = function (source) {
	const {targetLoudness, lra, tp} = getOptions(this);
	const callback = this.async();
	(async () => {
		const cacheFile = path.join(await getCacheDir(), sha(await getVersionHash() + sha(source) + sha(this.request)));
		const data = await (async () => {
			if (await fileExists(cacheFile)) {
				return fs.readFile(cacheFile);
			}else {
				const res = await withTempDir(async (dir) => {
					const fileName = path.join(dir, "input");

					await fs.writeFile(fileName, source);

					await normalize({
						input: fileName,
						output: path.join(dir, "normalized.wav"),
						loudness: {
							normalization: "ebuR128",
							target: {
								input_i: targetLoudness,
								input_lra: lra,
								input_tp: tp,
							},
						},
					});
					return fs.readFile(path.join(dir, "normalized.wav"));
				});
				await fs.writeFile(cacheFile, res);
				return res;
			}
		})();

		return data;
	})().then((res) => callback(undefined, res), (err) => callback(err));
};

module.exports.raw = true;
