# DNA GENEIE

## Run locally

Requirements: Node.js 20.19+ or 22.12+.

Copy `.env.example` to `.env` and set `ADMIN_PASSWORD`, `SESSION_SECRET`, and
`DATA_ENCRYPTION_KEY` before starting the app for the first time.

```sh
npm install
npm run dev
```

Open the local URL printed by the development server.

## Deploy to GoDaddy cPanel Node.js hosting

This is a full-stack Node.js application. Its website, API, authentication, checkout, and admin features require a Node.js application host; uploading only the `dist` folder to static hosting will not provide those backend features. Use a GoDaddy hosting plan that provides cPanel's **Setup Node.js App** (or equivalent) and Node.js 20.19+ or 22.12+.

1. In cPanel, create a Node.js application with Node.js 20.19+ or 22.12+. Set its application root to a private directory outside `public_html`, and set the startup file to `app.js`.
2. Before uploading, build the deployment files on a computer with Node.js installed:

   ```sh
   npm install
   npm run lint
   npm run build
   ```

3. Upload the project files to the application root. Include `app.js`, the generated `server.mjs`, the generated `dist` directory, and `package.json`. Do not upload `node_modules`, `.env` files, or a local `data/dnageneie.db` database.
4. In the cPanel application environment, set `NODE_ENV=production`, `APP_URL` to the site's HTTPS URL, a unique strong `SESSION_SECRET`, a separate unique strong `DATA_ENCRYPTION_KEY`, and `ADMIN_PASSWORD` before the first launch. Set `OWNER_ADMIN_EMAIL` to the intended admin email. Configure SMTP or Resend variables if transactional email is needed.
5. Use the Node.js application's terminal/environment to install production dependencies in the hosting environment (`npm install --omit=dev`). This is important for the native SQLite dependency; do not copy Windows `node_modules` to the Linux host.
6. Ensure the application can write to its `data` directory. The server creates this directory and initializes a new SQLite database on first launch. Keep the database and application files outside `public_html`, and back up the database securely.
7. Restart the Node.js application from cPanel and open the HTTPS domain to verify the site and API.

`app.js` sets production mode by default and loads the generated server bundle. The server listens on the port assigned by the hosting platform.

If the GoDaddy plan does not provide Node.js application hosting, use a separate Node.js host for this application; static-only hosting cannot run the required API and database.
