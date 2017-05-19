#!/usr/bin/env node

// Update version.json's data or traineddata

let oldVersion = require('./version.json');
let updated = false;

if (process.argv.includes('data')) {
	updated = true;
	oldVersion.data = Date.now().valueOf();
}
if (process.argv.includes('traineddata')) {
	updated = true;
	oldVersion.traineddata = Date.now().valueOf();
}

if (updated) {
	require('fs').writeFile('./version.json', JSON.stringify(oldVersion), err => {
		if (err) return console.error(err);
		console.log('Version updated and written to version.json');
	});
} else {
	console.log('Version not need to updated');
}
