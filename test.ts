const { searchYahoo } = require('./lib/api/yahoo.ts');

async function test() {
    const res = await searchYahoo('tsla');
    console.log('Search Results:', res);
}
test();
