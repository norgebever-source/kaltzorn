#!/usr/bin/env python3
"""Aktualisiert die Songliste der Startseite (index.html): neueste Spotify-Veröffentlichung zuerst.

- Liest die vorhandenen Songs aus <script id="songs-data">.
- Holt für jeden Song Veröffentlichungsdatum, 30-s-Vorschau und Cover von der öffentlichen Spotify-Embed-Seite.
- Findet neue Veröffentlichungen über die öffentliche Künstler-Embed-Seite (Top-Tracks) und
  optional (wenn SPOTIFY_CLIENT_ID und SPOTIFY_CLIENT_SECRET gesetzt sind): neue Veröffentlichungen
  über die offizielle Spotify Web API (komplette Diskografie); nur Songs neuer als der bisher neueste.
- Sortiert nach Datum (neueste zuerst) und schreibt Plattenregal, Startwerte und Anzahl neu.
"""
import base64, html, json, os, re, sys, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(ROOT, "index.html")
COVERS = os.path.join(ROOT, "img", "spotify")
ARTIST_ID = "5I8HXdkHOmlB63OKyJF5gK"
UA = {"User-Agent": "Mozilla/5.0 (kaltzorn.de song updater)"}


def get(url, headers=None, data=None):
    req = urllib.request.Request(url, headers={**UA, **(headers or {})}, data=data)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def embed_info(tid):
    s = get(f"https://open.spotify.com/embed/track/{tid}").decode("utf8")
    m = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', s, re.S)
    e = json.loads(m.group(1))["props"]["pageProps"]["state"]["data"]["entity"]
    imgs = sorted((e.get("visualIdentity") or {}).get("image") or [], key=lambda i: i.get("maxWidth") or 0)
    cover = next((i["url"] for i in imgs if (i.get("maxWidth") or 0) >= 300), imgs[-1]["url"] if imgs else None)
    return {
        "name": e.get("name") or e.get("title"),
        "date": ((e.get("releaseDate") or {}).get("isoString") or "")[:10],
        "preview": ((e.get("audioPreview") or {}).get("url")),
        "cover": cover,
    }


def embed_artist_tracks():
    """Öffentliche Künstler-Embed-Seite (Top-Tracks, ohne Zugangsdaten)."""
    s = get(f"https://open.spotify.com/embed/artist/{ARTIST_ID}").decode("utf8")
    m = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', s, re.S)
    e = json.loads(m.group(1))["props"]["pageProps"]["state"]["data"]["entity"]
    out = []
    for t in e.get("trackList") or []:
        tid = (t.get("uri") or "").split(":")[-1]
        if tid:
            inf = embed_info(tid)
            out.append({"id": tid, "title": inf["name"] or t.get("title"), "date": inf["date"]})
    return out


def api_new_tracks():
    cid, sec = os.environ.get("SPOTIFY_CLIENT_ID"), os.environ.get("SPOTIFY_CLIENT_SECRET")
    if not (cid and sec):
        return []
    tok = json.loads(get("https://accounts.spotify.com/api/token",
                         {"Authorization": "Basic " + base64.b64encode(f"{cid}:{sec}".encode()).decode(),
                          "Content-Type": "application/x-www-form-urlencoded"},
                         b"grant_type=client_credentials"))["access_token"]
    h = {"Authorization": "Bearer " + tok}
    out, url = [], f"https://api.spotify.com/v1/artists/{ARTIST_ID}/albums?include_groups=album,single&market=DE&limit=50"
    while url:
        d = json.loads(get(url, h))
        for al in d["items"]:
            t = json.loads(get(f"https://api.spotify.com/v1/albums/{al['id']}/tracks?market=DE&limit=50", h))
            for tr in t["items"]:
                if any(a["id"] == ARTIST_ID for a in tr["artists"]):
                    out.append({"id": tr["id"], "title": tr["name"], "date": al["release_date"]})
        url = d.get("next")
    return out


def main():
    s = open(INDEX, encoding="utf8").read()
    m = re.search(r'(<script type="application/json" id="songs-data">)(.*?)(</script>)', s, re.S)
    songs = json.loads(m.group(2))
    for i, so in enumerate(songs):
        so["_id"] = re.search(r"track/(\w+)", so["spotify"]).group(1)
        so["_order"] = i
    def refresh(so):
        try:
            inf = embed_info(so["_id"])
        except Exception as ex:
            print("Embed-Fehler", so["title"], ex, file=sys.stderr)
            return
        if inf["date"]:
            so["date"] = inf["date"]
        if inf["preview"]:
            so["preview"] = inf["preview"]
        if so.get("_new") and inf["name"]:
            so["title"] = inf["name"]
        path = os.path.join(ROOT, so["img"])
        if inf["cover"] and not os.path.exists(path):
            os.makedirs(COVERS, exist_ok=True)
            open(path, "wb").write(get(inf["cover"]))

    for so in songs:
        refresh(so)
    known = {so["_id"] for so in songs}
    newest_known = max((so.get("date") or "" for so in songs), default="")

    # neue Veröffentlichungen: nur Songs, die neuer sind als der bisher neueste
    for source in (embed_artist_tracks, api_new_tracks):
        try:
            found = source()
        except Exception as ex:  # Quelle nicht erreichbar -> trotzdem sortieren
            print(source.__name__, "übersprungen:", ex, file=sys.stderr)
            continue
        for t in found:
            if t["id"] not in known and newest_known and t["date"] > newest_known:
                known.add(t["id"])
                so = {"title": t["title"], "spotify": f"https://open.spotify.com/intl-de/track/{t['id']}",
                      "img": f"img/spotify/{t['id']}.jpg", "_id": t["id"], "_order": -1, "_new": True}
                refresh(so)
                songs.append(so)
                print("neu:", so["title"], so.get("date"))

    songs.sort(key=lambda so: (so.get("date") or "", -so["_order"]), reverse=True)
    clean = [{k: v for k, v in so.items() if not k.startswith("_")} for so in songs]

    esc = lambda t: html.escape(t, quote=True)
    shelf = []
    for i, so in enumerate(clean):
        shelf.append(f'''        <button class="vinyl" type="button" data-index="{i}" aria-label="{esc(so['title'])} auswählen">
          <span class="disc">
            <span class="grooves" aria-hidden="true"></span>
            <img src="{so['img']}" alt="Cover: {esc(so['title'])}" width="300" height="300" loading="{'eager' if i < 6 else 'lazy'}">
          </span>
          <span class="vinyl-title">{esc(so['title'])}</span>
        </button>''')
    s = s[:m.start(2)] + json.dumps(clean, ensure_ascii=False) + s[m.end(2):]
    s = re.sub(r'(<div class="shelf" role="listbox" aria-label="Song-Auswahl">\n).*?(\n        </div>\n      </section>)',
               lambda mm: mm.group(1) + "\n".join(shelf) + mm.group(2), s, count=1, flags=re.S)
    f = clean[0]
    s = re.sub(r'<img id="stage-img" src="[^"]*" alt="[^"]*"', f'<img id="stage-img" src="{f["img"]}" alt="Cover: {esc(f["title"])}"', s)
    s = re.sub(r'<div class="now-title" id="now-title">.*?</div>', f'<div class="now-title" id="now-title">{esc(f["title"])}</div>', s)
    s = re.sub(r'<img id="bar-img" src="[^"]*" alt="[^"]*"', f'<img id="bar-img" src="{f["img"]}" alt="Cover: {esc(f["title"])}"', s)
    s = re.sub(r'<div class="ttl" id="bar-title">.*?</div>', f'<div class="ttl" id="bar-title">{esc(f["title"])}</div>', s)
    s = re.sub(r'(<a class="go" id="bar-link" href=")[^"]*"', lambda mm: mm.group(1) + f["spotify"] + '"', s)
    s = re.sub(r'<p class="section-note">\d+ Tracks auf Spotify</p>', f'<p class="section-note">{len(clean)} Tracks auf Spotify</p>', s)
    open(INDEX, "w", encoding="utf8").write(s)
    for i, so in enumerate(clean):
        print(i + 1, so.get("date"), so["title"])


if __name__ == "__main__":
    main()
