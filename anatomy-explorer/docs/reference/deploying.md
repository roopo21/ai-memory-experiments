# Deploying

The live site is https://vrisha-anatomy.netlify.app, Netlify site id `27c67818-b9d4-4595-b392-1374549d2231`.

There are no automatic builds from GitHub. Every release is a manual upload of a local `dist/` folder. That means production can be ahead of or behind `main`. Check which commit you are deploying, and never assume `main` matches production.

## Safe release

1. Build and check: `npm run check`.
2. Upload a draft, which does not touch production:

   ```bash
   npx netlify-cli deploy --dir dist --no-build --site 27c67818-b9d4-4595-b392-1374549d2231 --json
   ```

   The JSON output includes the draft URL and its `deploy_id`. npm warnings in the output can contain braces, so pick the fields out with `grep` rather than parsing the whole output.

3. Test the draft URL in a browser: the default view, a stretch link and a nerve-glide link.
4. Publish that exact draft:

   ```bash
   npx netlify-cli api restoreSiteDeploy --data '{"site_id":"27c67818-b9d4-4595-b392-1374549d2231","deploy_id":"<draft deploy_id>"}'
   ```

## Rollback

Run the same `restoreSiteDeploy` command with an older deploy id. Past deploy ids are listed in the Netlify dashboard under the site's Deploys page.

## Caching

`netlify.toml` marks hashed bundles, versioned models and the hashed decoder folder as `immutable`. Never overwrite a model file in place without rebuilding: its content hash, and so its URL, must change.
