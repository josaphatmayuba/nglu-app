# SCRUM-67 - Company Setting Logo Upload

## Problem

The Company Setting logo upload failed on `dev.ongdngolu.org` with:

- `POST /api/setting`
- `413 Request Entity Too Large`
- HTML response from nginx instead of a JSON API error

The browser also showed `404 Not Found` for `/api/files/<logo>.png`, which can happen when the setting points to a logo filename that was not saved or is stale.

## Changes Made

- `nginx/nginx.frontend.conf`
  - Added `client_max_body_size 10m` to both production and development HTTPS server blocks.
  - Added the same limit inside both `/api/` proxy locations.
  - Added JSON `413` responses for prod and dev so the frontend no longer receives an HTML error page for oversized uploads.

- `backend2/src/app-settings/app-settings.controller.ts`
  - Added a 10 MB Multer file-size limit for `POST /setting` and `PUT /setting`.
  - Limited settings upload to one file because this endpoint only handles the company logo.

- `frontend/src/components/settings/addDetails.jsx`
  - Added client-side validation before upload.
  - Allowed image types: PNG, JPG, WebP, SVG.
  - Max logo size: 10 MB.
  - Displays a clear toast error before submitting invalid files.
  - Shows API error messages returned by the update request.

- `frontend/src/utils/functions.js`
  - Improved `errorHandler` so API `message` fields are surfaced, including JSON `413` responses.

## Validation Notes

- Backend typecheck passed with `npm.cmd run typecheck` in `backend2`.
- Frontend global lint still fails because the repo currently lints generated `dist-dev` / `dist-prod` files and has existing unrelated lint errors. This SCRUM-67 change was not the cause.

## Deployment Notes

After deploying, reload nginx so the new `client_max_body_size` applies:

```bash
docker exec nglu_prod_frontend nginx -t
docker exec nglu_prod_frontend nginx -s reload
```

If dev uses the same frontend nginx container/config mount, reload the same container after pulling the new config.

## Follow-Up Check

Test with a valid logo under 10 MB:

1. Open Company Setting.
2. Upload a valid image.
3. Save settings.
4. Confirm `POST /api/setting` returns `200`.
5. Refresh page.
6. Confirm `/api/files/<saved-file>` returns `200` and the logo preview is not broken.
