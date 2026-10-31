# Shoutify
Shoutify is an add-on for Spotify (built in React and TypeScript) that adds a social element to the platform’s web player. Namely, it will add three separate but connected components: song comments, song annotations, and a social tab. Song comments and annotations are intended to augment the user’s existing application experience by adding a social aspect to the core functionality of Spotify (streaming music) and the social tab is intended to be a new experience which will provide social engagement in the form of an information feed, as if common in contemporary social media platforms. 

## Motivation
Modern streaming platforms, such as Apple Music and Spotify, have grown to dominate the music space in recent years and have fundamentally changed the way we listen to our favorite songs. Moreover, streaming platforms have dramatically changed the way music is shared; listeners are no longer beholden to magazine reviews and radio plays in the search for music that might align with their tastes. It is more common now for one to discover new music simply by browsing their already curated social media feeds, or by engaging in discussion on various forums and discussion boards. Our age is consequently experiencing the impacts of viral music: songs which are shared and gain popularity on platforms such as Instagram, Snapchat, and TikTok will have this popularity later reflected in their streaming numbers and their likelihood of being played on the radio. To this end, the relationship between social media and music has evolved such that the social aspect of music is beginning to precede the institutional notion of popularity (Billboard charts, radio plays, etc.)

Despite the radical changes, most modern streaming platforms have failed to capitalize on the social aspect of music. While it is true that features such as Spotify’s Wrapped and Apple Music’s Replay have managed to create new social phenomena out of the experience of streaming music, these innovations have achieved little success in maintaining engagement and keeping users on the platform for longer periods of time. Both Wrapped and Replay, as well as Spotify’s Friend Activity feature rely on users sharing and discussing music on external platforms before returning to Spotify. This creates an unnecessary friction that can limit users’ likelihood to explore music that they encounter through social media or are sent directly through direct message. We propose Shoutify as an opportunity to increase users’ average time spent interacting with streaming platforms by allowing them to create content for each other which is directly related to the music enjoyed by members of their social circles.

Finally, existing social innovations implemented in modern streaming platforms have largely focused on individualized music preference. Recommendation algorithms, omnipresent on these platforms, push users towards certain songs, limiting their discovery of new music. This coupled with the lack of the ability to share music with friends in-app have largely made these streaming platforms individualistic. Allowing people to share their music preferences with their friends in-app would help the growth of independent artists, push lesser-known music into the mainstream, and foster communities built around listening to music.

This is a self-hosted rewrite of the spring 2023 Yale class project
[yale-swe/s23-shoutify](https://github.com/yale-swe/s23-shoutify), meant for
a small group of friends.

## Stack

- **Client:** React 19, React Router 8 and Vite, in `client/`.
- **Server:** Express 5 in `server/`. Node 24 runs the TypeScript directly, so
  there is no build step.
- **Data:** comments and annotations live in one SQLite file through Node's
  built-in `node:sqlite`. No database server or driver is needed.
- **Playback:** the Spotify Web API and the Web Playback SDK.

## Spotify app setup

Create an app at <https://developer.spotify.com/dashboard> and check the "Web API" and
"Web Playback SDK" boxes. It stays in Development Mode, which comes with
limits Spotify set in 2026:

- **5 users per app.** Add each friend's Spotify email under *Settings → User
  Management*. Anyone not on that list gets a 403 after logging in.
- **The app owner needs Spotify Premium**, or the app stops working.
- **Playback needs Premium.** Without it, a user can browse and comment but
  can't play anything.
- Extended Quota Mode, which lifts these limits, is only available to
  registered businesses.

Under *Redirect URIs*, add:

- `https://<your domain>/api/callback` for the hosted app
- `http://127.0.0.1:5173/api/callback` for local development. Spotify allows
  plain http only for loopback IPs, and `localhost` is rejected.

## Run it locally

```sh
cp .env.example .env    # fill in CLIENT_ID and CLIENT_SECRET
npm install
npm run dev:server      # API on :4000
npm run dev:client      # app on http://127.0.0.1:5173, which proxies /api to :4000
```

Open <http://127.0.0.1:5173>. Use that address, not `localhost`, so the
redirect URI matches. `npm run typecheck` and `npm test` check everything.

## Self-host it

```sh
cp .env.example .env    # CLIENT_ID, CLIENT_SECRET, SITE_DOMAIN
docker compose up -d --build
```

The compose file assumes the shared Traefik on the `traefik-public` network,
with a `letsencrypt` resolver and a `websecure` entrypoint. The SQLite file
lives in the `shoutify_data` volume.

To back it up while the app is running:

```sh
docker compose exec web node -e "require('node:sqlite').backup(new (require('node:sqlite').DatabaseSync)('data/shoutify.db'), 'data/backup.db')"
docker compose cp web:/app/data/backup.db ./shoutify-backup.db
```

## Lyrics

Lyrics are switched off. The 2023 version pulled them from Musixmatch.
Spotify's Web API has no lyrics endpoint; the lyrics in Spotify's own apps
come from an internal Musixmatch-backed service that needs a web-player session
cookie and is off-limits under the Developer Terms.

For now, you annotate a lyric by typing the line. [LRCLIB](https://lrclib.net)
(free, no API key) could bring lyrics back later.

## What Spotify took away

Development Mode apps lost these endpoints, and Shoutify no longer uses them:

- browse categories and their playlists, which fed the old Home and Browse
  pages
- related artists, and artist top tracks
- other users' profiles and playlists

Home now shows your top artists and tracks, and only your own profile is
viewable. Playlists list their tracks only when you own or collaborate on
them; other playlists still play.
