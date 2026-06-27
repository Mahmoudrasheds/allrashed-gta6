const https = require('https');

function makeRequest(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const defaultHeaders = {
      'User-Agent': 'AllRashed-GTA6-App/1.0',
      ...headers
    };

    https.get(url, { headers: defaultHeaders }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ error: 'Parse error' });
        }
      });
    }).on('error', reject);
  });
}

async function fetchRedditPosts() {
  try {
    const url = 'https://www.reddit.com/r/gta6/new.json?limit=15';
    const data = await makeRequest(url);

    if (!data.data || !data.data.children) return [];

    return data.data.children
      .map(post => ({
        type: 'reddit',
        title: post.data.title,
        score: post.data.score,
        author: post.data.author,
        url: `https://reddit.com${post.data.permalink}`,
        created: new Date(post.data.created_utc * 1000).toLocaleDateString(),
        image: post.data.thumbnail && post.data.thumbnail.includes('http') ? post.data.thumbnail : null,
        selftext: post.data.selftext.substring(0, 150)
      }))
      .slice(0, 12);
  } catch (error) {
    console.error('Reddit fetch error:', error);
    return [];
  }
}

exports.handler = async (event, context) => {
  try {
    const redditPosts = await fetchRedditPosts();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        reddit: redditPosts
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};