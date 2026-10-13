# Washing Daddy — washingdaddy.com

The live website. Doorstep pressure car wash in West Delhi.

- `index.html` — the whole site: one self-contained page, no build step.
- `img/` — photos from our own rounds. Number plates are blurred.

## Updating the live site

On the droplet (143.244.130.28):

    cd /root/site && git pull && docker compose -f /root/docker-compose.yml restart caddy

Caddy serves `/root/site` at `/srv`. The restart is only needed if files were
replaced rather than changed in place; a plain `git pull` is usually enough.
