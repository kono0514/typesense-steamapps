/* eslint-disable no-console */
const request = require('request-promise-native');
const Typesense = require('typesense');
const fs = require('fs');

const HOST = '127.0.0.1';
const PORT = '8108';
const PROTOCOL = 'http';
const API_KEY = 'KONO';

const client = new Typesense.Client({
  'masterNode': {
    'host': HOST,
    'port': PORT,
    'protocol': PROTOCOL,
    'apiKey': API_KEY
  },
  'timeoutSeconds': 2
});

const schema = {
  'name': 'games',
  'fields': [
    {
      'name': 'appid',
      'type': 'int32',
      'facet': false
    },
    {
      'name': 'name',
      'type': 'string',
      'facet': false
    },
    {
      'name': 'image',
      'type': 'string',
      'facet': false
    },
    {
      'name': 'steam_url',
      'type': 'string',
      'facet': false
    }
  ],
  'default_sorting_field': 'appid'
};

(async () => {
  
  try {
    console.log('Creating collection...');
    await client.collections().create(schema);
  } catch (err) {
    // 409 = Already exists
    if (!err.message.includes('409')) {
      console.log(err);
      return;
    }
  }

  const steamOptions = {
    url: 'http://api.steampowered.com/ISteamApps/GetAppList/v0002/?format=json',
    json: true
  }

  let steamJson;
  try {
    console.log('Requesting Steam API...');
    steamJson = await request(steamOptions);
  } catch (err) {
    console.log(err);
    return;
  }

  // Convert all games to JSONL format for bulk indexing
  console.log('Preparing bulk documents...');
  let bulkDocuments = [];
  let bulkDocument = '';
  for (let i = 0; i < steamJson.applist.apps.length; i++) {
    if (i > 0 && (i % 10000 === 0 || i === steamJson.applist.apps.length - 1)) {
      bulkDocuments.push(bulkDocument);
      bulkDocument = '';
    }
    const element = steamJson.applist.apps[i];
    bulkDocument += JSON.stringify({
      'id': element.appid.toString(),
      'appid': element.appid,
      'name': element.name,
      'image': `https://steamcdn-a.akamaihd.net/steam/apps/${element.appid}/header.jpg`,
      'steam_url': `https://store.steampowered.com/app/${element.appid}/`
    });
    bulkDocument += '\n';
  }

  if (bulkDocuments.length === 0) return;

  const bulkOptions = {
    method: 'POST',
    body: '',
    url: `${PROTOCOL}://${HOST}:${PORT}/collections/games/documents/import`,
    headers: {
      'X-TYPESENSE-API-KEY': API_KEY
    }
  }

  fs.writeFileSync('typesense_import_response.txt', '');

  for (let i = 0; i < bulkDocuments.length; i++) {
    bulkOptions.body = bulkDocuments[i];
    console.log('Bulk inserting...', i);
    const bulkResponse = await request(bulkOptions);
    console.log('Bulk insert done');
    fs.writeFileSync('typesense_import_response.txt', bulkResponse + '\n', {'flag': 'a'});
  }

  fs.writeFileSync('typesense_import_response.txt', 'Completed at: ' + new Date().toString(), {'flag': 'a'});

  const collections = await client.collections().retrieve();
  console.log(collections);

})();