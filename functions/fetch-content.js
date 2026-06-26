const https = require('https');

// Helper function to make HTTPS requests
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

// Fetch Reddit posts from r/GTA6
async function fetchRedditPosts() {
  try {
    const url = 'https://www.reddit.com/r/gta6/new.json?limit=10';
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
        subreddit: post.data.subreddit,
        image: post.data.thumbnail && post.data.thumbnail.includes('http') ? post.data.thumbnail : null,
        selftext: post.data.selftext.substring(0, 150)
      }))
      .slice(0, 6);
  } catch (error) {
    console.error('Reddit fetch error:', error);
    return [];
  }
}

// Fetch YouTube videos for GTA 6
async function fetchYouTubeVideos() {
  try {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      console.error('YOUTUBE_API_KEY not set');
      return [];
    }

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=GTA%206&type=video&maxResults=6&order=date&key=${apiKey}`;
    const data = await makeRequest(url);

    if (!data.items) return [];

    return data.items.map(item => ({
      type: 'youtube',
      title: item.snippet.title,
      videoId: item.id.videoId,
      thumbnail: item.snippet.thumbnails.medium.url,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      channel: item.snippet.channelTitle,
      published: new Date(item.snippet.publishedAt).toLocaleDateString(),
      description: item.snippet.description.substring(0, 100)
    }));
  } catch (error) {
    console.error('YouTube fetch error:', error);
    return [];
  }
}

// Main function
exports.handler = async (event, context) => {
  try {
    const [redditPosts, youtubeVideos] = await Promise.all([
      fetchRedditPosts(),
      fetchYouTubeVideos()
    ]);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        reddit: redditPosts,
        youtube: youtubeVideos
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: error.message })
    };
  }
};
