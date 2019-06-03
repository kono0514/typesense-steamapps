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
    steamJson = await request(steamOptions);
  } catch (err) {
    console.log(err);
    return;
  }

  // Convert all games to JSONL format for bulk indexing
  let bulkDocuments = '';
  for (let i = 0; i < steamJson.applist.apps.length; i++) {
    const element = steamJson.applist.apps[i];
    bulkDocuments += JSON.stringify({
      'id': element.appid.toString(),
      'appid': element.appid,
      'name': element.name,
      'image': `https://steamcdn-a.akamaihd.net/steam/apps/${element.appid}/header.jpg`,
      'steam_url': `https://store.steampowered.com/app/${element.appid}/`
    });
    bulkDocuments += '\n';
  }

  if (bulkDocuments === '') return;

  const bulkOptions = {
    method: 'POST',
    body: bulkDocuments,
    url: `${PROTOCOL}://${HOST}:${PORT}/collections/games/documents/import`,
    headers: {
      'X-TYPESENSE-API-KEY': API_KEY
    }
  }

  try {
    const bulkResponse = await request(bulkOptions);
    fs.writeFileSync('typesense_import_response.txt', bulkResponse);
  } catch (err) {
    console.log(err);
  }

  const collections = await client.collections().retrieve();
  console.log(collections);

})();