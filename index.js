#!/usr/bin/env node
'use strict';
const program = require('commander');
const path = require('path');
const fs = require('fs');
const inquirer = require('inquirer');
const chalk = require('chalk');

let requestedEnv;

program
  .version('0.1.0')
  .option('-l, --list', 'list available environments')
  .option('-s, --show', 'show current environment')
  .option('-p, --preview', 'preview an environment')
  .arguments('[env]')
  .action(env => {
    requestedEnv = env;
  });

program.parse(process.argv);

let uuHome = process.env.UU_HOME;
if (uuHome === undefined) {
  uuHome = path.join(process.env.HOME, '.uu')
}

const envs = path.join(uuHome, 'config', 'uu-client');
const mainFile = path.join(uuHome, 'config', 'uu-client.properties');

function listEnvs() {
  const envFiles = fs.readdirSync(envs).map(file => {
    return path.basename(file, '.properties');
  })
  return envFiles;
}

function showEnv(envFile) {
  const env = fs.readFileSync(envFile).toString();
  console.log(env);
}

function showCurrentEnv() {
  console.log(chalk.green(`Current environment:\n`));
  showEnv(mainFile);
}

function withEnv(envName, success, err) {
  const sourceFile = path.join(envs, `${envName}.properties`);
  const envExists = fs.existsSync(sourceFile);
  if (envExists) {
    success(sourceFile);
  } else {
    if (err === undefined) {
      console.log(chalk.red(`ERROR: Environment '${env}' does not exist`))
      console.log(chalk.red(`Use \`${process.argv[1]} --list\` to list available environments`))
      process.exit(1)
    } else {
      err(sourceFile);
    }
  }
}

function previewEnv() {
  withEnv(requestedEnv, envFile => {
    console.log(chalk.green(`Environment specified in ${envFile}:\n`));
    showEnv(envFile);
  })
}

function changeEnv(env) {
  withEnv(env, envFile => {
    console.log(chalk.green(`Using a copy of ${envFile}`));
    fs.copyFileSync(envFile, mainFile);
  })
}

if (program.list) {
  const envFiles = listEnvs();
  console.log(chalk.green('Available environments:'));
  console.log(envFiles.join(' '));
} else if (program.show) {
  showCurrentEnv();
} else if (program.preview) {
  previewEnv();
} else if (requestedEnv === undefined) {
  inquirer.prompt([
    {
      type: 'list',
      name: 'action',
      message: 'What do you want to do?',
      choices: [
        'Show current environment',
        'Change environment'
      ]
    }
  ])
  .then(whatToDo => {
    if (whatToDo.action === 'Show current environment') {
      showCurrentEnv();
    } else if (whatToDo.action === 'Change environment') {
      inquirer.prompt({
        type: 'list',
        name: 'env',
        message: 'Which one?',
        choices: listEnvs()
      })
      .then(answer => {
        changeEnv(answer.env);
      });
    } else {
      console.log('Can\'t help you, sorry.');
    }
  });
} else {
  changeEnv(requestedEnv);
}
