require('dotenv').config()
const axios = require("axios");
const commandLineArgs = require('command-line-args');
const commandLineUsage = require('command-line-usage');
const FormData = require('form-data');

const API_URL = `https://api.bitbucket.org/2.0`;

async function getPackageJson(userOrOrg, repo, branch, auth) {
	const result = await axios.get(`${API_URL}/repositories/${userOrOrg}/${repo}/src/${branch}/package.json`, {}, {auth})
		.catch(tryThrowBetterError);
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
	}, {auth})
		.catch(tryThrowBetterError);
}

async function uploadNewPackageJson(userOrOrg, repo, branch, packageJson, commitMessage, auth) {
	var form = new FormData();
	form.append('branch', branch);
	form.append('package.json', Buffer.from(JSON.stringify(packageJson, null, 2)), "package.json");
	form.append('message', commitMessage);


	return await axios.post(`${API_URL}/repositories/${userOrOrg}/${repo}/src`, form, {
		headers: form.getHeaders(),
		auth
	})
		.catch(tryThrowBetterError);
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
		.catch(tryThrowBetterError);
}

function tryThrowBetterError(error) {
	if (error?.response?.data?.error?.message) {
		throw new Error(`${error.message} - ${error.response.data.error.message}`);	
	}
	throw error;
}

async function main() {
	// TODO: Funtionality to update multiple repos at once
	const argOptions = [
		{ name: 'help', alias: 'h', type: Boolean, description: 'Display this usage guide', required: false },

		// Required args
		{ name: 'package', alias: 'n', type: String, description: 'Name of the package to update (required)', required: true},
		{ name: 'version', alias: 'v', type: String, description: 'Needed version of the package (required)', required: true},
		
		{ name: 'repoName', alias: 'r', type: String, description: 'Name of bitbucket repo to update (required)', required: true},
		{ name: 'repoUserOrOrg', alias: 'o', type: String, description: 'Owner of the repo (user or organization) (required)', required: true},
		{ name: 'repoBranch', alias: 'b', type: String, description: 'Target branch of repo to update (required)', required: true},
		
		{ name: 'username', alias: 'u', type: String, description: 'Auth: user login (required)', required: true},
		{ 
			name: 'password', 
			alias: 'p', 
			type: String, 
			description: 'Auth: application password  (required), more info here: https://bitbucket.org/account/settings/app-passwords/', 
			required: true
		},
		
		// Optional args
		{ name: 'prName', type: String, description: 'Name of the PR', required: false },
		{ name: 'prBranchName', type: String, description: 'Name of PR branch', required: false },
		{ name: 'prCommitMessage', type: String, description: 'Commit message', required: false },
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

	if (!options.prName) {
		options.prName = `Updated ${options.repoName} to ${options.version}`;
	}

	if (!options.prBranchName) {
		const date = new Date();
		options.prBranchName = `pjsonUpdater-${date.toISOString().replaceAll(':','.')}-upd-${options.package}`;
	}

	if (!options.prCommitMessage) {
		options.prCommitMessage = `Updated ${options.repoName} to ${options.version}`;
	}	

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

	await createBranch(options.repoUserOrOrg, options.repoName, options.repoBranch, options.prBranchName, auth);
	await uploadNewPackageJson(options.repoUserOrOrg, options.repoName, options.prBranchName, updatedPackgeJson, options.prCommitMessage, auth);
	await createPR(options.repoUserOrOrg, options.repoName, options.prBranchName, options.repoBranch, options.prName, auth);
}

main()
	.then(() => {
		console.log("Created PR for package.json successfully.");
		process.exit(0);
	})
	.catch(err => {
		console.error(`${err.name}: ${err.message}`);
		process.exit(1);
	});

