require('dotenv').config()
const axios = require("axios");
const commandLineArgs = require('command-line-args');
const commandLineUsage = require('command-line-usage');

var FormData = require('form-data');

const API_URL = `https://api.bitbucket.org/2.0`;

async function getPackageJson(userOrOrg, repo, branch, auth) {
	const result = await axios.get(`${API_URL}/repositories/${userOrOrg}/${repo}/src/${branch}/package.json`, {}, {auth})
	return result.data;
}

function updatePackageJson(packageJson, packageName, version) {
	// TODO check if version is valid
	if (packageJson.dependencies && packageJson.dependencies[packageName]) {
		packageJson.dependencies[packageName] = version;
		return packageJson;
	}

	// check in dev dependencies
	if (packageJson.devDependencies && packageJson.devDependencies[packageName]) {
		packageJson.devDependencies[packageName] = version;
		return packageJson;
	}

	throw new Error("This repo does not contain the required package");
}

async function createBranch(userOrOrg, repo, sourceBranch, newBranchName, auth) {
	return await axios.post(`${API_URL}/repositories/${userOrOrg}/${repo}/refs/branches`, {
		name: newBranchName,
		target: {
			hash: sourceBranch
		}
	}, {auth});
}

async function uploadNewPackageJson(userOrOrg, repo, branch, packageJson, commitMessage, auth) {
	var form = new FormData();
	form.append('branch', branch);
	form.append('package.json', Buffer.from(JSON.stringify(packageJson, null, 2)), "package.json");
	form.append('message', "test12334");


	return await axios.post(`${API_URL}/repositories/${userOrOrg}/${repo}/src`, form, {
		headers: form.getHeaders(),
		auth
	})
}


async function createPR(userOrOrg, repo, sourceBranch, targetBranch, prName, auth) {
	return await axios.post(`${API_URL}/repositories/${userOrOrg}/${repo}/pullrequests`, {
		"title": prName,
		"source": {
			"branch": {
				"name": sourceBranch
			}
		},
		"destination": {
			"branch": {
				"name": targetBranch
			}
		}
	}, {auth})
}


async function main() {
	// TODO: Update multiple repos at once
	// TODO: Add ability to specify PR message and source branch
	const argOptions = [
		{ name: 'help', alias: 'h', type: Boolean, description: 'Display this usage guide' },
		{ name: 'package', alias: 'n', type: String, description: 'Name of the package to update', required: true},
		{ name: 'version', alias: 'v', type: String, description: 'Needed version of the package', required: true},
		{ name: 'repoName', alias: 'r', type: String, description: 'Name of bitbucket repo to update', required: true},
		{ name: 'repoUserOrOrg', alias: 'o', type: String, description: 'Owner of the repo (user or organization)', required: true},
		{ name: 'repoBranch', alias: 'b', type: String, description: 'Target branch of repo to update', required: true},
		{ name: 'username', alias: 'u', type: String, description: 'Auth: user login', required: true},
		{ name: 'password', alias: 'p', type: String, description: 'Auth: application password, more info here: https://bitbucket.org/account/settings/app-passwords/' , required: true},
	];
	const options = commandLineArgs(argOptions)

	if (options.help) {
		const usage = commandLineUsage([
			{
				header: 'Bitbucket package.json updater',
				content: 'Makes a PR to update package version in package.json in bitbucket.'
			},
			{
				header: 'Options',
				optionList: argOptions
			},
			{
				content: 'Project home: {underline https://github.com/And678/bitbucketPackageJsonUpdater}'
			}
		]);
		console.log(usage)
		process.exit(0);
	}

	// Populate missing options from .env

	argOptions.forEach(opt => {
		if (!options[opt.name]) {
			options[opt.name] = process.env[opt.name.toUpperCase()];
		}

	});

	// Check for missing required options

	argOptions.forEach(opt => {
		if (!options[opt.name] && opt.required) {
			throw new Error(`Missing required parameter: ${opt.name}`);
		}

	});
	

	const auth = {
		username: options.username,
		password: options.password
	};

	const packageJson = await getPackageJson(options.repoUserOrOrg, options.repoName, options.repoBranch, auth);

	const updatedPackgeJson = updatePackageJson(packageJson, options.package, options.version);


	const date = new Date();
	const newBranchName = `pjsonUpdater-${date.toISOString().replaceAll(':','.')}-upd-${options.package}-to-${options.version}`;

	await createBranch(options.repoUserOrOrg, options.repoName, options.repoBranch, newBranchName, auth);
	await uploadNewPackageJson(options.repoUserOrOrg, options.repoName, newBranchName, updatedPackgeJson, `Updated ${options.repoName} to ${options.version}`, auth);

	await createPR(options.repoUserOrOrg, options.repoName, newBranchName, options.repoBranch, `Updated ${options.repoName} to ${options.version}`, auth);
}

main()
	.then(() => {
		console.log("package.json updated successfully.");
		process.exit(0);
	})
	.catch(err => {
		console.error(`Failed to update package.json, error: \n${err.name}:${err.message}`);
		process.exit(1);
	});

