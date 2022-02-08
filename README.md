# Bitbucket package.json updater

## Requirements

* Node.js 16
* Bitbucket account and a configured bitbucket application password
You can create a bitbucket application password here: [https://bitbucket.org/account/settings/app-passwords](https://bitbucket.org/account/settings/app-passwords/)
**Important:** Make sure your application password has Repository *read* and *write* permissions and a *write* permission for Pull Requests

## Example

```
node main.js --package moment --version 1.2.3 --repoName redoclytest --repoUserOrOrg andriykaminskyy --repoBranch master -u andriykaminskyy -p YOUR_APP_PASS_HERE
```

## .env usage

Instead of specifying args in command line, you also place a `.env` file near `main.js` file.  Args specified in command line take precedence over `.env`.

**Example:**
```
PACKAGE=moment
VERSION=1.2.3
REPONAME=redoclytest
REPOUSERORORG=andriykaminskyy
REPOBRANCH=master
USERNAME=andriykaminskyy
PASSWORD=YOUR_APP_PASS_HERE
```

## Help

```
Bitbucket package.json updater

  Makes a PR to update package version in package.json in bitbucket. 

Options

  -h, --help                   Display this usage guide                                                      
  -n, --package string         Name of the package to update                                                 
  -v, --version string         Needed version of the package                                                 
  -r, --repoName string        Name of bitbucket repo to update                                              
  -o, --repoUserOrOrg string   Owner of the repo (user or organization)                                      
  -b, --repoBranch string      Target branch of repo to update                                               
  -u, --username string        Auth: user login                                                              
  -p, --password string        Auth: application password, more info here:                                   
                               https://bitbucket.org/account/settings/app-passwords/
```


