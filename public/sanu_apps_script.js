/**
 * SANÙ — Google Apps Script Webhook
 * ═══════════════════════════════════════════════════════
 * INSTALLATION :
 *  1. Va sur script.google.com → Nouveau projet
 *  2. Colle ce code entier
 *  3. Remplace SHEET_ID par l'ID de ton Google Sheet
 *  4. Déploie → Nouvelle déployment → Web app
 *     - Exécuter en tant que : Moi
 *     - Accès : Tout le monde
 *  5. Copie l'URL de déployment → colle dans ta landing page
 * ═══════════════════════════════════════════════════════
 */

// ── CONFIG ──────────────────────────────────────────────
const SHEET_ID  = "TON_SHEET_ID_ICI";        // ← Remplace
const SHEET_TAB = "Waitlist";                  // Nom de l'onglet
// ────────────────────────────────────────────────────────

function doPost(e) {
  try {
    const data  = JSON.parse(e.postData.contents);
    const phone = (data.phone || "").trim();
    const source = (data.source || "landing").trim();

    if (!phone) {
      return jsonResponse({ ok: false, error: "Numéro manquant" });
    }

    const sheet = getOrCreateSheet();

    // Vérifie doublon
    const existing = sheet.getDataRange().getValues();
    const already  = existing.some(row => row[1] === phone);

    if (already) {
      return jsonResponse({ ok: true, duplicate: true, message: "Déjà inscrit" });
    }

    // Ajoute la ligne
    sheet.appendRow([
      new Date(),                         // A — Date/heure
      phone,                              // B — Numéro WhatsApp
      source,                             // C — Source (hero / cta)
      Utilities.formatDate(
        new Date(), "Africa/Porto-Novo", "dd/MM/yyyy HH:mm"
      ),                                  // D — Date formatée
      "Nouveau"                           // E — Statut
    ]);

    // Met à jour le compteur si colonne G1 existe
    try {
      const countCell = sheet.getRange("G1");
      const current   = parseInt(countCell.getValue()) || 0;
      countCell.setValue(current + 1);
    } catch(e) {}

    return jsonResponse({ ok: true, message: "Inscrit avec succès" });

  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

function doGet(e) {
  // Permet de tester l'URL directement dans le navigateur
  const sheet = getOrCreateSheet();
  const count = Math.max(0, sheet.getLastRow() - 1); // -1 pour l'en-tête
  return jsonResponse({ ok: true, count: count, message: "Sanù Webhook actif ✓" });
}

function getOrCreateSheet() {
  const ss    = SpreadsheetApp.openById(SHEET_ID);
  let   sheet = ss.getSheetByName(SHEET_TAB);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_TAB);
    // En-têtes
    const headers = ["Date ISO", "Numéro WhatsApp", "Source", "Date Lisible", "Statut"];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    // Style en-têtes
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground("#3D7A5A")
      .setFontColor("#FFFFFF")
      .setFontWeight("bold");
    sheet.setFrozenRows(1);
    // Largeurs colonnes
    sheet.setColumnWidth(1, 160);
    sheet.setColumnWidth(2, 200);
    sheet.setColumnWidth(3, 100);
    sheet.setColumnWidth(4, 160);
    sheet.setColumnWidth(5, 100);
  }

  return sheet;
}

function jsonResponse(data) {
  const output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}
