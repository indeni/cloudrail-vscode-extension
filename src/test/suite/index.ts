'use strict';

import * as path from 'path';
import Mocha from 'mocha';
// @ts-ignore
import NYC from 'nyc';
import * as glob from 'glob';
import { fork } from 'child_process';

// Simulates the recommended config option
// extends: "@istanbuljs/nyc-config-typescript",
// @ts-ignore
import * as baseConfig from "@istanbuljs/nyc-config-typescript";

// Recommended modules, loading them here to speed up NYC init
// and minimize risk of race condition
import 'ts-node/register';
import 'source-map-support/register';
import { exit } from 'process';


// Linux: prevent a weird NPE when mocha on Linux requires the window size from the TTY
// Since we are not running in a tty environment, we just implementt he method statically
const tty = require('tty');
if (!tty.getWindowSize) {
    tty.getWindowSize = (): number[] => {
        return [80, 75];
    };
}

const nyc = new NYC({
    ...baseConfig,
    cwd: path.join(__dirname, '..', '..', '..'),
    reporter: ['text-summary', 'html', 'text'],
    all: true,
    silent: false,
    instrument: true,
    hookRequire: true,
    hookRunInContext: true,
    hookRunInThisContext: true,
    include: [ "out/**/*.js" ],
    exclude: [ "out/test/*" ]
  });

export async function run(): Promise<void> {
	const testsRoot = path.resolve(__dirname, '..');

  // Setup coverage pre-test, including post-test hook to report

  await nyc.wrap();

  // Check the modules already loaded and warn in case of race condition
  // (ideally, at this point the require cache should only contain one file - this module)
  const myFilesRegex = /vscode-recall\/out/;
  const filterFn = myFilesRegex.test.bind(myFilesRegex);
  if (Object.keys(require.cache).filter(filterFn).length > 1) {
    console.warn('NYC initialized after modules were loaded', Object.keys(require.cache).filter(filterFn));
  }

  // Debug which files will be included/excluded
  // console.log('Glob verification', await nyc.exclude.glob(nyc.cwd));

  await nyc.createTempDirectory();
	// Create the mocha test
	const mocha = new Mocha({
		ui: 'bdd',
		timeout: 10 * 1000,
		color: true
	});
  
  // Add all files to the test suite
  const files = glob.sync('**/*.test.js', { cwd: testsRoot });
  files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));
  
  const failures: number = await new Promise(resolve => mocha.run(resolve));
  
  // Capture text-summary reporter's output and log it in console
  console.log(await captureStdout(nyc.report.bind(nyc)));

  if (failures > 0) {
    throw new Error(`${failures} tests failed.`);
  }

  await nyc.writeCoverageFile();

//   const child = fork(__dirname);
//   let cov = false;
//   let exitCode = 0;
//   let threshold = 0;
// 	if (process.env.threshold) {
// 		threshold = Number(process.env.threshold)
// 	}

//   child.on('message', async (m) => {
// 	  console.log('im here')
// 	await nyc.checkCoverage(threshold);
// 	child.emit('close');
//   });
//   child.on('close', (e) => {
// 	exitCode = e || 0;
// 	cov = true;
// 	console.log('closed ' + e)
// 	console.log('closed2 ' + process.exitCode)
//   })
//   child.send('start')
//   while (!cov) {
// 	await new Promise((resolve2) => setTimeout(resolve2, 500));
//   }
  
  //exit(exitCode)
}

async function captureStdout(fn: any) {
  let w = process.stdout.write, buffer = '';
  process.stdout.write = (s) => { buffer = buffer + s; return true; };
  await fn();
  process.stdout.write = w;
  return buffer;
}

process.on('message', async (m) => {
	console.log('im here')
  await nyc.checkCoverage(0);
   exit(process.exitCode)
});

// import path from 'path';
// import Mocha from 'mocha';
// import glob from 'glob';

// export function run(): Promise<void> {
// 	// Create the mocha test
// 	const mocha = new Mocha({
// 		ui: 'tdd',
// 		color: true
// 	});

// 	const testsRoot = path.resolve(__dirname, '..');

// 	return new Promise((c, e) => {
// 		glob('**/**.test.js', { cwd: testsRoot }, (err: any, files: any[]) => {
// 			if (err) {
// 				return e(err);
// 			}

// 			// Add files to the test suite
// 			files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

// 			try {
// 				// Run the mocha test
// 				mocha.run(failures => {
// 					if (failures > 0) {
// 						e(new Error(`${failures} tests failed.`));
// 					} else {
// 						c();
// 					}
// 				});
// 			} catch (err) {
// 				console.error(err);
// 				e(err);
// 			}
// 		});
// 	});
// }
