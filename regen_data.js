#!/usr/bin/env node

// Re-generate data.json

const cheerio = require('cheerio');
const request = require('request');
const pinyin = require('pinyin');
const rp = require('request-promise-native');

let data = {
    version: 0,         // Downwards compativity
    shishens: [],
    dungeons: []
};
let shishenIds = [];    // Avoid duplication

function trimToShishenName(s) {
    if (s === '-') {
        return s;
    } else if (s.startsWith('首领：')) {
        return s.split('：')[1];
    } else if (s.includes('×')) {    // x in Math
        return s.split('×')[0];
    } else if (s.includes('x')) {    // x in alphabet
        return s.split('x')[0];
    } else {
        let result = s;
        ([0, 1, 2, 3, 4, 5, 6, 7, 8]).forEach(n => {
            if (s.endsWith('' + n)) {
                result = s.substr(0, s.length - 1);
            }
        });
        return result;
    }
}

function getRounds(names, counts) {
    if (names[0] === '-') return null;
    let enemies = {};
    names.forEach((name, index) => {
        if (name !== '-') {
            let id = toPinyin(name);
            if (enemies[id] && enemies[id] > 0) {
                enemies[id] += counts[index];
            } else {
                enemies[id] = counts[index];
            }
        }
    });
    return {
        enemies: enemies
    };
}

function toPinyin(cn) {
    return pinyin(cn, {
        style: pinyin.STYLE_NORMAL
    }).map(array => {
        return array[0];
    }).join('');
}

function addShishens(names) {
    names.forEach(name => {
        if (name === '-') return;
        if (!shishenIds.includes(toPinyin(name))) {
            shishenIds.push(toPinyin(name));
            data.shishens.push({
                id: toPinyin(name),
                name: name,
                // We will add all queries finally
                queries: [],
                clues: []
            });
        }
    });
}

function splitClues(cluesRaw) {
    return cluesRaw.split(/[ \/]/);
}

function mapToT9(charArray) {
    return charArray.map(ch => {
        if (ch == 'a' || ch == 'b' || ch == 'c') return 2;
        if (ch == 'd' || ch == 'e' || ch == 'f') return 3;
        if (ch == 'g' || ch == 'h' || ch == 'i') return 4;
        if (ch == 'j' || ch == 'k' || ch == 'l') return 5;
        if (ch == 'm' || ch == 'n' || ch == 'o') return 6;
        if (ch == 'p' || ch == 'q' || ch == 'r' || ch == 's') return 7;
        if (ch == 't' || ch == 'u' || ch == 'v') return 8;
        if (ch == 'w' || ch == 'x' || ch == 'y' || ch == 'z') return 9;
        throw new Error(ch + ' is not a letter');
    }).map(n => {
        return '' + n;
    }).join('');
}

function getQueries(cn) {
    let normal = toPinyin(cn);
    let firstLetter = pinyin(cn, {
        style: pinyin.STYLE_FIRST_LETTER
    }).map(array => {
        return array[0];
    }).join('');
    return [mapToT9(normal.split('')), mapToT9(firstLetter.split(''))];
}

rp({
    uri: 'http://www.16163.com/zt/yys/gwcx/',
    transform: body => {
        return cheerio.load(body);
    }
}).then($ => {
    let tables = $('body div.body-content div.content div.table');
    // Explorations
    $(tables[0]).find('div.table-row-group').toArray().filter(v => {
        return $(v).find('div.chapter-header div.table-cell').first().text().startsWith('第');
    }).forEach(v => {
        let chapter = $(v).find('div.chapter-header div.table-cell').first().text().split(' ')[0];
        $(v).find('div.table-row').not('div.chapter-header').not('div.chapter-title').toArray().forEach(row => {
            let cols = $(row).find('div.table-cell').toArray().map(col => {
                return $(col).text();
            });
            let dungeonName = chapter + ' ' + cols[0];
            let colsShishenName = cols.map(trimToShishenName);
            let colsShishenCount = cols.map((col, index) => {
                if (index == 0) return 1;
                if (col === '-') return 0;
                return parseInt(col.substr(col.length - 1, 1));
            });
            // Firstly, add newly iterated shishens
            addShishens(colsShishenName);
            // Then, add this dungeon
            let round1 = getRounds(colsShishenName.slice(1, 4), colsShishenCount.slice(1, 4));
            let round2 = getRounds(colsShishenName.slice(4, 7), colsShishenCount.slice(4, 7));
            data.dungeons.push({
                name: dungeonName,
                sushi: 3,
                rounds: round2 ? [round1, round2] : [round1],
                // Downwards compativity
                money: 0,
                exp: 0
            });
        });
    });

    // Secret News
    $(tables[0]).find('div.table-row-group').toArray().filter(v => {
        return !($(v).find('div.chapter-header div.table-cell').first().text().startsWith('第'));
    }).forEach(v => {
        let chapter = $(v).find('div.chapter-header div.table-cell').first().text().split(' ')[0];
        let rows = $(v).find('div.table-row').not('div.chapter-header').not('div.chapter-title').toArray();
        for (let i = 0; i < 10; ++i) {
            let row1 = $(rows[i]).find('div.table-cell').toArray().map(col => {
                return $(col).text();
            }).filter((col, index) => {
                return index !== 0 && col !== '-';
            });
            let row2 = $(rows[i + 1]).find('div.table-cell').toArray().map(col => {
                return $(col).text();
            }).filter((col, index) => {
                return index !== 0 && col !== '-';
            });
            let row3 = $(rows[i + 2]).find('div.table-cell').toArray().map(col => {
                return $(col).text();
            }).filter((col, index) => {
                return index !== 0 && col !== '-';
            });
            let cols = row1.concat(row2).concat(row3);
            // Merge 3 rows into 1 dungeon
            let dungeonName = chapter + ' ' + $(rows[i]).find('div.table-cell').first().text().split('1')[0];
            let colsShishenName = cols.map(trimToShishenName);
            let colsShishenCount = cols.map(col => {
                if (col.endsWith(')')) return parseInt(col.split('×')[1].substr(0, 1));
                return parseInt(col.substr(col.length - 1, 1));
            });
            // Firstly, add newly iterated shishens
            addShishens(colsShishenName);
            // Then, add this dungeon
            data.dungeons.push({
                name: dungeonName,
                sushi: 3,
                rounds: [getRounds(colsShishenName, colsShishenCount)],
                // Downwards compativity
                money: 0,
                exp: 0
            });
        }
    });

    // Yuhun and Monster Air Lock
    ([1, 2]).forEach(ti => {
        let chapter = $(tables[ti]).find('div.table-caption').first().text();
        $(tables[ti]).find('div.table-row-group div.table-row').not('div.chapter-header').toArray().forEach(v => {
            let cols = $(v).find('div.table-cell').toArray().map(col => {
                return $(col).text();
            }).filter((col, index) => {
                return index !== 0 && col !== '-';
            });
            let dungeonName = chapter + ' ' + $(v).find('div.table-cell').first().text();
            let colsShishenName = cols.map(trimToShishenName);
            let colsShishenCount = cols.map(col => {
                return parseInt(col.substr(col.length - 1, 1));
            });
            // Firstly, add newly iterated shishens
            addShishens(colsShishenName);
            // Then, add this dungeon
            data.dungeons.push({
                name: dungeonName,
                sushi: 4,
                rounds: [getRounds(colsShishenName, colsShishenCount)],
                // Downwards compativity
                money: 0,
                exp: 0
            });
        });
    });

    // Get clues
    $(tables[3]).find('div.table-row-group div.table-row').not('div.chapter-header').toArray().forEach(v => {
        let cluesRaw = $(v).find('div.table-cell').first().text();
        let shishenName = $($(v).find('div.table-cell').toArray()[1]).text();
        data.shishens.forEach(shishen => {
            if (shishen.id === toPinyin(shishenName)) {
                shishen.clues = shishen.clues.concat(splitClues(cluesRaw));
            }
        });
    });

    // Finally get queries
    data.shishens.forEach(shishen => {
        shishen.queries = shishen.queries.concat(getQueries(shishen.name));
        shishen.clues.forEach(clue => {
            shishen.queries = shishen.queries.concat(getQueries(clue));
        });
    });

    // Downward compativity
    data.version = Date.now().valueOf();

    // We are done!
    require('fs').writeFile('./data.json', JSON.stringify(data, null, '\t'), err => {
        if (err) return console.error(err);
        console.log('Data updated and written to data.json');
    });
});
