## Front End app of SingleERP app .

Webhook test
[...]

## Single-Store-ERP-F — Frontend (SingleERP)

Updated by: Fawjul Azim



Quick start

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Build and preview production:

```bash
npm run build
npm run preview
```

Run tests:

```bash
npm test
```


Consolidated ERP update

08-03-2026 — ERP update (branch change)

Branch
- Old branch: `changeDesign`
- Updated branch: `updateERPCCAzim`

Checks
- SingleERP core flows: product CRUD, purchase/return/payment flows, supplier CRUD, purchase orders, email config, customer CRUD, account & reports, app settings, categories/subcategories, brands/colors/attributes/UoM, import, barcode, discounts, currency, VAT/tax, terms & conditions, product shortlist, employment/shift/department/designation/roles/permissions, staff CRUD, sale return, dashboard.

Problems
- Hard-coded currencySymbol on Dashboard.
- Account profile path and update when image not uploaded.
- Landing/Login design needed improvement.
- Logo delete did not clear backend value.
- Product update page image display/change/delete issues.
- Multiple product rounding (2 decimal) issues across sales/POS flows.
- After a sale submit, next invoice did not auto-set customer/date.
- Purchase rounding & return multi-payment issues; invoiceId missing when making payments; parseInt issues in payments.
- Purchase return product list display problems.
- Product attribute update did not refetch.
- Barcode print/update issues.
- Designation create not triggering refetch.
- Staff view/update/delete and missing fields in staff add.
- Sale rounding conflicts and sale due payment missing invoice id.

Fixes (files changed)
- Dashboard currency symbol made dynamic: `src/components/dashboard/grap/chartDashboard`, `src/components/dashboard/Dashboard`.
- Account profile image upload/update: `src/components/settings/addDetails`.
- Landing/Login design improvements: `src/components/user/Login`, `src/eCommerce/Home/ButtonHome`.
- AppSetting logo removal handling: `src/components/settings/addDetails` (frontend) and `AppSettingController` (backend).
- Product update image fixes: `updateProd` (frontend) and `ProductController` (backend).
- Sales/POS rounding & auto-reset fixes: `payment sidebar`, `pos`, `productsforsale`, `selectedpoductslist` (frontend) and `salesInvoiceController` (backend).
- Purchase rounding & return fixes: `addPurchase.jsx`, `addreturnPurchase` (frontend) and `PurchaseInvoiceController`, `ReturnPurchaseInvoiceController` (backend).
- Payment parseInt and payment submission fixes: `PurchaseInvoicePayment`, `PaymentPurchaseInvoiceController`.
- Purchase return list display: `SinglePurchaseInvoice`, `ReturnPurchaseInvoiceController`.
- Product attribute update refetch: `UpdateAttribute`.
- Barcode print/update: `updatePrintPage`.
- Designation refetch: `addDesignation`.
- Staff add/update fixes: `src/components/staff/addStaff`, `src/components/staff/DetailsStaff`, `src/components/staff/UpdateDetails` (frontend); `UsersController`, `User.php` (backend).
- Sale rounding & return fixes: `AddReturnSale`, `SaleReturnInvoice` (backend).
- Sale due payment invoice id fix: `src/components/sale/SaleInvoicePayment`.
- Sale create/update: `addSale`.

Fixing time (approx): multiple sessions between 04-03-2026 and 08-03-2026

Status: All listed fixes applied ✅

Notes
- This consolidates previous multiple dated entries into a single authoritative ERP update entry for `08-03-2026` as requested.

If you want this committed and pushed to branch `updateERPCCAzim`, tell me and I will create the commit and push it.

Fixes
- Purchase rounding: `addPurchase.jsx` (frontend) and `PurchaseInvoiceController` (backend).
- Purchase return rounding & multi-payment: `addreturnPurchase` and `ReturnPurchaseInvoiceController`.
- Payment parseInt fix: `PurchaseInvoicePayment` and `PaymentPurchaseInvoiceController`.
- Purchase return list display and related fixes: `SinglePurchaseInvoice` and `ReturnPurchaseInvoiceController`.
- Product attribute update: `UpdateAttribute`.
- Barcode print/update: `updatePrintPage`.
- Designation refetch: `addDesignation`.