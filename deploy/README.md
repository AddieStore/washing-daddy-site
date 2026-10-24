# Old / new website switch

Two sites live in this repo:

- **Classic** site: `index.html` at the repo root (untouched).
- **New** site, styled like the customer and washer apps: `new/index.html`.

`/new/` always shows the new site and `/classic` always shows the classic one
(no trailing slash, so its relative image paths keep working). Which one visitors
get at `washingdaddy.com/` is decided by one flag file on the droplet:

    touch /root/site/.use-new     # washingdaddy.com/ shows the NEW site
    rm    /root/site/.use-new     # washingdaddy.com/ shows the CLASSIC site (default)

No git pull, no restart: Caddy checks the file on every request.
`.use-new` is git-ignored, so `git pull` never changes the choice.
`./deploy/switch.sh new|old|status` does the same thing.

## One-time Caddy setup

Add the lines in `Caddyfile.snippet` inside the washingdaddy.com site block in the
Caddyfile, above `file_server`, then reload Caddy once:

    docker compose -f /root/docker-compose.yml restart caddy
