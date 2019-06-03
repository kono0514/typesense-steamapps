/* eslint-disable no-console */
const request = require('request');
const Typesense = require('typesense');

const client = new Typesense.Client({
  'masterNode': {
    'host': '127.0.0.1',
    'port': '8108',
    'protocol': 'http',
    'apiKey': 'KONO'
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

  const url = 'http://api.steampowered.com/ISteamApps/GetAppList/v0002/?format=json';
  
  request(url, async (error, response, body) => {
    if (!error && response.statusCode === 200) {
      const resJson = JSON.parse(body);
      
      for (let i = 0; i < resJson.applist.apps.length; i++) {
        const element = resJson.applist.apps[i];

        try {
          await client.collections('games').documents().create({
            'id': element.appid.toString(),
            'appid': element.appid,
            'name': element.name,
            'image': `https://steamcdn-a.akamaihd.net/steam/apps/${element.appid}/header.jpg`,
            'steam_url': `https://store.steampowered.com/app/${element.appid}/`
          });
        } catch (err) {
          // 409 = Already exists
          if (!err.message.includes('409')) {
            console.log(err);
          }
        }
      }

      const collections = await client.collections().retrieve();
      console.log(collections);  
    }
  });

})();