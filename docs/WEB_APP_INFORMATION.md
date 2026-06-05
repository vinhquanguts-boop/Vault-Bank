# Vault Web App Information

## Main Folder

All runnable website files are in:

`C:\Users\Asus\Desktop\Vault_Website_Rebuild\Code`

Run the website from this folder only. The HTML, CSS, JavaScript, assets and local database paths are already connected from here.

## Run The Website

```powershell
cd "C:\Users\Asus\Desktop\Vault_Website_Rebuild\Code"
$env:PORT="4190"
npm start
```

Open:

- Website: `http://localhost:4190`
- App demo: `http://localhost:4190/app.html`
- Admin panel: `http://localhost:4190/admin.html`
- Review without intro: `http://localhost:4190/app.html?skipIntro=1`

Demo login:

- Email: `sarah@vault.au`
- Password: `vault123`

## Folder Structure

```text
Code/
  index.html          Main website landing page
  app.html            Interactive Vault banking app demo
  admin.html          Admin dashboard for demo data
  styles.css          All web and app styling
  app.js              Main app logic and UI actions
  admin.js            Admin dashboard logic
  modals.js           Website modal content and interactions
  animations.js       Website animation helpers
  vault-intro.js      Vault opening intro animation
  server.js           Local Node server and JSON database API
  package.json        npm start command

  assets/             Website logos, card images, fonts and UI assets
  data/               Local JSON database
  IMG/                Future final photos or supplied project images
  docs/               App and website information notes
  logs/               Server log files
```

## Database

Local demo database:

`data/vault-db.json`

The local app uses this database when running on `localhost:4190`.

Main API routes:

- `GET /api/db`
- `GET /api/state/:userId`
- `POST /api/login`
- `POST /api/signup`
- `POST /api/action`
- `POST /api/admin/update`

## Assets

Important assets:

- Main logo: `assets/logo2.png`
- Applied logo: `assets/vault_logo_with_applied_coin.png`
- Card front: `assets/vault_card_front.png`
- Card back: `assets/vault_card_back.png`
- Fonts: `assets/fonts/`

Use `IMG/` for any new photos or supplied visual material that are not yet wired into the website.

## Notes

- Keep `index.html`, `app.html`, `admin.html`, `styles.css`, `server.js` and the main JavaScript files in the root of `Code/`; moving them would break current paths.
- Logs were moved into `logs/` to keep the root folder cleaner.
- Use `docs/` for project notes and handoff information.
